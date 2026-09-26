#ifndef STYLES_MOIRE_MASK_H
#define STYLES_MOIRE_MASK_H

// Composable texture: two scrolling linear ramps beat (moire) — multiply mask.
// Args: period1 period2 speed1 speed2 min max
//   Either period 0 = that ramp constant 65535 (neutral factor). Both 0 = passthrough.

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace moire_mask_detail {

inline uint32_t RampFactor(int coord, int period) {
  if (period <= 0) return 65535;
  int64_t p = coord;
  while (p < 0) p += period;
  while (p >= period) p -= period;
  return (uint32_t)((p * 65535) / period);
}

}  // namespace moire_mask_detail

template<
  class P1, class P2, class S1, class S2, class MIN_B, class MAX_B>
class MoireMaskX {
public:
  void run(BladeBase* base) {
    p1_.run(base);
    p2_.run(base);
    s1_.run(base);
    s2_.run(base);
    min_.run(base);
    max_.run(base);
    p1_run_ = p1_.calculate(base);
    p2_run_ = p2_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;

    if (p1_run_ <= 0 && p2_run_ <= 0) return;

    if (p1_run_ != last_p1_) {
      last_p1_ = p1_run_;
      mult1_ = p1_run_ > 0 ? (50000u * 1024u / (unsigned)p1_run_) : 0;
    }
    if (p2_run_ != last_p2_) {
      last_p2_ = p2_run_;
      mult2_ = p2_run_ > 0 ? (50000u * 1024u / (unsigned)p2_run_) : 0;
    }

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;

    if (p1_run_ > 0) {
      int speed = s1_.calculate(base);
      int32_t wrap = (int32_t)p1_run_ * 1024;
      if (wrap < 1024) wrap = 1024;
      m1_ = MOD(m1_ + delta_micros * speed / 333, wrap);
    }
    if (p2_run_ > 0) {
      int speed = s2_.calculate(base);
      int32_t wrap = (int32_t)p2_run_ * 1024;
      if (wrap < 1024) wrap = 1024;
      m2_ = MOD(m2_ + delta_micros * speed / 333, wrap);
    }
  }

  SimpleColor getColor(int led) {
    uint32_t f = 65535;
    if (p1_run_ > 0 || p2_run_ > 0) {
      uint32_t r1 = moire_mask_detail::RampFactor(
          (int)(((int64_t)m1_ + (int64_t)led * (int64_t)mult1_) >> 10), p1_run_);
      uint32_t r2 = moire_mask_detail::RampFactor(
          (int)(((int64_t)m2_ + (int64_t)led * (int64_t)mult2_) >> 10), p2_run_);
      uint32_t beat = (r1 * r2) / 65535;
      f = min_run_ + (uint32_t)((uint64_t)(max_run_ - min_run_) * beat / 65535);
    }
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  PONUA SVFWrapper<P1> p1_;
  PONUA SVFWrapper<P2> p2_;
  PONUA SVFWrapper<S1> s1_;
  PONUA SVFWrapper<S2> s2_;
  PONUA SVFWrapper<MIN_B> min_;
  PONUA SVFWrapper<MAX_B> max_;
  int p1_run_ = 0;
  int p2_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int last_p1_ = -1;
  int last_p2_ = -1;
  uint32_t mult1_ = 0;
  uint32_t mult2_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m1_ = 0;
  int32_t m2_ = 0;
};

#endif
