#ifndef STYLES_WAVES_RUNTIME_H
#define STYLES_WAVES_RUNTIME_H

// Runtime implementation for sine_waves, saw_waves, hue_waves, sine_waves_swing named styles.
// Wave kind is selected by StyleFactory; args 1–23 share one parser and one slot engine.

#include <stdlib.h>
#include "../../common/arg_parser.h"
#include "../../functions/svf.h"
#include "../../common/math.h"
#include "../../common/opacity_scale.h"
#include "../../common/sin_table.h"
#include "../../functions/swing_speed.h"
#include "../../functions/twist_angle.h"
#include "../blade_style.h"
#include "../style_ptr.h"

enum WaveKind {
  WAVES_SINE = 0,
  WAVES_SAW,
  WAVES_HUE,
  WAVES_SINE_SWING,
};

enum WaveWaveform {
  WAVE_SIN = 0,
  WAVE_TRI,
};

inline bool WaveArgUsesBrightnessScale(WaveKind kind, int arg_num) {
  if (kind == WAVES_HUE) return false;
  if (arg_num == 21) return true;
  int slot = (arg_num - 1) / 5;
  if (slot < 0 || slot > 3) return false;
  int off = (arg_num - 1) % 5;
  return off == 2 || off == 3;
}

inline int WaveDefaultArg(WaveKind kind, int arg_num) {
  switch (arg_num) {
    case 1: return 2400;
    case 2: return 0;
    case 3: return 0;
    case 4: return (kind == WAVES_HUE) ? 8192 : 65535;
    case 5: return -2000;
    case 21: return 65535;
    case 22: return 0;
    case 23: return 0;
    default:
      break;
  }
  int slot = (arg_num - 1) / 5;
  if (slot >= 1 && slot <= 3) {
    int off = (arg_num - 1) % 5;
    switch (off) {
      case 0: return 0;
      case 1: return 0;
      case 2: return 0;
      case 3: return (kind == WAVES_HUE) ? 8192 : 65535;
      case 4: return 0;
    }
  }
  return 0;
}

inline int WaveParseArg(WaveKind kind, int arg_num) {
  int def = WaveDefaultArg(kind, arg_num);
  char default_value[16];
  itoa(def, default_value, 10);
  if (!CurrentArgParser) return def;
  const char* arg = CurrentArgParser->GetArg(arg_num, "INT", default_value);
  if (!arg || !arg[0]) return def;
  if (WaveArgUsesBrightnessScale(kind, arg_num)) {
    if (OpacityScaleTokenParses(arg)) return ParseBrightness65535Token(arg);
    return def;
  }
  return (int)strtol(arg, NULL, 0);
}

inline int WaveMaxArg(WaveKind kind) {
  return kind == WAVES_SINE_SWING ? 23 : 21;
}

inline void WaveFillDefaults(WaveKind kind, int values[23]) {
  for (int a = 1; a <= 23; a++) values[a - 1] = WaveDefaultArg(kind, a);
}

namespace waves_runtime_detail {

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

inline int TriAtPhase(int phase, int wavelength) {
  if (wavelength <= 0) wavelength = 1;
  int64_t p = phase;
  while (p < 0) p += wavelength;
  while (p >= wavelength) p -= wavelength;
  int half = wavelength >> 1;
  if (half <= 0) half = 1;
  int64_t v;
  if (p < half) {
    v = (p * 65536 / half) - 32768;
  } else {
    int tail = wavelength - half;
    if (tail <= 0) tail = 1;
    v = 32768 - ((p - half) * 65536 / tail);
  }
  return (int)v;
}

inline uint32_t ApplyBrightnessStrength(uint32_t factor, int strength) {
  if (strength >= 65535) return factor;
  if (strength <= 0) return 65535;
  return 65535 - (uint32_t)((65535 - factor) * (uint32_t)strength / 65535);
}

inline int ApplyHueStrength(int offset, int strength) {
  if (strength >= 65535) return offset;
  if (strength <= 0) return 0;
  return (int)((int64_t)offset * strength / 65535);
}

inline int EffectiveSwingPeriod(int period, int swing, int twist, int swing_scale, int twist_scale) {
  if (period <= 0) return period;
  if (swing_scale == 0 && twist_scale == 0) return period;
  int motion = (swing_scale * swing >> 15) + (twist_scale * twist >> 15);
  if (motion < 0) motion = 0;
  int eff = period * 32768 / (32768 + motion);
  if (eff < 200) eff = 200;
  return eff;
}

class WaveSlotRuntime {
public:
  void Configure(int period, int phase, int min_v, int max_v, int speed, WaveWaveform wf) {
    period_cfg_ = period;
    phase_cfg_ = phase;
    min_cfg_ = min_v;
    max_cfg_ = max_v;
    speed_cfg_ = speed;
    waveform_ = wf;
  }

  void BeginFrame(int swing, int twist, int swing_scale, int twist_scale, bool use_swing) {
    period_run_ = period_cfg_;
    phase_run_ = phase_cfg_;
    min_run_ = min_cfg_;
    max_run_ = max_cfg_;
    if (min_run_ < 0) min_run_ = 0;
    if (max_run_ < 0) max_run_ = 0;
    if (min_run_ > 65535) min_run_ = 65535;
    if (max_run_ > 65535) max_run_ = 65535;

    if (period_run_ <= 0) return;

    effective_period_ = use_swing
        ? EffectiveSwingPeriod(period_run_, swing, twist, swing_scale, twist_scale)
        : period_run_;

    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;

    int32_t wrap = (int32_t)effective_period_ * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed_cfg_ / 333, wrap);

    if (effective_period_ != last_effective_period_) {
      last_effective_period_ = effective_period_;
      mult_ = (50000u * 1024u / (unsigned)effective_period_);
    }
  }

  uint32_t brightnessFactorAt(int led) const {
    if (period_run_ <= 0) return 65535;
    int p = (int)(((int64_t)m_ + (int64_t)phase_run_ * 1024 + (int64_t)led * (int64_t)mult_) >> 10);
    int wave = waveform_ == WAVE_TRI
        ? TriAtPhase(p, effective_period_)
        : SinAtPhaseInterpolated(p, effective_period_);
    return (uint32_t)clampi32(
        min_run_ + (int)((int64_t)(wave + 32768) * (max_run_ - min_run_) >> 16),
        0,
        65535);
  }

  int hueOffsetAt(int led) const {
    if (period_run_ <= 0) return 0;
    int p = (int)(((int64_t)m_ + (int64_t)phase_run_ * 1024 + (int64_t)led * (int64_t)mult_) >> 10);
    int wave = SinAtPhaseInterpolated(p, effective_period_);
    return (int)clampi32(
        min_run_ + (int)((int64_t)(wave + 32768) * (max_run_ - min_run_) >> 16),
        0,
        65535);
  }

private:
  int period_cfg_ = 0;
  int phase_cfg_ = 0;
  int min_cfg_ = 0;
  int max_cfg_ = 65535;
  int speed_cfg_ = 0;
  WaveWaveform waveform_ = WAVE_SIN;
  int period_run_ = 0;
  int effective_period_ = 0;
  int phase_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int last_effective_period_ = -1;
  uint32_t mult_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
};

}  // namespace waves_runtime_detail

class WavesRuntime {
public:
  WavesRuntime() = default;

  void InitFromParser(WaveKind kind) {
    kind_ = kind;
    int values[23];
    int max_arg = WaveMaxArg(kind);
    for (int a = 1; a <= max_arg; a++) values[a - 1] = WaveParseArg(kind, a);
    for (int a = max_arg + 1; a <= 23; a++) values[a - 1] = WaveDefaultArg(kind, a);
    ApplyValues(values);
  }

  void InitFromValues(WaveKind kind, const int values[23]) {
    kind_ = kind;
    ApplyValues(values);
  }

  void run(BladeBase* base) {
    int swing = 0;
    int twist = 0;
    if (kind_ == WAVES_SINE_SWING) {
      swing_.run(base);
      twist_.run(base);
      swing = swing_.calculate(base);
      twist = twist_.calculate(base);
    }
    const bool use_swing = kind_ == WAVES_SINE_SWING;
    for (int i = 0; i < 4; i++) {
      slots_[i].BeginFrame(swing, twist, swing_scale_, twist_scale_, use_swing);
    }
  }

  SimpleColor getColor(int led) {
    if (kind_ == WAVES_HUE) {
      int offset = 0;
      for (int i = 0; i < 4; i++) offset += slots_[i].hueOffsetAt(led);
      offset = waves_runtime_detail::ApplyHueStrength(offset, strength_);
      if (offset < 0) offset = 0;
      SimpleColor ret;
      ret.c = Color16((uint16_t)(offset & 0x7fff), 0, 0);
      return ret;
    }
    uint32_t f = 65535;
    for (int i = 0; i < 4; i++) f = (f * slots_[i].brightnessFactorAt(led)) / 65535;
    f = waves_runtime_detail::ApplyBrightnessStrength(f, strength_);
    uint16_t g = (uint16_t)f;
    SimpleColor ret;
    ret.c = Color16(g, g, g);
    return ret;
  }

  WaveKind kind() const { return kind_; }
  int maxUsedArg() const { return WaveMaxArg(kind_); }

private:
  void ApplyValues(const int values[23]) {
    WaveWaveform wf = WAVE_SIN;
    if (kind_ == WAVES_SAW) wf = WAVE_TRI;
    for (int s = 0; s < 4; s++) {
      int base = s * 5;
      slots_[s].Configure(
          values[base + 0], values[base + 1], values[base + 2], values[base + 3], values[base + 4], wf);
    }
    strength_ = values[20];
    swing_scale_ = values[21];
    twist_scale_ = values[22];
  }

  WaveKind kind_ = WAVES_SINE;
  waves_runtime_detail::WaveSlotRuntime slots_[4];
  int strength_ = 65535;
  int swing_scale_ = 0;
  int twist_scale_ = 0;
  PONUA SVFWrapper<SwingSpeedX<Int<400>>> swing_;
  PONUA SVFWrapper<TwistAngle<2, 0>> twist_;
};

class WavesBladeStyle : public Style<WavesRuntime> {
public:
  WavesBladeStyle() = default;
  explicit WavesBladeStyle(WaveKind kind) { base_.InitFromParser(kind); }

  void InitFromValues(WaveKind kind, const int values[23]) { base_.InitFromValues(kind, values); }

  int get_max_arg(int argument) override {
    if (argument < 1 || argument > base_.maxUsedArg()) return -1;
    return 65535;
  }
};

class WavesStyleFactory : public StyleFactory {
public:
  explicit WavesStyleFactory(WaveKind kind) : kind_(kind) {}
  BladeStyle* make() override { return new WavesBladeStyle(kind_); }

private:
  WaveKind kind_;
};

static WavesStyleFactory waves_sine_factory(WAVES_SINE);
static WavesStyleFactory waves_saw_factory(WAVES_SAW);
static WavesStyleFactory waves_hue_factory(WAVES_HUE);
static WavesStyleFactory waves_sine_swing_factory(WAVES_SINE_SWING);

#endif  // STYLES_WAVES_RUNTIME_H
