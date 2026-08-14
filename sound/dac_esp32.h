#ifndef SOUND_ESP32_DAC_H
#define SOUND_ESP32_DAC_H

#include <driver/i2s_std.h>
#include "esp32-hal.h"

bool IRAM_ATTR ls_dac_cb(i2s_chan_handle_t handle, i2s_event_data_t *event, void *user_ctx);

class LS_DAC : CommandParser {
public:
  i2s_chan_handle_t tx_handle_;
  void Setup() {
    if (!needs_setup_) return;
    needs_setup_ = false;

    // Set up for low latency.
    i2s_chan_config_t chan_cfg = {
      .id = I2S_NUM_AUTO,
      .role = I2S_ROLE_MASTER,
      .dma_desc_num = 4,
      .dma_frame_num = 32,
      .auto_clear_after_cb = false,
      .auto_clear_before_cb = false,
      .allow_pd = false,
      .intr_priority = 0,
    };
    
    i2s_new_channel(&chan_cfg, &tx_handle_, NULL);

    i2s_std_config_t std_cfg = {
      .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(44100),
//      .slot_cfg = I2S_STD_MSB_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
//      .slot_cfg = I2S_STD_PCM_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
      .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO),
      .gpio_cfg = {
        .mclk = I2S_GPIO_UNUSED,
        .bclk = (gpio_num_t)bclkPin, // UGLY CAST
        .ws = (gpio_num_t)lrclkPin,
        .dout = (gpio_num_t)txd0Pin,
        .din = I2S_GPIO_UNUSED,
        .invert_flags = {
	  .mclk_inv = false,
	  .bclk_inv = false,
	  .ws_inv = false,
        },
      },
    };
    /* Initialize the channel */
    i2s_channel_init_std_mode(tx_handle_, &std_cfg);

    i2s_event_callbacks_t callbacks = {
      .on_recv = nullptr,
      .on_recv_q_ovf = nullptr,
      .on_sent = ls_dac_cb,
      .on_send_q_ovf = nullptr,
    };

    i2s_channel_register_event_callback(tx_handle_, &callbacks, (void*)this);
  }

  ~LS_DAC() {
    if (!needs_setup_) {
      /* Have to stop the channel before deleting it */
      i2s_channel_disable(tx_handle_);
      /* If the handle is not needed any more, delete it to release the channel resources */
      i2s_del_channel(tx_handle_);
    }
  }

  void begin() {
    if (on_) return;
    on_ = true;
    Setup();
    
#ifdef FILTER_CUTOFF_FREQUENCY
    filter_.clear();
#endif

    pos_ = sizeof(dac_dma_buffer);
    i2s_channel_enable(tx_handle_);
  }

  void end() {
    if (!on_) return;
    on_ = false;
    i2s_channel_disable(tx_handle_);
  }

  bool Parse(const char* cmd, const char* arg) override {
#ifndef DISABLE_DIAGNOSTIC_COMMANDS
    if (!strcmp(cmd, "dacbuf")) {
      STDOUT << "Current position: " << pos_ << "\n";
      for (size_t i = 0; i < NELEM(dac_dma_buffer); i++) {
        STDOUT.print(dac_dma_buffer[i]);
        if ((i & 0xf) == 0xf)
          STDOUT.println("");
        else
          STDOUT.print(" ");
      }
      STDOUT.println("");
      return true;
    }
#endif
    return false;
  }

  bool isSilent() {
     for (size_t i = 0; i < NELEM(dac_dma_buffer); i++)
       if (dac_dma_buffer[i] != dac_dma_buffer[0])
         return false;
     return true;
  }

  // TODO: Replace with enable/disable
  void SetStream(class ProffieOSAudioStream* stream) {
    stream_ = stream;
  }

  // Interrupt handler.
  // Fills the dma buffer with new sample data.
  void isr(void) {
    while (true) {
      if (pos_ < sizeof(dac_dma_buffer)) {
	size_t written = 0;
	i2s_channel_write(tx_handle_,
			  ((char *)dac_dma_buffer) + pos_,
			  sizeof(dac_dma_buffer) - pos_,
			  &written,
			  0);
	pos_ += written;
	if (pos_ < sizeof(dac_dma_buffer)) return;
      }
      int n = 0;
#if defined(FILTER_CUTOFF_FREQUENCY)
      float data[AUDIO_BUFFER_SIZE];
      if (stream_) {
	n = dynamic_mixer.read(data, AUDIO_BUFFER_SIZE);
      }
      while (n < AUDIO_BUFFER_SIZE) data[n++] = 0;
      // Run the filter
      static_assert(AUDIO_BUFFER_SIZE % 4 == 0);
      for (int i = 0; i < AUDIO_BUFFER_SIZE; i+=4) {
	filter_.Run4(data + i);
      }
      for (int i = 0; i < AUDIO_BUFFER_SIZE;i++) {
	uint16_t sample = clamptoi16(data[i] * dynamic_mixer.get_volume());
	dac_dma_buffer[i*2] = sample;
	dac_dma_buffer[i*2+1] = sample;
      }
#else
      int16_t data[AUDIO_BUFFER_SIZE];
      if (stream_) {
	n = dynamic_mixer.read(data, AUDIO_BUFFER_SIZE);
	while (n < AUDIO_BUFFER_SIZE) data[n++] = 0;
	for (int i = 0; i < AUDIO_BUFFER_SIZE;i++) {
	  int16_t sample = data[i];
	  // int16_t sample = i - AUDIO_BUFFER_SIZE/2;
	  dac_dma_buffer[i*2] = sample;
	  dac_dma_buffer[i*2+1] = sample;
	}
      }
#endif
      pos_ = 0;
    }
  }

private:

  size_t pos_;
  hw_timer_t *timer_;
  bool on_ = false;
  bool needs_setup_ = true;
  int16_t dac_dma_buffer[AUDIO_BUFFER_SIZE * 2 /* stereo */ ];
  
  static ProffieOSAudioStream * volatile stream_;
#ifdef FILTER_CUTOFF_FREQUENCY
  static Filter::Biquad<
    Filter::Bilinear<
    Filter::BLT<
      Filter::ConvertToHighPass<
	Filter::ButterWorthProtoType<FILTER_ORDER>, FILTER_CUTOFF_FREQUENCY, AUDIO_RATE>>>> filter_;
#endif  
};

ProffieOSAudioStream * volatile LS_DAC::stream_ = nullptr;
LS_DAC dac;

#ifdef FILTER_CUTOFF_FREQUENCY
Filter::Biquad<
  Filter::Bilinear<
  Filter::BLT<
    Filter::ConvertToHighPass<
      Filter::ButterWorthProtoType<FILTER_ORDER>, FILTER_CUTOFF_FREQUENCY, AUDIO_RATE>>>> LS_DAC::filter_;
#endif  

POAtomic<bool> in_ls_dac_cb(false);

bool IRAM_ATTR ls_dac_cb(i2s_chan_handle_t handle, i2s_event_data_t *event, void *user_ctx) {
  if (!in_ls_dac_cb.exchange(true)) {
    ScopedCycleCounter cc(audio_dma_interrupt_cycles);
    ((LS_DAC*)user_ctx)->isr();
    in_ls_dac_cb.set(false);
  }
  return false;
}


#endif  // SOUND_ESP32_DAC_H
