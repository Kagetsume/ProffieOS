#ifndef STYLES_HUE_WAVES_H
#define STYLES_HUE_WAVES_H

// Composable texture: up to four sine-shaped hue-offset waves along the blade.
// Does not change luminance by itself. The layer encodes a RotateColorsX hue
// offset in the red channel; ConfigLayersStyle's "hue" blend applies
// Color16::rotate((offset & 0x7fff) * 3) to the pixels underneath.
//
// Stack (hue blend — not multiply, which would crush toward black):
//   layer = hue opacity 100% hue_waves 2400 0 0 8192 -2000
//   layer = hue opacity 100% hue_waves 2400 0 0 8192 -2000 1600 512 0 4096 1400
//
// Args (five per wave, up to four waves; optional strength last, arg 21):
//   period phase min_hue max_hue speed  [wave2…]  [strength]
//
//   period — wavelength along the blade (same units as sine_waves). 0 = slot off (adds 0).
//   phase — spatial phase offset (same units as sine_waves).
//   min_hue, max_hue — hue offset at trough and crest. RotateColorsX / Hue units:
//     0 = no shift, 16384 = 180 degrees, 32768 = 360 degrees. 0–8192 is about 90 degrees.
//   speed — scroll like sine_waves (negative = toward tip).
//   strength — optional layer-wide mix of the summed offset toward 0 (no shift).
//     0 = neutral, 65535 = full offset (default).
//
// Active waves add their offsets. Disabled slots (period 0) add nothing.

#include "../common/math.h"
#include "../common/sin_table.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace hue_waves_detail {

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

// Mix offset toward 0. strength 0 = no hue shift, 65535 = full offset.
inline int ApplyStrength(int offset, int strength) {
  if (strength >= 65535) return offset;
  if (strength <= 0) return 0;
  return (int)((int64_t)offset * strength / 65535);
}

template<class PERIOD, class PHASE, class MIN_H, class MAX_H, class SPEED>
class HueWaveSlot {
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

  int offsetAt(int led) const {
    if (period_run_ <= 0) return 0;

    int p = (int)(((int64_t)m_ + (int64_t)phase_run_ * 1024 + (int64_t)led * (int64_t)mult_) >> 10);
    int sin = SinAtPhaseInterpolated(p, period_run_);
    return (int)clampi32(
        min_run_ + (int)((int64_t)(sin + 32768) * (max_run_ - min_run_) >> 16),
        0,
        65535);
  }

private:
  PONUA SVFWrapper<PERIOD> period_;
  PONUA SVFWrapper<PHASE> phase_;
  PONUA SVFWrapper<MIN_H> min_;
  PONUA SVFWrapper<MAX_H> max_;
  PONUA SVFWrapper<SPEED> speed_;
  int period_run_ = 0;
  int phase_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 0;
  int last_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

}  // namespace hue_waves_detail

template<
  class P1, class PH1, class MN1, class MX1, class S1,
  class P2, class PH2, class MN2, class MX2, class S2,
  class P3, class PH3, class MN3, class MX3, class S3,
  class P4, class PH4, class MN4, class MX4, class S4,
  class STRENGTH = Int<65535>>
class HueWavesX {
public:
  void run(BladeBase* base) {
    w1_.run(base);
    w2_.run(base);
    w3_.run(base);
    w4_.run(base);
    strength_.run(base);
    strength_run_ = strength_.calculate(base);
  }

  // Red channel carries the summed hue offset (RotateColorsX units, low 15 bits).
  // Green and blue stay 0. Only the "hue" config blend should read this layer.
  SimpleColor getColor(int led) {
    int offset = w1_.offsetAt(led) + w2_.offsetAt(led) + w3_.offsetAt(led) + w4_.offsetAt(led);
    offset = hue_waves_detail::ApplyStrength(offset, strength_run_);
    if (offset < 0) offset = 0;
    uint16_t h = (uint16_t)(offset & 0x7fff);
    SimpleColor ret;
    ret.c = Color16(h, 0, 0);
    return ret;
  }

private:
  hue_waves_detail::HueWaveSlot<P1, PH1, MN1, MX1, S1> w1_;
  hue_waves_detail::HueWaveSlot<P2, PH2, MN2, MX2, S2> w2_;
  hue_waves_detail::HueWaveSlot<P3, PH3, MN3, MX3, S3> w3_;
  hue_waves_detail::HueWaveSlot<P4, PH4, MN4, MX4, S4> w4_;
  PONUA SVFWrapper<STRENGTH> strength_;
  int strength_run_ = 65535;
};

#endif
