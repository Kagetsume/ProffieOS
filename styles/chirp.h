#ifndef STYLES_CHIRP_H
#define STYLES_CHIRP_H

// Composable texture: sine wave with spatial frequency sweep along the blade (multiply mask).
// One scrolling chirp: wavelength shrinks or grows toward the tip via chirp_rate.
// Args: period_base speed min max chirp_rate
//   period_base — wavelength at the hilt (default 2400). 0 = passthrough (×65535).
//   speed — scroll phase (sign sets direction; default -2000).
//   min, max — grayscale at trough/peak (0–65535).
//   chirp_rate — how fast local period changes per LED index (default 64; 0 = uniform sine).

#include "../common/math.h"
#include "../common/sin_table.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace chirp_detail {

inline int SinAtPhaseInterpolated(int phase, int wavelength) {
  if (wavelength <= 0) wavelength = 1;
  int64_t p = phase;
  while (p < 0) p += wavelength;
  while (p >= wavelength) p -= wavelength;
  int64_t fp = (p << 20) / wavelength;
  int idx = (int)((fp >> 10) & 1023);
  int frac = (int)(fp & 1023);
  int s0 = sin_table[idx];
  int s1 = sin_table[(idx + 1) & 1023];
  return s0 + (int)((int64_t)(s1 - s0) * frac >> 10);
}

inline int LocalPeriod(int period_base, int led, int chirp_rate) {
  int64_t p = period_base + ((int64_t)led * chirp_rate >> 8);
  if (p < 64) p = 64;
  if (p > 65535) p = 65535;
  return (int)p;
}

}  // namespace chirp_detail

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class CHIRP>
class ChirpX {
public:
  void run(BladeBase* base) {
    period_.run(base);
    speed_.run(base);
    min_.run(base);
    max_.run(base);
    chirp_.run(base);
    period_run_ = period_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    chirp_run_ = chirp_.calculate(base);

    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;

    if (period_run_ <= 0) return;

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
      int local_period = chirp_detail::LocalPeriod(period_run_, led, chirp_run_);
      uint32_t mult_led = (50000u * 1024u / (unsigned)local_period);
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_led) >> 10);
      int sin = chirp_detail::SinAtPhaseInterpolated(p, local_period);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)(sin + 32768) * (max_run_ - min_run_) >> 16),
          0,
          65535);
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
  PONUA SVFWrapper<CHIRP> chirp_;
  int period_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int chirp_run_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
