#ifndef STYLES_SMOOTHSTEP_BANDS_H
#define STYLES_SMOOTHSTEP_BANDS_H

// Composable texture: rolling soft rectangular bands (smoothstep edges), grayscale multiply mask.
// Args: period speed min max edge_width
//   period — band repeat length along blade (like stripe width; default 2400). 0 = passthrough (×65535).
//   speed — scroll like stripes (default -2000).
//   min, max — mask in gap / band (0–65535).
//   edge_width — soft edge size on each side (default 400; clamped to half period).

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace smoothstep_bands_detail {

inline int SmoothstepUnit(int x) {
  if (x <= 0) return 0;
  if (x >= 32768) return 32768;
  return (((x * x) >> 14) * ((3 << 14) - x)) >> 15;
}

}  // namespace smoothstep_bands_detail

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class EDGE>
class SmoothstepBandsX {
public:
  void run(BladeBase* base) {
    period_.run(base);
    speed_.run(base);
    min_.run(base);
    max_.run(base);
    edge_.run(base);
    period_run_ = period_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    edge_run_ = edge_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;
    if (edge_run_ < 0) edge_run_ = 0;

    if (period_run_ <= 0) return;

    if (period_run_ != last_period_) {
      last_period_ = period_run_;
      mult_ = (50000u * 1024u / (unsigned)period_run_);
      int half = period_run_ >> 1;
      if (half <= 0) half = 1;
      edge_clamp_ = edge_run_;
      if (edge_clamp_ > half) edge_clamp_ = half;
      if (edge_clamp_ <= 0) edge_clamp_ = 1;
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
      int64_t q = p;
      while (q < 0) q += period_run_;
      while (q >= period_run_) q -= period_run_;
      int pos = (int)q;
      int edge = edge_clamp_;
      int rise = smoothstep_bands_detail::SmoothstepUnit(pos * 32768 / edge);
      int fall_pos = period_run_ - pos;
      int fall = smoothstep_bands_detail::SmoothstepUnit(fall_pos * 32768 / edge);
      int bump = rise;
      if (fall < bump) bump = fall;
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)bump * (max_run_ - min_run_) >> 15),
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
  PONUA SVFWrapper<EDGE> edge_;
  int period_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int edge_run_ = 400;
  int edge_clamp_ = 400;
  int last_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
