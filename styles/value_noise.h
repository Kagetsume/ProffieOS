#ifndef STYLES_VALUE_NOISE_H
#define STYLES_VALUE_NOISE_H

// Composable texture: 1D smooth hash noise along blade + time scroll (multiply mask).
// Args: scale speed min max [seed]
//   scale — feature size along blade (default 2400). 0 = passthrough.
//   speed — scroll (default -2000).
//   seed — optional int lattice seed (default 0).

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace value_noise_detail {

inline int Hash32(int x) {
  x ^= x >> 16;
  x *= 0x45d9f3b;
  x ^= x >> 16;
  return x;
}

inline int HashUnit(int x) {
  return (Hash32(x) & 0xffff);
}

inline int SmoothstepUnit(int x) {
  if (x <= 0) return 0;
  if (x >= 32768) return 32768;
  return (((x * x) >> 14) * ((3 << 14) - x)) >> 15;
}

inline int NoiseAt(int coord, int scale, int seed) {
  if (scale < 32) scale = 32;
  int cell = coord / scale;
  int frac = coord - cell * scale;
  int t = SmoothstepUnit(frac * 32768 / scale);
  int a = HashUnit(cell * 7919 + seed);
  int b = HashUnit((cell + 1) * 7919 + seed);
  return a + ((b - a) * t >> 15);
}

}  // namespace value_noise_detail

template<class SCALE, class SPEED, class MIN_B, class MAX_B, class SEED = Int<0>>
class ValueNoiseX {
public:
  void run(BladeBase* base) {
    scale_.run(base);
    speed_.run(base);
    min_.run(base);
    max_.run(base);
    seed_.run(base);
    scale_run_ = scale_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    seed_run_ = seed_.calculate(base);
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
      int n = value_noise_detail::NoiseAt(p, scale_run_, seed_run_);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)n * (max_run_ - min_run_) >> 16),
          0,
          65535);
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
  PONUA SVFWrapper<SEED> seed_;
  int scale_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int seed_run_ = 0;
  int last_scale_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
