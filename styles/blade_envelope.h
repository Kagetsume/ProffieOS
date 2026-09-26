#ifndef STYLES_BLADE_ENVELOPE_H
#define STYLES_BLADE_ENVELOPE_H

// Composable texture: Gaussian-like bump along blade (tip/hilt highlight), multiply mask.
// Args: center width min max [speed]
//   center — 0 hilt .. 32768 tip (default 16384). speed scrolls center (0 = static).

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"

namespace blade_envelope_detail {

inline int SmoothstepUnit(int x) {
  if (x <= 0) return 0;
  if (x >= 32768) return 32768;
  return (((x * x) >> 14) * ((3 << 14) - x)) >> 15;
}

}  // namespace blade_envelope_detail

template<class CENTER, class WIDTH, class MIN_B, class MAX_B, class SPEED = Int<0>>
class BladeEnvelopeX {
public:
  void run(BladeBase* base) {
    center_.run(base);
    width_.run(base);
    min_.run(base);
    max_.run(base);
    speed_.run(base);
    center_run_ = center_.calculate(base);
    width_run_ = width_.calculate(base);
    min_run_ = min_.calculate(base);
    max_run_ = max_.calculate(base);
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;
    if (width_run_ <= 0) width_run_ = 4096;
    num_leds_ = base->num_leds();
    if (num_leds_ <= 0) num_leds_ = 1;
    speed_run_ = speed_.calculate(base);

    if (speed_run_ != 0) {
      uint32_t now_micros = micros();
      int32_t delta_micros = now_micros - last_micros_;
      last_micros_ = now_micros;
      m_ = MOD(m_ + delta_micros * speed_run_ / 333, 32768 * 1024);
    }
  }

  SimpleColor getColor(int led) {
    int center = center_run_;
    if (speed_run_ != 0) {
      int scroll = (int)(m_ >> 10);
      center = MOD(center + scroll, 32768);
    }
    int pos = led * 32768 / num_leds_;
    int dist = abs(pos - center);
    if (dist > 16384) dist = 32768 - dist;
    int w = width_run_;
    if (w <= 0) w = 1;
    int t = 32768 - dist * 32768 / w;
    if (t < 0) t = 0;
    int bump = blade_envelope_detail::SmoothstepUnit(t);
    uint32_t f = (uint32_t)clampi32(
        min_run_ + (int)((int64_t)bump * (max_run_ - min_run_) >> 15),
        0,
        65535);
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

private:
  PONUA SVFWrapper<CENTER> center_;
  PONUA SVFWrapper<WIDTH> width_;
  PONUA SVFWrapper<MIN_B> min_;
  PONUA SVFWrapper<MAX_B> max_;
  PONUA SVFWrapper<SPEED> speed_;
  int center_run_ = 16384;
  int width_run_ = 4096;
  int min_run_ = 0;
  int max_run_ = 65535;
  int speed_run_ = 0;
  int num_leds_ = 1;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

#endif
