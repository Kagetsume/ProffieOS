#ifndef STYLES_SINE_WAVES_SWING_H
#define STYLES_SINE_WAVES_SWING_H

// Composable texture: sine_waves with swing/twist-modulated effective period.
// Stronger swing or twist → shorter apparent wavelength (faster ripples).
// Same args as sine_waves plus swing_scale twist_scale (ints, default 0 = off).

#include "../common/math.h"
#include "../common/sin_table.h"
#include "../functions/int.h"
#include "../functions/svf.h"
#include "../functions/swing_speed.h"
#include "../functions/twist_angle.h"

namespace sine_waves_swing_detail {

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

inline int EffectivePeriod(int period, int swing, int twist, int swing_scale, int twist_scale) {
  if (period <= 0) return period;
  if (swing_scale == 0 && twist_scale == 0) return period;
  int motion = (swing_scale * swing >> 15) + (twist_scale * twist >> 15);
  if (motion < 0) motion = 0;
  int eff = period * 32768 / (32768 + motion);
  if (eff < 200) eff = 200;
  return eff;
}

template<
  class PERIOD, class PHASE, class MIN_B, class MAX_B, class SPEED,
  class SWING_SCALE, class TWIST_SCALE>
class SineWaveMotionSlot {
public:
  void run(BladeBase* base, int swing, int twist) {
    period_.run(base);
    phase_.run(base);
    min_.run(base);
    max_.run(base);
    speed_.run(base);
    swing_scale_.run(base);
    twist_scale_.run(base);
    period_run_ = period_.calculate(base);
    phase_run_ = phase_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    swing_scale_run_ = swing_scale_.calculate(base);
    twist_scale_run_ = twist_scale_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;

    if (period_run_ <= 0) return;

    effective_period_ = EffectivePeriod(
        period_run_, swing, twist, swing_scale_run_, twist_scale_run_);

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;

    int speed = speed_.calculate(base);
    int32_t wrap = (int32_t)effective_period_ * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed / 333, wrap);

    if (effective_period_ != last_effective_period_) {
      last_effective_period_ = effective_period_;
      mult_ = (50000u * 1024u / (unsigned)effective_period_);
    }
  }

  uint32_t factorAt(int led) const {
    if (period_run_ <= 0) return 65535;

    int p = (int)(((int64_t)m_ + (int64_t)phase_run_ * 1024 + (int64_t)led * (int64_t)mult_) >> 10);
    int sin = SinAtPhaseInterpolated(p, effective_period_);
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
  PONUA SVFWrapper<SWING_SCALE> swing_scale_;
  PONUA SVFWrapper<TWIST_SCALE> twist_scale_;
  int period_run_ = 0;
  int effective_period_ = 0;
  int phase_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int swing_scale_run_ = 0;
  int twist_scale_run_ = 0;
  int last_effective_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

}  // namespace sine_waves_swing_detail

template<
  class P1, class PH1, class MN1, class MX1, class S1,
  class P2, class PH2, class MN2, class MX2, class S2,
  class P3, class PH3, class MN3, class MX3, class S3,
  class P4, class PH4, class MN4, class MX4, class S4,
  class STRENGTH = Int<65535>,
  class SWING_SCALE = Int<0>,
  class TWIST_SCALE = Int<0>>
class SineWavesSwingX {
public:
  void run(BladeBase* base) {
    swing_.run(base);
    twist_.run(base);
    int swing = swing_.calculate(base);
    int twist = twist_.calculate(base);
    w1_.run(base, swing, twist);
    w2_.run(base, swing, twist);
    w3_.run(base, swing, twist);
    w4_.run(base, swing, twist);
    strength_.run(base);
    strength_run_ = strength_.calculate(base);
  }

  SimpleColor getColor(int led) {
    uint32_t f = 65535;
    f = (f * w1_.factorAt(led)) / 65535;
    f = (f * w2_.factorAt(led)) / 65535;
    f = (f * w3_.factorAt(led)) / 65535;
    f = (f * w4_.factorAt(led)) / 65535;
    f = sine_waves_swing_detail::ApplyStrength(f, strength_run_);
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  PONUA SVFWrapper<SwingSpeedX<Int<400>>> swing_;
  PONUA SVFWrapper<TwistAngle<2, 0>> twist_;
  sine_waves_swing_detail::SineWaveMotionSlot<
      P1, PH1, MN1, MX1, S1, SWING_SCALE, TWIST_SCALE> w1_;
  sine_waves_swing_detail::SineWaveMotionSlot<
      P2, PH2, MN2, MX2, S2, SWING_SCALE, TWIST_SCALE> w2_;
  sine_waves_swing_detail::SineWaveMotionSlot<
      P3, PH3, MN3, MX3, S3, SWING_SCALE, TWIST_SCALE> w3_;
  sine_waves_swing_detail::SineWaveMotionSlot<
      P4, PH4, MN4, MX4, S4, SWING_SCALE, TWIST_SCALE> w4_;
  PONUA SVFWrapper<STRENGTH> strength_;
  int strength_run_ = 65535;
};

#endif
