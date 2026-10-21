#ifndef STYLES_SMOKE_MASK_H
#define STYLES_SMOKE_MASK_H

// One smoke texture. Direction picks the motion:
//   up   — heat injected at the hilt, drifts toward the tip (rand 400)
//   down — heat injected at the tip, drifts toward the hilt (rand 550)
//   flow — offset dual sine rolls; optional speed (1 = default)
// smoke_up, smoke_down, and smoke_flow are the same style with the direction filled in.
// The stack wipe follows the base. These lines do not take extend/retract.

#include <stdlib.h>
#include "../../common/arg_parser.h"
#include "../../common/sin_table.h"
#include "../colors.h"
#include "../fire.h"
#include "../rgb_arg.h"
#include "../style_ptr.h"

enum SmokeDir {
  SMOKE_DIR_UP = 0,
  SMOKE_DIR_DOWN = 1,
  SMOKE_DIR_FLOW = 2,
};

// How the INI line is laid out. The heat/sine code is one class either way.
enum SmokeKind {
  SMOKE_KIND_ARG = 0,  // smoke dark light direction [speed]
  SMOKE_KIND_UP,       // smoke_up dark light
  SMOKE_KIND_DOWN,     // smoke_down dark light
  SMOKE_KIND_FLOW,     // smoke_flow dark light [speed]
};

namespace smoke_mask_detail {

inline int SmoothHeatAt(const unsigned short* heat, int num_leds, int idx, int radius) {
  int sum = 0;
  int wsum = 0;
  for (int d = -radius; d <= radius; d++) {
    int j = idx + d;
    if (j < 0) j = 0;
    if (j >= num_leds) j = num_leds - 1;
    int ad = d < 0 ? -d : d;
    int w = radius + 1 - ad;
    sum += heat[j] * w;
    wsum += w;
  }
  return sum / wsum;
}

inline uint32_t HeatToLuminanceMix(int h, int clear_at) {
  if (h >= clear_at) return 65535u;
  return (uint32_t)h * 65535 / clear_at;
}

inline void UpdateTemporalSmooth(unsigned short*& smooth, int& smooth_len,
                                 const unsigned short* heat, int num_leds) {
  if (!heat || num_leds <= 0) return;
  if (!smooth || smooth_len != num_leds) {
    delete[] smooth;
    smooth_len = num_leds;
    smooth = new unsigned short[smooth_len];
    for (int i = 0; i < smooth_len; i++) smooth[i] = 0;
  }
  for (int i = 0; i < smooth_len; i++) {
    int spatial = SmoothHeatAt(heat, smooth_len, i, 7);
    smooth[i] = (smooth[i] * 13 + spatial * 3) >> 4;
  }
}

inline void SpreadHeatTowardTip(unsigned short* heat, int num_leds, int passes = 2) {
  for (int pass = 0; pass < passes; pass++) {
    for (int i = 0; i < num_leds - 1; i++) {
      heat[i] = clampi32((heat[i] + heat[i + 1]) >> 1, 0, 65535);
    }
  }
}

inline void SpreadHeatTowardHilt(unsigned short* heat, int num_leds, int passes = 2) {
  for (int pass = 0; pass < passes; pass++) {
    for (int i = num_leds - 1; i > 0; i--) {
      heat[i] = clampi32((heat[i] + heat[i - 1]) >> 1, 0, 65535);
    }
  }
}

inline int BladePos32768(int led, int num_leds) {
  if (num_leds <= 1) return 16384;
  return (led * 32768) / (num_leds - 1);
}

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

inline int FlowWavelength(int base, int pos, int band_seed, int time_idx) {
  int sp = ((pos >> 4) + band_seed) & 1023;
  int sp2 = ((pos >> 7) + band_seed * 13) & 1023;
  return base + (sin_table[sp] >> 2) + (sin_table[sp2] >> 3) + (sin_table[time_idx] >> 4);
}

inline int FlowPhaseWarp(int pos, int seed) {
  int sp = ((pos >> 5) + seed) & 1023;
  int sp2 = ((pos >> 9) + seed * 17) & 1023;
  return (sin_table[sp] >> 3) + (sin_table[sp2] >> 4);
}

inline uint32_t RollFlowMix(int pos, int scroll_up, int scroll_down,
                            uint32_t time_us, uint32_t time_us_down) {
  int t_up = (time_us >> 10) & 1023;
  int t_dn = ((time_us_down >> 10) + 512) & 1023;
  int creep = (int)(time_us_down >> 12);
  int warp_up = FlowPhaseWarp(pos, 117);
  int warp_dn = FlowPhaseWarp(pos, 503);
  int phase_up = pos - scroll_up + warp_up;
  int phase_dn = pos + scroll_down + creep + warp_dn;
  int w_up1 = FlowWavelength(26000, pos, 11, t_up);
  int w_up2 = FlowWavelength(18000, pos, 29, (t_up + 171) & 1023);
  int w_dn1 = FlowWavelength(21000, pos, 47, (t_dn + 85) & 1023);
  int w_dn2 = FlowWavelength(15500, pos, 73, (t_dn + 341) & 1023);
  int s_up1 = SinAtPhaseInterpolated(phase_up, w_up1);
  int s_up2 = SinAtPhaseInterpolated(phase_up, w_up2);
  int s_dn1 = SinAtPhaseInterpolated(phase_dn, w_dn1);
  int s_dn2 = SinAtPhaseInterpolated(phase_dn, w_dn2);
  int bright = 32768 + (s_up1 >> 1) + (s_up2 >> 3) + (s_dn1 >> 3) + (s_dn2 >> 4);
  bright = clampi32(bright, 14000, 50000);
  return HeatToLuminanceMix(bright >> 8, 248);
}

inline int ParseSmokeSpeed(int arg_num) {
  if (!CurrentArgParser) return 1;
  const char* arg = CurrentArgParser->GetArg(arg_num, "INT", "1");
  if (!arg || !arg[0]) return 1;
  return (int)strtol(arg, NULL, 0);
}

inline SmokeDir ParseSmokeDir(int arg_num, SmokeDir fallback) {
  const char* fallback_word = "flow";
  if (fallback == SMOKE_DIR_UP) fallback_word = "up";
  else if (fallback == SMOKE_DIR_DOWN) fallback_word = "down";
  if (!CurrentArgParser) return fallback;
  const char* arg = CurrentArgParser->GetArg(arg_num, "DIR", fallback_word);
  if (!arg || !arg[0]) return fallback;
  if (FirstWord(arg, "up")) return SMOKE_DIR_UP;
  if (FirstWord(arg, "down")) return SMOKE_DIR_DOWN;
  if (FirstWord(arg, "flow")) return SMOKE_DIR_FLOW;
  return fallback;
}

}  // namespace smoke_mask_detail

// Shared smoke body. Up and down run one heat buffer; flow runs the sine rolls.
class SmokeRuntime {
public:
  SmokeRuntime() = default;
  ~SmokeRuntime() {
    delete[] heat_;
    delete[] smooth_;
  }

  void Init(SmokeKind kind) {
    kind_ = kind;
    if (kind == SMOKE_KIND_UP) {
      dir_ = SMOKE_DIR_UP;
    } else if (kind == SMOKE_KIND_DOWN) {
      dir_ = SMOKE_DIR_DOWN;
    } else if (kind == SMOKE_KIND_FLOW) {
      dir_ = SMOKE_DIR_FLOW;
      speed_ = smoke_mask_detail::ParseSmokeSpeed(3);
    } else {
      dir_ = smoke_mask_detail::ParseSmokeDir(3, SMOKE_DIR_FLOW);
      speed_ = smoke_mask_detail::ParseSmokeSpeed(4);
    }
  }

  int maxArg() const {
    if (kind_ == SMOKE_KIND_ARG) return 4;
    if (kind_ == SMOKE_KIND_FLOW) return 3;
    return 2;
  }

  bool run(BladeBase* blade) {
    c1_.run(blade);
    c2_.run(blade);
    num_leds_ = blade->num_leds();
    if (dir_ == SMOKE_DIR_FLOW) {
      time_us_ = micros();
      time_us_down_ = time_us_ + 4800000u;
      int speed = speed_;
      scroll_up_ = (int)(((int64_t)time_us_ * 9 * speed) / 10000);
      scroll_down_ = (int)(((int64_t)time_us_down_ * 5 * speed) / 14000);
      return true;
    }
    uint32_t m = millis();
    if (m - tick_ >= 20) {
      tick_ = m;
      StepHeat();
    }
    smoke_mask_detail::UpdateTemporalSmooth(smooth_, smooth_len_, heat_, num_leds_);
    return true;
  }

  SimpleColor getColor(int led) {
    uint32_t mix = 65535u;
    if (dir_ == SMOKE_DIR_FLOW) {
      if (num_leds_ <= 0) return SimpleColor(Color16());
      int pos = smoke_mask_detail::BladePos32768(led, num_leds_);
      mix = smoke_mask_detail::RollFlowMix(
          pos, scroll_up_, scroll_down_, time_us_, time_us_down_);
    } else if (smooth_ && num_leds_ > 0) {
      int idx = num_leds_ - 1 - led;
      if (idx < 0) idx = 0;
      if (idx >= num_leds_) idx = num_leds_ - 1;
      mix = smoke_mask_detail::HeatToLuminanceMix(smooth_[idx], 248);
    }
    SimpleColor c;
    c.c = c1_.getColor(led).c.mix(c2_.getColor(led).c, mix);
    return c;
  }

private:
  // heat_[0] is the tip end of the buffer. Up injects just past the hilt
  // (index num_leds) and diffuses toward index 0. Down injects at index 0.
  // SPEED is 1, cooling is 1, matching the old FireConfig specializations.
  void StepHeat() {
    if (num_leds_ <= 0) return;
    if (!heat_) {
      size_t N = (size_t)num_leds_ + 1 + 3;
      heat_ = new unsigned short[N];
      for (size_t i = 0; i < N; i++) heat_[i] = 0;
    }
    const int speed = 1;
    const int cooling = 1;
    if (dir_ == SMOKE_DIR_DOWN) {
      const int rand_amp = 550;
      for (int i = 0; i < speed; i++) {
        heat_[i] = random(random(random(rand_amp)));
      }
      for (int i = 1; i < num_leds_; i++) {
        int ip1 = (i + 1 < num_leds_) ? i + 1 : i;
        int x = (heat_[i - 1] * 3 + heat_[i] * 10 + heat_[ip1] * 3) >> 4;
        heat_[i] = clampi32(x - random(cooling), 0, 65535);
      }
      if (num_leds_ > 1) smoke_mask_detail::SpreadHeatTowardHilt(heat_, num_leds_, 2);
    } else {
      const int rand_amp = 400;
      for (int i = 0; i < speed; i++) {
        heat_[num_leds_ + i] = random(random(random(rand_amp)));
      }
      for (int i = 0; i < num_leds_; i++) {
        int x = (heat_[i + speed - 1] * 3 +
                 heat_[i + speed] * 10 +
                 heat_[i + speed + 1] * 3) >> 4;
        heat_[i] = clampi32(x - random(cooling), 0, 65535);
      }
      if (num_leds_ > 1) smoke_mask_detail::SpreadHeatTowardTip(heat_, num_leds_, 2);
    }
  }

  SmokeKind kind_ = SMOKE_KIND_ARG;
  SmokeDir dir_ = SMOKE_DIR_FLOW;
  int speed_ = 1;
  int num_leds_ = 0;
  int scroll_up_ = 0;
  int scroll_down_ = 0;
  uint32_t time_us_ = 0;
  uint32_t time_us_down_ = 0;
  uint32_t tick_ = 0;
  unsigned short* heat_ = 0;
  unsigned short* smooth_ = 0;
  int smooth_len_ = 0;
  RgbArg<1, Black> c1_;
  RgbArg<2, White> c2_;
};

class SmokeBladeStyle : public Style<SmokeRuntime> {
public:
  explicit SmokeBladeStyle(SmokeKind kind) { base_.Init(kind); }

  int get_max_arg(int argument) override {
    if (argument < 1 || argument > base_.maxArg()) return -1;
    return 65535;
  }
};

class SmokeStyleFactory : public StyleFactory {
public:
  explicit SmokeStyleFactory(SmokeKind kind) : kind_(kind) {}
  BladeStyle* make() override { return new SmokeBladeStyle(kind_); }

private:
  SmokeKind kind_;
};

static SmokeStyleFactory smoke_factory(SMOKE_KIND_ARG);
static SmokeStyleFactory smoke_up_factory(SMOKE_KIND_UP);
static SmokeStyleFactory smoke_down_factory(SMOKE_KIND_DOWN);
static SmokeStyleFactory smoke_flow_factory(SMOKE_KIND_FLOW);

#endif  // STYLES_SMOKE_MASK_H
