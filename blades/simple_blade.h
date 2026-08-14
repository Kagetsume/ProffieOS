#ifndef BLADES_SIMPLE_BLADE_H
#define BLADES_SIMPLE_BLADE_H

#include "abstract_blade.h"

// Pin polarity for SimpleBlade PWM outputs.
// active_high=true:  full brightness drives the pin HIGH (direct GPIO -> LED -> GND).
// active_high=false: inverted PWM (typical for bladePowerPin FET outputs).
template<int PIN, bool ACTIVE_HIGH = false>
struct SimplePin {
  static constexpr int pin = PIN;
  static constexpr bool active_high = ACTIVE_HIGH;
};

template<int PIN>
using ActiveHighPIN = SimplePin<PIN, true>;

template<int PIN>
using ActiveLowPIN = SimplePin<PIN, false>;

#include "pwm_pin.h"

template<typename PinT, class LED>
class PWMPin : public PWMPinInterface {
public:
  static constexpr int PIN = PinT::pin;
  static constexpr bool ACTIVE_HIGH = PinT::active_high;

  void Activate() override {
    static_assert(PIN >= 0, "PIN is negative?");
    static_assert(IsPWMPin(PIN), "Not a PWM-capable pin.");
    LSanalogWriteSetup(PIN);
    LSanalogWrite(PIN, ApplySimplePWMPolarity(0, ACTIVE_HIGH));
  }
  void Deactivate() override {
    LSanalogWriteTeardown(PIN);
  }
  void set(const Color16& c) override {
    LSanalogWrite(PIN, ApplySimplePWMPolarity(led_.PWM(c), ACTIVE_HIGH));
  }
  void set_overdrive(const Color16& c) override {
    LSanalogWrite(PIN, ApplySimplePWMPolarity(led_.PWM_overdrive(c), ACTIVE_HIGH));
  }

  Color8 getColor8() const { return led_.getColor8(); }

  PONUA DriveLogic<LED> led_;
};

template<typename PinT, class LED>
class ServoPWMPin : public PWMPin<PinT, LED> {
public:
  void Activate() override {
    static_assert(PinT::pin >= 0, "PIN is negative?");
    static_assert(IsPWMPin(PinT::pin), "Not a PWM-capable pin.");
    LSanalogWriteSetup(PinT::pin, PWM_USECASE::SERVO);
    LSanalogWrite(PinT::pin, ApplySimplePWMPolarity(0, PinT::active_high));
  }
};

template<class LED>
class PWMPin<SimplePin<-1, false>, LED> : public PWMPinInterface {
public:
  void Activate() override {}
  void Deactivate() override {}
  void set(const Color16& c) override {}
  void set_overdrive(const Color16& c) override {}
};

template<class LED>
class PWMPin<SimplePin<-1, true>, LED> : public PWMPinInterface {
public:
  void Activate() override {}
  void Deactivate() override {}
  void set(const Color16& c) override {}
  void set_overdrive(const Color16& c) override {}
};

template<typename PinT>
class PWMPin<PinT, NoLED> : public PWMPinInterface {
public:
  void Activate() override {}
  void Deactivate() override {}
  void set(const Color16& c) override {}
  void set_overdrive(const Color16& c) override {}
  Color8 getColor8() const { return Color8(0,0,0); }
};

template<>
class PWMPin<SimplePin<-1, false>, NoLED> : public PWMPinInterface {
public:
  void Activate() override {}
  void Deactivate() override {}
  void set(const Color16& c) override {}
  void set_overdrive(const Color16& c) override {}
  Color8 getColor8() const { return Color8(0,0,0); }
};
template<class ... LEDS>
class MultiChannelLED {};

template<>
class MultiChannelLED<> : public PWMPinInterface {
public:
  void Activate() override {}
  void Deactivate() override {}
  void set(const Color16& c) override {}
  void set_overdrive(const Color16& c) override {}
  Color8 getColor8() const { return Color8(0,0,0); }
};

template<class LED, class... LEDS>
class MultiChannelLED<LED, LEDS...> : public PWMPinInterface {
public:
  void Activate() override {
    led_.Activate();
    rest_.Activate();
  }
  void Deactivate() override {
    led_.Deactivate();
    rest_.Deactivate();
  }
  void set(const Color16& c) override {
    led_.set(c);
    rest_.set(c);
  }
  void set_overdrive(const Color16& c) override {
    led_.set_overdrive(c);
    rest_.set_overdrive(c);
  }
  Color8 getColor8() const {
    return led_.getColor8() | rest_.getColor8();
  }
private:
  LED led_;
  MultiChannelLED<LEDS...> rest_;
};

template<class... LEDS>
class LEDArrayHelper {};

template<>
class LEDArrayHelper<> {
public:
  static const size_t size = 0;
  void InitArray(PWMPinInterface** pos) {}
  void Activate() {}
  void Deactivate() {}
};

template<class LED, class... LEDS>
class LEDArrayHelper<LED, LEDS...> {
public:
  static const size_t size = LEDArrayHelper<LEDS...>::size + 1;
  void InitArray(PWMPinInterface** pos) {
    *pos = &led_;
    rest_.InitArray(pos + 1);
  }
  void Activate() {
    led_.Activate();
    rest_.Activate();
  }
  void Deactivate() {
    led_.Deactivate();
    rest_.Deactivate();
  }
  Color8 getColor8() const {
    return led_.getColor8();
  }
private:
  LED led_;
  LEDArrayHelper<LEDS...> rest_;
};


// Simple blade, LED string or LED star with optional flash on clash.
// Note that this class does nothing when first constructed. It only starts
// interacting with pins and timers after Activate() is called.
template<class ... LEDS>
class Simple_Blade : public AbstractBlade, CommandParser, Looper {
public:
  Simple_Blade() :
    AbstractBlade(),
    CommandParser(NOLINK),
    Looper(NOLINK) {
    led_structs_.InitArray(leds_);
  }
  const char* name() override { return "Simple_Blade"; }

  void Activate(int blade_number) override {
    STDOUT.println("Simple Blade");
    Power(true);
    CommandParser::Link();
    Looper::Link();
    AbstractBlade::Activate(blade_number);
  }

  void Deactivate() override {
    Power(false);
    AbstractBlade::Deactivate();
    Looper::Unlink();
    CommandParser::Unlink();
  }

  void Power(bool on) {
    if (power_ != on) {
      if (on) {
	led_structs_.Activate();
      } else {
	led_structs_.Deactivate();
      }
      power_ = on;
    }
  }

  // BladeBase implementation
  int num_leds() const override {
    return LEDArrayHelper<LEDS...>::size;
  }
  Color8::Byteorder get_byteorder() const override {
    Color8 color = led_structs_.getColor8();
    if (color.r && color.g && color.b) {
      return Color8::RGB;
    }
    return Color8::NONE;
  }
  bool is_powered() const override {
    return power_;
  }
  void set(int led, Color16 c) override {
    leds_[led]->set(c);
  }

  void set_overdrive(int led, Color16 c) override {
    leds_[led]->set_overdrive(c);
  }

  void allow_disable() override {
    if (!on_) Power(false);
  }
  virtual void SetStyle(BladeStyle* style) {
    Power(true);
    AbstractBlade::SetStyle(style);
  }

  // SaberBase implementation
  void SB_IsOn(bool *on) override {
    if (on_ || power_) *on = true;
  }
  void SB_On2(EffectLocation location) override {
    AbstractBlade::SB_On2(location);
    battery_monitor.SetLoad(true);
    on_ = true;
    Power(true);
  }
  void SB_Effect2(BladeEffectType type, EffectLocation location) override {
    AbstractBlade::SB_Effect2(type, location);
    battery_monitor.SetLoad(true);
    Power(true);
  }
  void SB_Off2(OffType off_type, EffectLocation location) override {
    AbstractBlade::SB_Off2(off_type, location);
    battery_monitor.SetLoad(false);
    on_ = false;
    if (off_type == OFF_IDLE) {
      Power(false);
    }
  }

  bool Parse(const char* cmd, const char* arg) override {
    if (!strcmp(cmd, "blade")) {
      if (!strcmp(arg, "on")) {
        SB_On2(0.0f);
        return true;
      }
      if (!strcmp(arg, "off")) {
        SB_Off2(OFF_NORMAL, 0.0f);
        return true;
      }
#ifdef ENABLE_DEVELOPER_COMMANDS      
      if (!strcmp(arg, "state")) {
	STDOUT << "SimpleBlade: on = "<< on_ << ". power = " << power_ << "\n";
      }
#endif      
    }
    return false;
  }

protected:
  void Loop() override {
    if (!power_) return;
    // Make sure the booster is running so we don't get low voltage
    // and under-drive any FETs.
    EnableBooster();
#ifdef ARDUINO_ARCH_STM32L4
    // changing the clock speed messes with the PWM clock.
    extern void ClockControl_AvoidSleep();
    ClockControl_AvoidSleep();
#endif    
    if (current_style_)
      current_style_->run(this);
  }

private:
  PWMPinInterface* leds_[LEDArrayHelper<LEDS...>::size];
  LEDArrayHelper<LEDS...> led_structs_;

  bool on_ = false;
  bool power_ = false;
};

template<class LED1, class LED2, class LED3, class LED4,
         typename P1, typename P2, typename P3, typename P4>
class BladeBase *SimpleBladePtr() {
  static Simple_Blade<
    MultiChannelLED<
      PWMPin<P1, LED1>,
      PWMPin<P2, LED2>,
      PWMPin<P3, LED3>,
      PWMPin<P4, LED4>
    >
  > blade;
  return &blade;
}

// Backward compatible int-pin overload (direct PWM, same as pre-ActiveHighPIN behavior).
template<class LED1, class LED2, class LED3, class LED4,
         int pin1 = bladePowerPin1,
         int pin2 = bladePowerPin2,
         int pin3 = bladePowerPin3,
         int pin4 = bladePin>
class BladeBase *SimpleBladePtr() {
  return SimpleBladePtr<LED1, LED2, LED3, LED4,
    SimplePin<pin1, true>, SimplePin<pin2, true>,
    SimplePin<pin3, true>, SimplePin<pin4, true> >();
}

#if VERSION_MAJOR >= 2
// Possibly one LED driver per channel...
template<class LED, int CLASH_PIN = -1, class CLASH_LED = NoLED>
class BladeBase *StringBladePtr() {
  static Simple_Blade<
    MultiChannelLED<PWMPin<SimplePin<bladePowerPin1, false>, LED>,
                    PWMPin<SimplePin<CLASH_PIN, false>, CLASH_LED> >,
    PWMPin<SimplePin<bladePowerPin2, false>, LED>,
    PWMPin<SimplePin<bladePowerPin3, false>, LED>,
    PWMPin<SimplePin<bladePowerPin4, false>, LED>,
    PWMPin<SimplePin<bladePowerPin5, false>, LED>,
    PWMPin<SimplePin<bladePowerPin6, false>, LED>
  > blade;
  return &blade;
}
#endif

template<typename PinT, class LED = ServoSelector>
class BladeBase *ServoBladePtr() {
  static Simple_Blade< ServoPWMPin<PinT, LED>  > blade;
  return &blade;
}

// Backward compatible ServoBladePtr(int pin).
template<int pin, class LED = ServoSelector>
class BladeBase *ServoBladePtr() {
  return ServoBladePtr<SimplePin<pin, false>, LED>();
}

#endif
