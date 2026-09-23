#ifndef STYLES_SMOKE_MASK_H
#define STYLES_SMOKE_MASK_H

// Composable smoke luminance textures for config/blade_styles.ini layering.
// Built on the ProffieOS fire heat engine (fire.h) without modifying core StyleFire.
//
// smoke_up / smoke_down: fire-engine bands (pair as multiply layers for advanced use)
// smoke_flow: wide bands rolling opposite directions; spatial width/phase warp for organic look

#include "../common/sin_table.h"
#include "../functions/int.h"
#include "../functions/svf.h"
#include "fire.h"

// heat_[0] = tip. Injects at the tip and diffuses toward the hilt (opposite of StyleFireBase).
template<int DELAY = 0, int SPEED = 2,
  class NORM = FireConfig<0,2000,5>,
  class CLASH = FireConfig<3000,0,0>,
  class LOCK = FireConfig<0, 5000, 10>,
  class OFF = FireConfig<0, 0, NORM::Cooling>>
class StyleFireReverseBase {
protected:
  ~StyleFireReverseBase() {
    delete[] heat_;
  }
  enum OnState {
    STATE_OFF = 0,
    STATE_ACTIVATING,
    STATE_ON,
  };
  bool On(BladeBase* blade) {
    if (!blade->is_on()) {
      state_ = STATE_OFF;
      return false;
    }
    switch (state_) {
      default:
         state_ = STATE_ACTIVATING;
         on_time_ = millis();
	 [[gnu::fallthrough]];
      case STATE_ACTIVATING:
         if (millis() - on_time_ < DELAY) return false;
         state_ = STATE_ON;
	 [[gnu::fallthrough]];
      case STATE_ON:
         return true;
    }
  }
  bool run(BladeBase* blade) {
    bool keep_running = true;
    uint32_t m = millis();
    num_leds_ = blade->num_leds();
    if (!heat_) {
      size_t N = num_leds_ + SPEED + 3;
      heat_ = new unsigned short[N];
      for (size_t i = 0; i < N; i++) heat_[i] = 0;
    }
    if (m - last_update_ >= 10) {
      last_update_ = m;

      FireConfiguration config = OFF::get();
      if (clash_.Detect(blade)) {
	config = CLASH::get();
      } else if (On(blade)) {
        if (SaberBase::LockupForBlade(blade->GetBladeNumber()) == SaberBase::LOCKUP_NONE) {
          config = NORM::get();
        } else {
          config = LOCK::get();
        }
      }
      for (int i = 0; i < SPEED; i++) {
         heat_[i] = config.intensity_base +
           random(random(random(config.intensity_rand)));
      }
      int zero = true;
      for (int i = 1; i < num_leds_; i++) {
         int ip1 = (i + 1 < num_leds_) ? i + 1 : i;
         int x = (heat_[i-1] * 3 +
                  heat_[i] * 10 +
                  heat_[ip1] * 3) >> 4;
         heat_[i] = clampi32(x - random(config.cooling), 0, 65535);
	 if (heat_[i]) zero = false;
      }
      if (heat_[0]) zero = false;
      if (zero) keep_running = false;
    }
    return keep_running;
  }

  OneshotEffectDetector<EFFECT_CLASH> clash_;
  int num_leds_;
  uint32_t last_update_;
  unsigned short* heat_ = 0;
  OnState state_ = STATE_OFF;
  uint32_t on_time_;
};

template<class COLOR1, class COLOR2,
  int DELAY = 0, int SPEED = 2,
  class NORM = FireConfig<0,2000,5>,
  class CLASH = FireConfig<3000,0,0>,
  class LOCK = FireConfig<0, 5000, 10>,
  class OFF = FireConfig<0, 0, NORM::Cooling>>
class StyleFireReverse : StyleFireReverseBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF>{
public:
  StyleFireReverse() {}
  bool run(BladeBase* blade) {
    c1_.run(blade);
    c2_.run(blade);
    return StyleFireReverseBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF>::run(blade);
  }

  SimpleColor getColor(int led) {
    if (!this->heat_) {
      return SimpleColor(Color16());
    }
    int h = this->heat_[this->num_leds_ - 1 - led];
    SimpleColor c;
    if (h < 256) {
      c.c = Color16().mix(c1_.getColor(led).c, h);
    } else if (h < 512) {
      c.c = c1_.getColor(led).c.mix(c2_.getColor(led).c, h - 256);
    } else if (h < 768) {
      c.c = c2_.getColor(led).c.mix(Color16(65535,65535,65535), h - 512);
    } else {
      c.c = Color16(65535, 65535, 65535);
    }
    return c;
  }

private:
  COLOR1 c1_;
  COLOR2 c2_;
};

namespace smoke_mask_detail {
// Triangular spatial low-pass. Wider radius at injection ends → wide blobs that still roll.
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

inline int ClearThresholdAt(int led, int num_leds) {
  (void)led;
  (void)num_leds;
  return 248;
}

inline void UpdateTemporalSmooth(unsigned short*& smooth, int& smooth_len,
                                 const unsigned short* heat, int num_leds,
                                 bool responsive = false) {
  if (!heat || num_leds <= 0) return;
  if (!smooth || smooth_len != num_leds) {
    delete[] smooth;
    smooth_len = num_leds;
    smooth = new unsigned short[smooth_len];
    for (int i = 0; i < smooth_len; i++) smooth[i] = 0;
  }
  for (int i = 0; i < smooth_len; i++) {
    int spatial = SmoothHeatAt(heat, smooth_len, i, 7);
    if (responsive) {
      smooth[i] = (smooth[i] * 11 + spatial * 5) >> 4;
    } else {
      smooth[i] = (smooth[i] * 13 + spatial * 3) >> 4;
    }
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

// Per-LED wavelength: slow time drift + two spatial scales so band width varies along blade.
inline int FlowWavelength(int base, int pos, int band_seed, int time_idx) {
  int sp = ((pos >> 4) + band_seed) & 1023;
  int sp2 = ((pos >> 7) + band_seed * 13) & 1023;
  return base + (sin_table[sp] >> 2) + (sin_table[sp2] >> 3) + (sin_table[time_idx] >> 4);
}

// Local phase shear — breaks parallel sine ridges without a second min-combine pass.
inline int FlowPhaseWarp(int pos, int seed) {
  int sp = ((pos >> 5) + seed) & 1023;
  int sp2 = ((pos >> 9) + seed * 17) & 1023;
  return (sin_table[sp] >> 3) + (sin_table[sp2] >> 4);
}

// One field: offset dual sine rolls summed (not min-combined — that causes yo-yo beats).
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

}  // namespace smoke_mask_detail

template<class COLOR1, class COLOR2,
  int DELAY = 0, int SPEED = 1,
  class NORM = FireConfig<0, 700, 1>,
  class CLASH = NORM,
  class LOCK = NORM,
  class OFF = NORM>
class StyleSmokeLuminance : StyleFireBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF> {
public:
  ~StyleSmokeLuminance() {
    delete[] smooth_;
  }

  bool RunHeat(BladeBase* blade) {
    bool keep = true;
    uint32_t m = millis();
    if (m - tick_ >= 20) {
      tick_ = m;
      keep = StyleFireBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF>::run(blade);
      if (this->heat_ && this->num_leds_ > 1) {
        smoke_mask_detail::SpreadHeatTowardTip(this->heat_, this->num_leds_, 2);
      }
    } else {
      this->num_leds_ = blade->num_leds();
    }
    smoke_mask_detail::UpdateTemporalSmooth(
        smooth_, smooth_len_, this->heat_, this->num_leds_);
    return keep;
  }

  bool run(BladeBase* blade) {
    c1_.run(blade);
    c2_.run(blade);
    RunHeat(blade);
    return true;
  }

  int GetNumLeds() const { return this->num_leds_; }

  uint32_t GetMixAtLed(int led) const {
    if (!smooth_ || this->num_leds_ <= 0) return 65535u;
    int idx = this->num_leds_ - 1 - led;
    return smoke_mask_detail::HeatToLuminanceMix(
        smooth_[idx], smoke_mask_detail::ClearThresholdAt(led, this->num_leds_));
  }

  SimpleColor getColor(int led) {
    uint32_t mix = GetMixAtLed(led);
    SimpleColor c;
    c.c = c1_.getColor(led).c.mix(c2_.getColor(led).c, mix);
    return c;
  }

private:
  COLOR1 c1_;
  COLOR2 c2_;
  unsigned short* smooth_ = 0;
  int smooth_len_ = 0;
  uint32_t tick_ = 0;
};

template<class COLOR1, class COLOR2,
  int DELAY = 0, int SPEED = 1,
  class NORM = FireConfig<0, 900, 1>,
  class CLASH = NORM,
  class LOCK = NORM,
  class OFF = NORM>
class StyleSmokeLuminanceReverse : StyleFireReverseBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF> {
public:
  ~StyleSmokeLuminanceReverse() {
    delete[] smooth_;
  }

  bool RunHeat(BladeBase* blade) {
    bool keep = true;
    uint32_t m = millis();
    if (m - tick_ >= 20) {
      tick_ = m;
      keep = StyleFireReverseBase<DELAY, SPEED, NORM, CLASH, LOCK, OFF>::run(blade);
      if (this->heat_ && this->num_leds_ > 1) {
        smoke_mask_detail::SpreadHeatTowardHilt(this->heat_, this->num_leds_);
      }
    } else {
      this->num_leds_ = blade->num_leds();
    }
    smoke_mask_detail::UpdateTemporalSmooth(
        smooth_, smooth_len_, this->heat_, this->num_leds_);
    return keep;
  }

  bool run(BladeBase* blade) {
    c1_.run(blade);
    c2_.run(blade);
    RunHeat(blade);
    return true;
  }

  uint32_t GetMixAtLed(int led) const {
    if (!smooth_ || this->num_leds_ <= 0) return 65535u;
    int idx = this->num_leds_ - 1 - led;
    return smoke_mask_detail::HeatToLuminanceMix(
        smooth_[idx], smoke_mask_detail::ClearThresholdAt(led, this->num_leds_));
  }

  SimpleColor getColor(int led) {
    uint32_t mix = GetMixAtLed(led);
    SimpleColor c;
    c.c = c1_.getColor(led).c.mix(c2_.getColor(led).c, mix);
    return c;
  }

private:
  COLOR1 c1_;
  COLOR2 c2_;
  unsigned short* smooth_ = 0;
  int smooth_len_ = 0;
  uint32_t tick_ = 0;
};

// Opposing offset dual sine rolls; sizes drift slowly along the blade.
template<class COLOR1, class COLOR2,
  int DELAY = 0, class ROLL_SPEED = Int<1>,
  class UP_NORM = FireConfig<0, 400, 1>,
  class DOWN_NORM = FireConfig<0, 550, 1>>
class StyleSmokeFlow {
public:
  bool run(BladeBase* blade) {
    c1_.run(blade);
    c2_.run(blade);
    roll_speed_.run(blade);
    num_leds_ = blade->num_leds();
    (void)DELAY;
    (void)UP_NORM::get();
    (void)DOWN_NORM::get();
    // One time sample per frame — getColor must not call micros() per LED (unstable flicker).
    time_us_ = micros();
    time_us_down_ = time_us_ + 4800000u;
    int speed = roll_speed_.calculate(blade);
    scroll_up_ = (int)(((int64_t)time_us_ * 9 * speed) / 10000);
    scroll_down_ = (int)(((int64_t)time_us_down_ * 5 * speed) / 14000);
    return true;
  }

  SimpleColor getColor(int led) {
    if (num_leds_ <= 0) {
      return SimpleColor(Color16());
    }
    int pos = smoke_mask_detail::BladePos32768(led, num_leds_);
    uint32_t mix = smoke_mask_detail::RollFlowMix(
        pos, scroll_up_, scroll_down_, time_us_, time_us_down_);
    SimpleColor c;
    c.c = c1_.getColor(led).c.mix(c2_.getColor(led).c, mix);
    return c;
  }

private:
  COLOR1 c1_;
  COLOR2 c2_;
  PONUA SVFWrapper<ROLL_SPEED> roll_speed_;
  int num_leds_ = 0;
  int scroll_up_ = 0;
  int scroll_down_ = 0;
  uint32_t time_us_ = 0;
  uint32_t time_us_down_ = 0;
};

template<class COLOR1, class COLOR2, int DELAY=0, int SPEED=2, int BASE=0, int RAND=2000, int COOLING=5>
using StaticFireReverse = StyleFireReverse<COLOR1, COLOR2, DELAY, SPEED,
                FireConfig<BASE, RAND, COOLING>,
                FireConfig<BASE, RAND, COOLING>,
                FireConfig<BASE, RAND, COOLING>,
                FireConfig<BASE, RAND, COOLING>>;

#endif  // STYLES_SMOKE_MASK_H
