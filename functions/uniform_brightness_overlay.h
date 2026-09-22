#ifndef FUNCTIONS_UNIFORM_BRIGHTNESS_OVERLAY_H
#define FUNCTIONS_UNIFORM_BRIGHTNESS_OVERLAY_H

// Shared uniform whole-blade brightness modulation for config texture layers.
//
// Wave generators produce a 0–32768 "wave" (center 16384 = nominal brightness).
// UniformBrightnessOverlayF maps wave +/- delta_percent into a mix value for
// Mix<F, Black, White> multiply overlays over layers below.
//
// Usage:
//   UniformBrightnessOverlayF<PulsingF<PULSE_MS>, DELTA_PERCENT>           — breathing pulse
//   UniformBrightnessOverlayF<RandomHoldWaveF<MIN_MS, MAX_MS>, DELTA_PERCENT> — random flicker

#include "../common/math.h"
#include "int.h"
#include "sin.h"
#include "svf.h"
#include "swing_speed.h"

class BladeBase;

constexpr int UNIFORM_BRIGHTNESS_MIX_CENTER = 32768;
constexpr int UNIFORM_BRIGHTNESS_WAVE_CENTER = 16384;

// Map wave (0–32768, center 16384) to mix (0–32768, center 32768) with +/- delta_percent.
inline int UniformBrightnessMix(int wave, int delta_percent) {
  if (delta_percent < 0) delta_percent = 0;
  if (delta_percent > 100) delta_percent = 100;
  int delta_val = UNIFORM_BRIGHTNESS_MIX_CENTER * delta_percent / 100;
  int centered = wave - UNIFORM_BRIGHTNESS_WAVE_CENTER;
  return clampi32(
      UNIFORM_BRIGHTNESS_MIX_CENTER + (centered * delta_val / UNIFORM_BRIGHTNESS_WAVE_CENTER),
      0,
      UNIFORM_BRIGHTNESS_MIX_CENTER);
}

// Base overlay function — delegates wave shape to WAVE_GENERATOR.
template<class WAVE_GENERATOR, class DELTA_PERCENT = Int<10>>
class UniformBrightnessOverlaySVF {
public:
  void run(BladeBase* blade) {
    wave_.run(blade);
    delta_.run(blade);
  }

  int calculate(BladeBase* blade) {
    return UniformBrightnessMix(wave_.calculate(blade), delta_.calculate(blade));
  }

private:
  PONUA SVFWrapper<WAVE_GENERATOR> wave_;
  PONUA SVFWrapper<DELTA_PERCENT> delta_;
};

template<class WAVE_GENERATOR, class DELTA_PERCENT = Int<10>>
using UniformBrightnessOverlayF =
    SingleValueAdapter<UniformBrightnessOverlaySVF<WAVE_GENERATOR, DELTA_PERCENT>>;

// Randomly holds wave at 0 or 32768 for a random duration in [MIN_MS, MAX_MS].
template<class MIN_MS, class MAX_MS>
class RandomHoldWaveSVF {
public:
  void run(BladeBase* blade) {
    min_ms_.run(blade);
    max_ms_.run(blade);
    uint32_t now = millis();
    if (!initialized_) {
      initialized_ = true;
      wave_ = UNIFORM_BRIGHTNESS_WAVE_CENTER;
      scheduleNext(now, blade);
      return;
    }
    if ((int32_t)(now - next_change_ms_) >= 0) {
      wave_ = random(2) ? UNIFORM_BRIGHTNESS_MIX_CENTER : 0;
      scheduleNext(now, blade);
    }
  }

  int calculate(BladeBase* blade) {
    return wave_;
  }

private:
  void scheduleNext(uint32_t now, BladeBase* blade) {
    int min_ms = min_ms_.calculate(blade);
    int max_ms = max_ms_.calculate(blade);
    if (min_ms < 1) min_ms = 1;
    if (max_ms < min_ms) max_ms = min_ms;
    int span = max_ms - min_ms;
    next_change_ms_ = now + min_ms + (span > 0 ? random(span + 1) : 0);
  }

  PONUA SVFWrapper<MIN_MS> min_ms_;
  PONUA SVFWrapper<MAX_MS> max_ms_;
  uint32_t next_change_ms_ = 0;
  int wave_ = UNIFORM_BRIGHTNESS_WAVE_CENTER;
  bool initialized_ = false;
};

template<class MIN_MS, class MAX_MS>
using RandomHoldWaveF = SingleValueAdapter<RandomHoldWaveSVF<MIN_MS, MAX_MS>>;

// Swing boost: idle = nominal (32768), full swing = 32768 + delta% (Mix extrapolates past white).
template<class THRESHOLD, class DELTA = Int<10>>
class SwingBoostOverlaySVF {
public:
  void run(BladeBase* blade) {
    speed_.run(blade);
    delta_.run(blade);
  }

  int calculate(BladeBase* blade) {
    int speed = speed_.calculate(blade);
    int delta = delta_.calculate(blade);
    if (delta < 0) delta = 0;
    if (delta > 100) delta = 100;
    int delta_val = UNIFORM_BRIGHTNESS_MIX_CENTER * delta / 100;
    return UNIFORM_BRIGHTNESS_MIX_CENTER + (speed * delta_val >> 15);
  }

private:
  PONUA SVFWrapper<SwingSpeedX<THRESHOLD>> speed_;
  PONUA SVFWrapper<DELTA> delta_;
};

template<class THRESHOLD, class DELTA = Int<10>>
using SwingBoostOverlayF = SingleValueAdapter<SwingBoostOverlaySVF<THRESHOLD, DELTA>>;

#endif
