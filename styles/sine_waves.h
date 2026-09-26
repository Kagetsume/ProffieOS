#ifndef STYLES_SINE_WAVES_H
#define STYLES_SINE_WAVES_H

// Composable texture: up to four sine brightness waves along the blade (multiply mask).
// Stack: layer = multiply opacity 24000 sine_waves 2400 0 0 65535 -2000
//        layer = multiply opacity 20000 sine_waves 2000 0 8192 65535 -1500 3200 256 0 65535 1500
//
// Args (five per wave, up to four waves; optional strength last):
//   period phase min max speed  [period2 phase2 min2 max2 speed2] ...  [strength]
//
//   period — wavelength along blade (like stripe width; start ~2000–3000). 0 = slot disabled (×1.0).
//   phase — spatial phase offset (same units as stripe scroll position; default 0).
//   min, max — grayscale mask at trough/peak (0–65535; default 0 and 65535). Multiply: black darkens, white neutral.
//   speed — scroll like stripes (negative = toward tip, default -2000 on wave 1 only).
//   strength — optional layer-wide mix toward white/neutral 65535 (default 65535 = full effect).
//
// Disabled slots (period 0, default for waves 2–4) contribute factor 65535. Active waves multiply factors.

#include "../common/math.h"
#include "../common/sin_table.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace sine_waves_detail {

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

inline uint32_t ApplyStrength(uint32_t factor, int strength) {
  if (strength >= 65535) return factor;
  if (strength <= 0) return 65535;
  return 65535 - (uint32_t)((65535 - factor) * (uint32_t)strength / 65535);
}

template<class PERIOD, class PHASE, class MIN_B, class MAX_B, class SPEED>
class SineWaveSlot {
public:
  void run(BladeBase* base) {
    period_.run(base);
    phase_.run(base);
    min_.run(base);
    max_.run(base);
    speed_.run(base);
    period_run_ = period_.calculate(base);
    phase_run_ = phase_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
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

    if (period_run_ != last_period_) {
      last_period_ = period_run_;
      mult_ = (50000u * 1024u / (unsigned)period_run_);
    }
  }

  uint32_t factorAt(int led) const {
    if (period_run_ <= 0) return 65535;

    int p = (int)(((int64_t)m_ + (int64_t)phase_run_ * 1024 + (int64_t)led * (int64_t)mult_) >> 10);
    int sin = SinAtPhaseInterpolated(p, period_run_);
    return (uint32_t)clampi32(
        min_run_ + (int)((int64_t)(sin + 32768) * (max_run_ - min_run_) >> 16),
        0,
        65535);
  }

private:
  PONUA SVFWrapper<PERIOD> period_;
  PONUA SVFWrapper<PHASE> phase_;
  PONUA SVFWrapper<MIN_B> min_;
  PONUA SVFWrapper<MAX_B> max_;
  PONUA SVFWrapper<SPEED> speed_;
  int period_run_ = 0;
  int phase_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int last_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

}  // namespace sine_waves_detail

template<
  class P1, class PH1, class MN1, class MX1, class S1,
  class P2, class PH2, class MN2, class MX2, class S2,
  class P3, class PH3, class MN3, class MX3, class S3,
  class P4, class PH4, class MN4, class MX4, class S4,
  class STRENGTH = Int<65535>>
class SineWavesX {
public:
  void run(BladeBase* base) {
    w1_.run(base);
    w2_.run(base);
    w3_.run(base);
    w4_.run(base);
    strength_.run(base);
    strength_run_ = strength_.calculate(base);
  }

  SimpleColor getColor(int led) {
    uint32_t f = 65535;
    f = (f * w1_.factorAt(led)) / 65535;
    f = (f * w2_.factorAt(led)) / 65535;
    f = (f * w3_.factorAt(led)) / 65535;
    f = (f * w4_.factorAt(led)) / 65535;
    f = sine_waves_detail::ApplyStrength(f, strength_run_);
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  sine_waves_detail::SineWaveSlot<P1, PH1, MN1, MX1, S1> w1_;
  sine_waves_detail::SineWaveSlot<P2, PH2, MN2, MX2, S2> w2_;
  sine_waves_detail::SineWaveSlot<P3, PH3, MN3, MX3, S3> w3_;
  sine_waves_detail::SineWaveSlot<P4, PH4, MN4, MX4, S4> w4_;
  PONUA SVFWrapper<STRENGTH> strength_;
  int strength_run_ = 65535;
};

#endif
