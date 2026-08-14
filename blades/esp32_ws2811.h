#include "driver/rmt_tx.h"

 // 80 MHz tick resolution, i.e., 1 tick = 0.0125 us (this is the max AFAIK)
#define PO_RMT_RESOLUTION 80000000

class RMTClient : public WS2811PIN {
public:
  virtual void rmt_run() = 0;
  virtual void rmt_done() = 0;
  virtual size_t rmt_read(rmt_symbol_word_t *dest, size_t wanted_num) = 0;
  virtual bool rmt_eof() = 0;
  RMTClient* next_rmt_client = nullptr;
};

size_t IRAM_ATTR rmt_encode_callback(const void *data, size_t data_size,
				     size_t symbols_written, size_t symbols_free,
				     rmt_symbol_word_t *symbols, bool *done, void *arg) {
  ScopedCycleCounter cc(pixel_dma_interrupt_cycles);

  // Note, we use "data" instead of "arg" so we don't have to rebuild the encoder.
  RMTClient* client = (RMTClient*)data;
  size_t ret = client->rmt_read(symbols, symbols_free);
  if (client->rmt_eof()) *done = true;
  return ret;
}

class RMTSender {
public:
  
  bool busy() { return !!client_.get(); }

  void done_cb() {
    // gpio_set_direction((gpio_num_t)pin_, GPIO_MODE_OUTPUT);
    RMTClient* client = client_.get();
    digitalWrite(client->pin(), 0);
    pinMode(client->pin(), OUTPUT);
    client_.set(nullptr);
    rmt_disable(tx_chan_);
    client->rmt_done();
  }
  
  static bool done_cb_static(rmt_channel_handle_t tx_chan,
			     const rmt_tx_done_event_data_t *edata,
			     void *user_ctx) {
    RMTSender* sender = (RMTSender*)user_ctx;
    sender->done_cb();
    return false;
  }

  bool set_client(RMTClient *client) {
    if (busy()) return false;
    if (tx_chan_ == nullptr) {
      STDERR << "MAKE CHANNEL\n";
      rmt_tx_channel_config_t tx_chan_config = {
	.gpio_num = (gpio_num_t)client->pin(),  // GPIO number (UGLY CAST)
	.clk_src = RMT_CLK_SRC_DEFAULT,   // select source clock
	.resolution_hz = PO_RMT_RESOLUTION,
	.mem_block_symbols = 512,        // memory block size, 512 * 4 = 2048 Bytes (1.5k interrupts / s)
	.trans_queue_depth = 4,           // set the number of transactions that can pend in the background
	.intr_priority = 0,
	.flags = {
	  .invert_out = false,        // do not invert output signal
	  .with_dma = true,           // do need DMA backend
	  .io_loop_back = false,
	  .io_od_mode = false,
	  .allow_pd = false,
	  .init_level = 0,
	}
      };
      if (rmt_new_tx_channel(&tx_chan_config, &tx_chan_) != ESP_OK) {
	STDERR << "Failed to create TX channel.\n";
	delay(10000);
	return false;
      }

      rmt_tx_event_callbacks_t callbacks = {
	.on_trans_done = RMTSender::done_cb_static,
      };
      if (rmt_tx_register_event_callbacks(tx_chan_, &callbacks, this) != ESP_OK) {
	STDERR << "Failed register RMT callbacks.\n";
	delay(10000);
	return false;
      }

      rmt_simple_encoder_config_t simple_encoder_config = {
	.callback = rmt_encode_callback,
	.arg = nullptr,
	.min_chunk_size = 64,
      };

      if (rmt_new_simple_encoder(&simple_encoder_config, &simple_encoder_) != ESP_OK) {
	STDERR << "Failed to make new encoder.\n";
	rmt_del_channel(tx_chan_);
	tx_chan_ = nullptr;
	delay(10000);
	return false;
      }
    } else {
      rmt_tx_switch_gpio(tx_chan_, (gpio_num_t)client->pin(), false);
    }

    if (rmt_enable(tx_chan_) != ESP_OK) {
      STDERR << "Failed to enable RMT channel.\n";
      return false;
    }
    client->rmt_run();

    rmt_transmit_config_t tx_config = {
      .loop_count = 0,
      .flags = {
	.eot_level = 0,
	.queue_nonblocking = 1,
      }
    };
    if (rmt_transmit(tx_chan_,
		     simple_encoder_,
		     client, 1000,  // writing one client
		     &tx_config) != ESP_OK) {
      STDERR << "Transmit failed.\n";
	delay(10000);
      return false;
    }

    client_.set(client);
    return true;
  }

  ~RMTSender() {
    if (tx_chan_ != nullptr) {
      rmt_disable(tx_chan_);
      rmt_del_channel(tx_chan_);
      tx_chan_ = nullptr;
    }
    if (simple_encoder_ != nullptr) {
      rmt_del_encoder(simple_encoder_);
      simple_encoder_ = nullptr;
    }
  }
  
private:
  POAtomic<RMTClient*> client_ = nullptr;
  rmt_channel_handle_t tx_chan_ = nullptr;
  rmt_encoder_handle_t simple_encoder_ = nullptr;
};

class RMTManager : public Looper {
public:
  const char* name() override { return "RMTManager"; }
  void Loop() override { run(); }
  void queue(RMTClient* client) {
      
    client->next_rmt_client = nullptr;
    if (!pending_clients_) {
      last_pending_client_ = pending_clients_ = client;
    } else {
      PROFFIEOS_ASSERT(pending_clients_ != client);
      PROFFIEOS_ASSERT(last_pending_client_ != client);
      last_pending_client_->next_rmt_client = client;
      last_pending_client_ = client;
    }
    run();
  }
  void run() {
    RMTClient* client = pending_clients_;
    if (!client) return;

    for (size_t i = 0; i < NELEM(rmt_senders); i++) {
      if (rmt_senders[i].set_client(client)) {
	pending_clients_ = client->next_rmt_client;
	client->next_rmt_client = nullptr;
	client = pending_clients_;
	if (!client) {
	  last_pending_client_ = nullptr;
	}
	break;
      }
    }
  }
private:
  RMTSender rmt_senders[4];
  RMTClient* pending_clients_ = nullptr;
  RMTClient* last_pending_client_ = nullptr;
};

RMTManager rmt_manager;


template<Color8::Byteorder BYTEORDER>
class RMTPinBase : public RMTClient {
public:
  RMTPinBase(int LEDS, int PIN, int frequency, int reset_us, int t0h, int t1h) :
    num_leds_(LEDS),
    pin_(PIN),
    frequency_(frequency),
    reset_us_(reset_us),
    t1h_(t1h),
    t0h_(t0h) {
    colors_ = (Color16*)malloc(sizeof(Color16) * LEDS);
    if (!colors_) return;

    int ticks_per_loop = PO_RMT_RESOLUTION / frequency_;
    bit0.level0 = 1;
    bit0.duration0 = t0h_ * ticks_per_loop / 1250;  // 1250 nanos = 800Hz
    bit0.level1 = 0;
    bit0.duration1 = ticks_per_loop - t0h_ * ticks_per_loop / 1250;
    
    bit1.level0 = 1;
    bit1.duration0 = t1h_ * ticks_per_loop / 1250;
    bit1.level1 = 0;
    bit1.duration1 = ticks_per_loop - t1h_ * ticks_per_loop / 1250;

    uint32_t reset_ticks = reset_us_ / 1000000.0 * PO_RMT_RESOLUTION / 2;
    reset_code_.level0 = 0;
    reset_code_.duration0 = reset_ticks;
    reset_code_.level1 = 0;
    reset_code_.duration1 = reset_ticks;
  }

  ~RMTPinBase() {
    free(colors_);
  }
  
  void rmt_run() override {
    state_machine_.reset_state_machine();
  }

  void rmt_done() override {
    done_ = true;
  }

  bool IsReadyForBeginFrame() override { return true; }
  Color16* BeginFrame() override {
    frame_num_++;
    return colors_;
  }
  bool IsReadyForEndFrame() override { return done_; }
  void WaitUntilReadyForEndFrame() override {
#if 0
    uint32_t start = millis();
    while (!IsReadyForEndFrame()) {
      if (millis() - start > 20000) {
	STDERR << "**WS2811 stuck for 200 ms**\n";
	break;
      }
      rmt_manager.run();
    }
#else
    while (!IsReadyForEndFrame()) rmt_manager.run();
#endif    
  }
  void EndFrame() override {
    WaitUntilReadyForEndFrame();
    done_ = false;
    rmt_manager.queue(this);
  }

  bool rmt_eof() override {
    return state_machine_.done();
  }

  size_t rmt_read(rmt_symbol_word_t *dest, size_t wanted_num) override {
    dest_ = dest;
    dest_end_ = dest + wanted_num;
    Fill();
    return dest_ - dest;
  }

#define RMT_ADAPTER_PUSH(X) do {		\
    if (dest_ == dest_end_) YIELD();		\
    *(dest_++) = (X);				\
  } while(0)

  void Fill() {
    STATE_MACHINE_BEGIN();
    for (led = 0; led < num_leds_; led++) {
      color_ = colors_[led].dither(frame_num_, led);
      for (b = Color8::num_bytes(BYTEORDER) - 1; b >= 0; b--) {
	while (dest_end_ - dest_ < 8) YIELD();
	uint8_t byte = color_.getByte(BYTEORDER, b);
	*(dest_++) = (byte & 0x80) ? bit1 : bit0;
	*(dest_++) = (byte & 0x40) ? bit1 : bit0;
	*(dest_++) = (byte & 0x20) ? bit1 : bit0;
	*(dest_++) = (byte & 0x10) ? bit1 : bit0;
	*(dest_++) = (byte & 0x08) ? bit1 : bit0;
	*(dest_++) = (byte & 0x04) ? bit1 : bit0;
	*(dest_++) = (byte & 0x02) ? bit1 : bit0;
	*(dest_++) = (byte & 0x01) ? bit1 : bit0;
      }
    }
    RMT_ADAPTER_PUSH(reset_code_);
    STATE_MACHINE_END();
  }

  int pin() const override { return pin_; }
  int num_leds() const override { return num_leds_; }
  Color8::Byteorder get_byteorder() const override { return BYTEORDER; }
  void Enable(bool on) override {
    pinMode(pin_, on ? OUTPUT : INPUT_ANALOG);
  }

  Color8 color_;
  int led, b;

  rmt_symbol_word_t bit0, bit1, reset_code_;
  rmt_symbol_word_t *dest_, *dest_end_;
    
  volatile bool done_ = true;
  int frame_num_ = 0;
  Color16* colors_;
  int num_leds_;
  int pin_;
  int frequency_;
  int reset_us_;
  int t1h_;
  int t0h_;
  StateMachineState state_machine_;
};

template<int LEDS, int PIN, Color8::Byteorder BYTEORDER, int frequency=800000, int reset_us=300, int t0h=294, int t1h=892>
class RMTWSPin : public RMTPinBase<BYTEORDER> {
public:  
  RMTWSPin() : RMTPinBase<BYTEORDER>(LEDS, PIN, frequency, reset_us, t0h, t1h) {}
};

