#ifndef STYLES_PULSE_TRAIN_H
#define STYLES_PULSE_TRAIN_H

// Composable texture: rolling hard on/off bands (square wave), grayscale multiply mask.
// Args: period speed min max duty
//   period — band repeat length along blade (default 2400). 0 = passthrough (×65535).
//   speed — scroll like stripes (default -2000).
//   min, max — mask when off / on (0–65535).
//   duty — lit fraction 0–32768 (32768 = always max; 16384 ≈ 50% on).

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace pulse_train_detail {

inline bool SquareHigh(int phase, int wavelength, int duty) {
  if (wavelength <= 0) wavelength = 1;
  int64_t p = phase;
  while (p < 0) p += wavelength;
  while (p >= wavelength) p -= wavelength;
  if (duty <= 0) return false;
  if (duty >= 32768) return true;
  int threshold = (int)((int64_t)wavelength * duty / 32768);
  if (threshold <= 0) return false;
  if (threshold >= wavelength) return true;
  return (int)p < threshold;
}

}  // namespace pulse_train_detail

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class DUTY>
class PulseTrainX {
public:
  void run(BladeBase* base) {
    period_.run(base);
    speed_.run(base);
    min_.run(base);
    max_.run(base);
    duty_.run(base);
    period_run_ = period_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    duty_run_ = duty_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;
    if (duty_run_ < 0) duty_run_ = 0;
    if (duty_run_ > 32768) duty_run_ = 32768;

    if (period_run_ <= 0) return;

    if (period_run_ != last_period_) {
      last_period_ = period_run_;
      mult_ = (50000u * 1024u / (unsigned)period_run_);
    }

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;
    int speed = speed_.calculate(base);
    int32_t wrap = (int32_t)period_run_ * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed / 333, wrap);
  }

  SimpleColor getColor(int led) {
    uint32_t f = 65535;
    if (period_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      bool on = pulse_train_detail::SquareHigh(p, period_run_, duty_run_);
      f = on ? (uint32_t)max_run_ : (uint32_t)min_run_;
    }
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  PONUA SVFWrapper<PERIOD> period_;
  PONUA SVFWrapper<SPEED> speed_;
  PONUA SVFWrapper<MIN_B> min_;
  PONUA SVFWrapper<MAX_B> max_;
  PONUA SVFWrapper<DUTY> duty_;
  int period_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int duty_run_ = 16384;
  int last_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
