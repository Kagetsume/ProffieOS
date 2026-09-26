#ifndef STYLES_FBM_NOISE_H
#define STYLES_FBM_NOISE_H

// Composable texture: fixed 3-octave 1D value noise (cheap FBM), multiply mask.
// Args: scale speed min max strength
//   strength — mix toward neutral 65535 (default 65535 = full noise). scale 0 = passthrough.

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"
#include "value_noise.h"

namespace fbm_noise_detail {

inline int FbmAt(int coord, int scale, int seed) {
  if (scale < 32) scale = 32;
  int v = 0;
  int den = 0;
  int s = scale;
  for (int o = 0; o < 3; o++) {
    int w = 4 >> o;
    v += value_noise_detail::NoiseAt(coord, s, seed + o * 101) * w;
    den += w;
    s >>= 1;
    if (s < 32) s = 32;
  }
  if (den <= 0) return 32768;
  return v / den;
}

}  // namespace fbm_noise_detail

template<class SCALE, class SPEED, class MIN_B, class MAX_B, class STRENGTH = Int<65535>>
class FbmNoiseX {
public:
  void run(BladeBase* base) {
    scale_.run(base);
    speed_.run(base);
    min_.run(base);
    max_.run(base);
    strength_.run(base);
    scale_run_ = scale_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    strength_run_ = strength_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;

    if (scale_run_ <= 0) return;

    if (scale_run_ != last_scale_) {
      last_scale_ = scale_run_;
      mult_ = (50000u * 1024u / (unsigned)scale_run_);
    }

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;
    int speed = speed_.calculate(base);
    int32_t wrap = (int32_t)scale_run_ * 64 * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed / 333, wrap);
  }

  SimpleColor getColor(int led) {
    uint32_t f = 65535;
    if (scale_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      int n = fbm_noise_detail::FbmAt(p, scale_run_, 0);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)n * (max_run_ - min_run_) >> 16),
          0,
          65535);
      if (strength_run_ < 65535) {
        if (strength_run_ <= 0) f = 65535;
        else f = 65535 - (uint32_t)((65535 - f) * (uint32_t)strength_run_ / 65535);
      }
    }
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  PONUA SVFWrapper<SCALE> scale_;
  PONUA SVFWrapper<SPEED> speed_;
  PONUA SVFWrapper<MIN_B> min_;
  PONUA SVFWrapper<MAX_B> max_;
  PONUA SVFWrapper<STRENGTH> strength_;
  int scale_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int strength_run_ = 65535;
  int last_scale_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
