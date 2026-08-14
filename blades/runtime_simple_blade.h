#ifndef BLADES_RUNTIME_SIMPLE_BLADE_H
#define BLADES_RUNTIME_SIMPLE_BLADE_H

#include "abstract_blade.h"
#include "pwm_pin.h"
#include "../common/blade_config_led_types.h"

class RuntimePWMPin : public PWMPinInterface {
public:
  void Init(int pin, LEDInterface* led, Color8 color8, bool active_high = true) {
    pin_ = pin;
    led_ = led;
    color8_ = color8;
    active_high_ = active_high;
  }
  bool active() const { return pin_ >= 0 && led_; }

  void Activate() override {
    if (!active()) return;
    LSanalogWriteSetup(pin_);
    LSanalogWrite(pin_, ApplySimplePWMPolarity(0, active_high_));
  }
  void Deactivate() override {
    if (pin_ < 0) return;
    LSanalogWriteTeardown(pin_);
  }
  void set(const Color16& c) override {
    if (!active()) return;
    LSanalogWrite(pin_, ApplySimplePWMPolarity(led_->PWM(c), active_high_));
  }
  void set_overdrive(const Color16& c) override {
    if (!active()) return;
    LSanalogWrite(pin_, ApplySimplePWMPolarity(led_->PWM_overdrive(c), active_high_));
  }
  Color8 getColor8() const { return color8_; }

private:
  int pin_ = -1;
  LEDInterface* led_ = nullptr;
  Color8 color8_;
  bool active_high_ = true;
};

class RuntimeMultiChannelPWM : public PWMPinInterface {
public:
  void Configure(RuntimePWMPin* pins, int count) {
    pins_ = pins;
    count_ = count;
  }
  void Activate() override {
    for (int i = 0; i < count_; i++) pins_[i].Activate();
  }
  void Deactivate() override {
    for (int i = 0; i < count_; i++) pins_[i].Deactivate();
  }
  void set(const Color16& c) override {
    for (int i = 0; i < count_; i++) pins_[i].set(c);
  }
  void set_overdrive(const Color16& c) override {
    for (int i = 0; i < count_; i++) pins_[i].set_overdrive(c);
  }
  Color8 getColor8() const {
    Color8 ret(0, 0, 0);
    for (int i = 0; i < count_; i++) ret = ret | pins_[i].getColor8();
    return ret;
  }

private:
  RuntimePWMPin* pins_ = nullptr;
  int count_ = 0;
};

// Runtime Simple_Blade (PWM LED star or single accent LED) from config/blades.ini.
class RuntimeSimple_Blade : public AbstractBlade, CommandParser, Looper {
public:
  RuntimeSimple_Blade() :
    AbstractBlade(),
    CommandParser(NOLINK),
    Looper(NOLINK) {}

  bool Configure(const int pins[4], const uint8_t leds[4], const bool active_high[4]) {
    channel_count_ = 0;
    for (int i = 0; i < 4; i++) {
      if (pins[i] < 0) continue;
      SDBladeLEDType led_type = (SDBladeLEDType)leds[i];
      if (led_type == SD_BLADE_LED_UNKNOWN || led_type == SD_BLADE_LED_NOLED) continue;
      LEDInterface* led = GetSDBladeLEDInterface(led_type);
      if (!led) continue;
      channels_[channel_count_].Init(pins[i], led, GetSDBladeLEDColor8(led_type), active_high[i]);
      channel_count_++;
    }
    if (channel_count_ == 0) return false;
    multi_.Configure(channels_, channel_count_);
    return true;
  }

  const char* name() override { return "RuntimeSimple_Blade"; }

  void Activate(int blade_number) override {
    STDOUT.println("Simple Blade (SD config)");
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
        multi_.Activate();
      } else {
        multi_.Deactivate();
      }
      power_ = on;
    }
  }

  int num_leds() const override { return channel_count_ > 0 ? 1 : 0; }
  Color8::Byteorder get_byteorder() const override {
    Color8 color = multi_.getColor8();
    if (color.r && color.g && color.b) return Color8::RGB;
    return Color8::NONE;
  }
  bool is_powered() const override { return power_; }
  void set(int led, Color16 c) override { multi_.set(c); }
  void set_overdrive(int led, Color16 c) override { multi_.set_overdrive(c); }
  void allow_disable() override { if (!on_) Power(false); }
  virtual void SetStyle(BladeStyle* style) {
    Power(true);
    AbstractBlade::SetStyle(style);
  }

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
    if (off_type == OFF_IDLE) Power(false);
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
    }
    return false;
  }

protected:
  void Loop() override {
    if (!power_) return;
    EnableBooster();
#ifdef ARDUINO_ARCH_STM32L4
    extern void ClockControl_AvoidSleep();
    ClockControl_AvoidSleep();
#endif
    if (current_style_) current_style_->run(this);
  }

private:
  RuntimePWMPin channels_[4];
  RuntimeMultiChannelPWM multi_;
  int channel_count_ = 0;
  bool on_ = false;
  bool power_ = false;
};

#endif  // BLADES_RUNTIME_SIMPLE_BLADE_H
