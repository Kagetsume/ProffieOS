#ifndef STYLES_RANDOM_BANDS_H
#define STYLES_RANDOM_BANDS_H

// Composable texture: irregular rolling bands along the blade (gaps between bands).
// Stack with multiply (gap_color black = leave base unchanged) or add (gaps add nothing).
//
// Args: speed band_color [gap_color] [scale]
//   speed — scroll like stripes (negative = toward tip, default -2000)
//   band_color — color in bands
//   gap_color — default Black (multiply-neutral)
//   scale — average segment size along blade, like stripe width (default 2400)

#include "../common/math.h"
#include "../functions/int.h"
#include "../functions/svf.h"
#include "colors.h"

namespace random_bands_detail {

inline int Hash32(int x) {
  x ^= x >> 16;
  x *= 0x45d9f3b;
  x ^= x >> 16;
  return x;
}

struct BandPattern {
  uint16_t seg_len[16];
  uint16_t band_len[16];
  uint32_t cycle;
};

inline void BuildPattern(BandPattern* p, int scale) {
  if (scale < 200) scale = 200;
  p->cycle = 0;
  for (int i = 0; i < 16; i++) {
    int h = Hash32(i * 2654435761 + scale * 17);
    uint16_t seg = (uint16_t)(scale + ((h & 0xff) * (unsigned)scale >> 9));
    if (seg < (unsigned)scale / 4) seg = (uint16_t)(scale / 4);
    uint16_t duty = (uint16_t)(35 + ((h >> 8) & 0x3f));
    p->seg_len[i] = seg;
    p->band_len[i] = (uint16_t)(((uint32_t)seg * duty) >> 7);
    p->cycle += seg;
  }
  if (p->cycle == 0) p->cycle = 1;
}

inline bool IsBandAt(int coord, const BandPattern* p) {
  int32_t c = MOD(coord, (int32_t)p->cycle);
  if (c < 0) c += (int32_t)p->cycle;
  int x = 0;
  for (int i = 0; i < 16; i++) {
    if (c < x + (int)p->band_len[i]) return true;
    if (c < x + (int)p->seg_len[i]) return false;
    x += p->seg_len[i];
  }
  return false;
}

}  // namespace random_bands_detail

template<class SPEED, class BAND, class GAP, class SCALE>
class RandomBandsX {
public:
  void run(BladeBase* base) {
    speed_.run(base);
    band_.run(base);
    gap_.run(base);
    scale_.run(base);
    int scale = scale_.calculate(base);
    if (scale != last_scale_) {
      last_scale_ = scale;
      random_bands_detail::BuildPattern(&pattern_, scale);
    }
    if (scale <= 0) scale = 2400;
    mult_ = (50000 * 1024 / scale);

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;
    int speed = speed_.calculate(base);
    int32_t wrap = (int32_t)pattern_.cycle * 1024;
    if (wrap < 1024) wrap = 1024;
    m = MOD(m + delta_micros * speed / 333, wrap);
  }

  SimpleColor getColor(int led) {
    int p = ((m + led * mult_) >> 10);
    bool on = random_bands_detail::IsBandAt(p, &pattern_);
    SimpleColor ret;
    ret.c = on ? band_.getColor(led).c : gap_.getColor(led).c;
    return ret;
  }

private:
  PONUA SVFWrapper<SPEED> speed_;
  PONUA BAND band_;
  PONUA GAP gap_;
  PONUA SVFWrapper<SCALE> scale_;
  random_bands_detail::BandPattern pattern_;
  int last_scale_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m = 0;
};

template<int SPEED, int SCALE, class BAND, class GAP = Black>
using RandomBands = RandomBandsX<Int<SPEED>, BAND, GAP, Int<SCALE>>;

#endif
