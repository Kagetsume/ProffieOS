#ifndef STYLES_PROCEDURAL_RUNTIME_H
#define STYLES_PROCEDURAL_RUNTIME_H

// Runtime implementation for pulse_train, chirp, smoothstep_bands, value_noise,
// fbm_noise, moire_mask, blade_envelope named styles.

#include <stdlib.h>
#include "../common/arg_parser.h"
#include "../common/math.h"
#include "../common/opacity_scale.h"
#include "../common/sin_table.h"
#include "blade_style.h"
#include "style_ptr.h"

enum ProceduralKind {
  PROC_PULSE_TRAIN = 0,
  PROC_CHIRP,
  PROC_SMOOTHSTEP_BANDS,
  PROC_VALUE_NOISE,
  PROC_FBM_NOISE,
  PROC_MOIRE_MASK,
  PROC_BLADE_ENVELOPE,
};

inline int ProceduralMaxArg(ProceduralKind kind) {
  return kind == PROC_MOIRE_MASK ? 6 : 5;
}

inline bool ProceduralArgUsesBrightnessScale(ProceduralKind kind, int arg_num) {
  switch (kind) {
    case PROC_PULSE_TRAIN:
    case PROC_CHIRP:
    case PROC_SMOOTHSTEP_BANDS:
    case PROC_VALUE_NOISE:
      return arg_num == 3 || arg_num == 4;
    case PROC_FBM_NOISE:
      return arg_num >= 3 && arg_num <= 5;
    case PROC_MOIRE_MASK:
      return arg_num == 5 || arg_num == 6;
    case PROC_BLADE_ENVELOPE:
      return arg_num == 3 || arg_num == 4;
    default:
      return false;
  }
}

inline bool ProceduralArgUsesOpacityScale(ProceduralKind kind, int arg_num) {
  if (kind == PROC_PULSE_TRAIN && arg_num == 5) return true;
  if (kind == PROC_BLADE_ENVELOPE && arg_num == 1) return true;
  return false;
}

inline int ProceduralDefaultArg(ProceduralKind kind, int arg_num) {
  switch (kind) {
    case PROC_PULSE_TRAIN:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return -2000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 16384;
        default: return 0;
      }
    case PROC_CHIRP:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return -2000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 64;
        default: return 0;
      }
    case PROC_SMOOTHSTEP_BANDS:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return -2000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 400;
        default: return 0;
      }
    case PROC_VALUE_NOISE:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return -2000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 0;
        default: return 0;
      }
    case PROC_FBM_NOISE:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return -2000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 65535;
        default: return 0;
      }
    case PROC_MOIRE_MASK:
      switch (arg_num) {
        case 1: return 2400;
        case 2: return 2450;
        case 3: return -2000;
        case 4: return 2100;
        case 5: return 0;
        case 6: return 65535;
        default: return 0;
      }
    case PROC_BLADE_ENVELOPE:
      switch (arg_num) {
        case 1: return 16384;
        case 2: return 6000;
        case 3: return 0;
        case 4: return 65535;
        case 5: return 0;
        default: return 0;
      }
    default:
      return 0;
  }
}

inline int ProceduralParseArg(ProceduralKind kind, int arg_num) {
  int def = ProceduralDefaultArg(kind, arg_num);
  char default_value[16];
  itoa(def, default_value, 10);
  if (!CurrentArgParser) return def;
  const char* arg = CurrentArgParser->GetArg(arg_num, "INT", default_value);
  if (!arg || !arg[0]) return def;
  if (ProceduralArgUsesBrightnessScale(kind, arg_num)) {
    if (OpacityScaleTokenParses(arg)) return ParseBrightness65535Token(arg);
    return def;
  }
  if (ProceduralArgUsesOpacityScale(kind, arg_num)) {
    if (OpacityScaleTokenParses(arg)) return ParseOpacityScaleToken(arg);
    return def;
  }
  return (int)strtol(arg, NULL, 0);
}

inline void ProceduralFillDefaults(ProceduralKind kind, int values[6]) {
  for (int a = 1; a <= 6; a++) values[a - 1] = ProceduralDefaultArg(kind, a);
}

namespace procedural_runtime_detail {

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

inline int SmoothstepUnit(int x) {
  if (x <= 0) return 0;
  if (x >= 32768) return 32768;
  return (((x * x) >> 14) * ((3 << 14) - x)) >> 15;
}

inline bool SquareHigh(int phase, int wavelength, int duty) {
  if (wavelength <= 0) wavelength = 1;
  int64_t p = phase;
  while (p < 0) p += wavelength;
  while (p >= wavelength) p -= wavelength;
  if (duty <= 0) return false;
  if (duty >= 32768) return true;
  int threshold = (int)((int64_t)wavelength * duty / 32768);
  if (threshold <= 0) return false;
  if (threshold >= wavelength) return true;
  return (int)p < threshold;
}

inline int LocalChirpPeriod(int period_base, int led, int chirp_rate) {
  int64_t p = period_base + ((int64_t)led * chirp_rate >> 8);
  if (p < 64) p = 64;
  if (p > 65535) p = 65535;
  return (int)p;
}

inline int Hash32(int x) {
  x ^= x >> 16;
  x *= 0x45d9f3b;
  x ^= x >> 16;
  return x;
}

inline int HashUnit(int x) { return (Hash32(x) & 0xffff); }

inline int NoiseAt(int coord, int scale, int seed) {
  if (scale < 32) scale = 32;
  int cell = coord / scale;
  int frac = coord - cell * scale;
  int t = SmoothstepUnit(frac * 32768 / scale);
  int a = HashUnit(cell * 7919 + seed);
  int b = HashUnit((cell + 1) * 7919 + seed);
  return a + ((b - a) * t >> 15);
}

inline int FbmAt(int coord, int scale, int seed) {
  if (scale < 32) scale = 32;
  int v = 0;
  int den = 0;
  int s = scale;
  for (int o = 0; o < 3; o++) {
    int w = 4 >> o;
    v += NoiseAt(coord, s, seed + o * 101) * w;
    den += w;
    s >>= 1;
    if (s < 32) s = 32;
  }
  if (den <= 0) return 32768;
  return v / den;
}

inline uint32_t RampFactor(int coord, int period) {
  if (period <= 0) return 65535;
  int64_t p = coord;
  while (p < 0) p += period;
  while (p >= period) p -= period;
  return (uint32_t)((p * 65535) / period);
}

inline SimpleColor GrayFactor(uint32_t f) {
  uint16_t g = (uint16_t)f;
  SimpleColor ret;
  ret.c = Color16(g, g, g);
  return ret;
}

inline void ClampMinMax(int& min_run, int& max_run) {
  if (min_run < 0) min_run = 0;
  if (max_run < 0) max_run = 0;
  if (min_run > 65535) min_run = 65535;
  if (max_run > 65535) max_run = 65535;
}

}  // namespace procedural_runtime_detail

class ProceduralRuntime {
public:
  ProceduralRuntime() = default;

  void InitFromParser(ProceduralKind kind) {
    kind_ = kind;
    int values[6];
    int max_arg = ProceduralMaxArg(kind);
    for (int a = 1; a <= max_arg; a++) values[a - 1] = ProceduralParseArg(kind, a);
    for (int a = max_arg + 1; a <= 6; a++) values[a - 1] = ProceduralDefaultArg(kind, a);
    ApplyValues(values);
  }

  void InitFromValues(ProceduralKind kind, const int values[6]) {
    kind_ = kind;
    ApplyValues(values);
  }

  void run(BladeBase* base) {
    switch (kind_) {
      case PROC_PULSE_TRAIN:
        runPulseTrain();
        break;
      case PROC_CHIRP:
        runChirp();
        break;
      case PROC_SMOOTHSTEP_BANDS:
        runSmoothstepBands();
        break;
      case PROC_VALUE_NOISE:
        runValueNoise();
        break;
      case PROC_FBM_NOISE:
        runFbmNoise();
        break;
      case PROC_MOIRE_MASK:
        runMoireMask();
        break;
      case PROC_BLADE_ENVELOPE:
        runBladeEnvelope(base);
        break;
      default:
        break;
    }
  }

  SimpleColor getColor(int led) {
    switch (kind_) {
      case PROC_PULSE_TRAIN: return getColorPulseTrain(led);
      case PROC_CHIRP: return getColorChirp(led);
      case PROC_SMOOTHSTEP_BANDS: return getColorSmoothstepBands(led);
      case PROC_VALUE_NOISE: return getColorValueNoise(led);
      case PROC_FBM_NOISE: return getColorFbmNoise(led);
      case PROC_MOIRE_MASK: return getColorMoireMask(led);
      case PROC_BLADE_ENVELOPE: return getColorBladeEnvelope(led);
      default:
        return procedural_runtime_detail::GrayFactor(65535);
    }
  }

  int maxUsedArg() const { return ProceduralMaxArg(kind_); }

private:
  void ApplyValues(const int values[6]) {
    a1_ = values[0];
    a2_ = values[1];
    a3_ = values[2];
    a4_ = values[3];
    a5_ = values[4];
    a6_ = values[5];
    last_period_ = -1;
    last_scale_ = -1;
    last_p1_ = -1;
    last_p2_ = -1;
  }

  void runPulseTrain() {
    period_run_ = a1_;
    min_run_ = a3_;
    max_run_ = a4_;
    duty_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
    if (duty_run_ < 0) duty_run_ = 0;
    if (duty_run_ > 32768) duty_run_ = 32768;
    if (period_run_ <= 0) return;
    if (period_run_ != last_period_) {
      last_period_ = period_run_;
      mult_ = (50000u * 1024u / (unsigned)period_run_);
    }
    scrollScroll(a2_, period_run_);
  }

  SimpleColor getColorPulseTrain(int led) {
    uint32_t f = 65535;
    if (period_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      bool on = procedural_runtime_detail::SquareHigh(p, period_run_, duty_run_);
      f = on ? (uint32_t)max_run_ : (uint32_t)min_run_;
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runChirp() {
    period_run_ = a1_;
    min_run_ = a3_;
    max_run_ = a4_;
    chirp_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
    if (period_run_ <= 0) return;
    scrollScroll(a2_, period_run_);
  }

  SimpleColor getColorChirp(int led) {
    uint32_t f = 65535;
    if (period_run_ > 0) {
      int local_period = procedural_runtime_detail::LocalChirpPeriod(period_run_, led, chirp_run_);
      uint32_t mult_led = (50000u * 1024u / (unsigned)local_period);
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_led) >> 10);
      int sin = procedural_runtime_detail::SinAtPhaseInterpolated(p, local_period);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)(sin + 32768) * (max_run_ - min_run_) >> 16),
          0,
          65535);
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runSmoothstepBands() {
    period_run_ = a1_;
    min_run_ = a3_;
    max_run_ = a4_;
    edge_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
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
    scrollScroll(a2_, period_run_);
  }

  SimpleColor getColorSmoothstepBands(int led) {
    uint32_t f = 65535;
    if (period_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      int64_t q = p;
      while (q < 0) q += period_run_;
      while (q >= period_run_) q -= period_run_;
      int pos = (int)q;
      int edge = edge_clamp_;
      int rise = procedural_runtime_detail::SmoothstepUnit(pos * 32768 / edge);
      int fall_pos = period_run_ - pos;
      int fall = procedural_runtime_detail::SmoothstepUnit(fall_pos * 32768 / edge);
      int bump = rise;
      if (fall < bump) bump = fall;
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)bump * (max_run_ - min_run_) >> 15),
          0,
          65535);
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runValueNoise() {
    scale_run_ = a1_;
    min_run_ = a3_;
    max_run_ = a4_;
    seed_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
    if (scale_run_ <= 0) return;
    if (scale_run_ != last_scale_) {
      last_scale_ = scale_run_;
      mult_ = (50000u * 1024u / (unsigned)scale_run_);
    }
    scrollScrollNoise(a2_, scale_run_);
  }

  SimpleColor getColorValueNoise(int led) {
    uint32_t f = 65535;
    if (scale_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      int n = procedural_runtime_detail::NoiseAt(p, scale_run_, seed_run_);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)n * (max_run_ - min_run_) >> 16),
          0,
          65535);
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runFbmNoise() {
    scale_run_ = a1_;
    min_run_ = a3_;
    max_run_ = a4_;
    strength_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
    if (scale_run_ <= 0) return;
    if (scale_run_ != last_scale_) {
      last_scale_ = scale_run_;
      mult_ = (50000u * 1024u / (unsigned)scale_run_);
    }
    scrollScrollNoise(a2_, scale_run_);
  }

  SimpleColor getColorFbmNoise(int led) {
    uint32_t f = 65535;
    if (scale_run_ > 0) {
      int p = (int)(((int64_t)m_ + (int64_t)led * (int64_t)mult_) >> 10);
      int n = procedural_runtime_detail::FbmAt(p, scale_run_, 0);
      f = (uint32_t)clampi32(
          min_run_ + (int)((int64_t)n * (max_run_ - min_run_) >> 16),
          0,
          65535);
      if (strength_run_ < 65535) {
        if (strength_run_ <= 0) f = 65535;
        else f = 65535 - (uint32_t)((65535 - f) * (uint32_t)strength_run_ / 65535);
      }
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runMoireMask() {
    p1_run_ = a1_;
    p2_run_ = a2_;
    min_run_ = a5_;
    max_run_ = a6_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
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
      int32_t wrap = (int32_t)p1_run_ * 1024;
      if (wrap < 1024) wrap = 1024;
      m1_ = MOD(m1_ + delta_micros * a3_ / 333, wrap);
    }
    if (p2_run_ > 0) {
      int32_t wrap = (int32_t)p2_run_ * 1024;
      if (wrap < 1024) wrap = 1024;
      m2_ = MOD(m2_ + delta_micros * a4_ / 333, wrap);
    }
  }

  SimpleColor getColorMoireMask(int led) {
    uint32_t f = 65535;
    if (p1_run_ > 0 || p2_run_ > 0) {
      uint32_t r1 = procedural_runtime_detail::RampFactor(
          (int)(((int64_t)m1_ + (int64_t)led * (int64_t)mult1_) >> 10), p1_run_);
      uint32_t r2 = procedural_runtime_detail::RampFactor(
          (int)(((int64_t)m2_ + (int64_t)led * (int64_t)mult2_) >> 10), p2_run_);
      uint32_t beat = (r1 * r2) / 65535;
      f = min_run_ + (uint32_t)((uint64_t)(max_run_ - min_run_) * beat / 65535);
    }
    return procedural_runtime_detail::GrayFactor(f);
  }

  void runBladeEnvelope(BladeBase* base) {
    center_run_ = a1_;
    width_run_ = a2_;
    min_run_ = a3_;
    max_run_ = a4_;
    speed_run_ = a5_;
    procedural_runtime_detail::ClampMinMax(min_run_, max_run_);
    if (width_run_ <= 0) width_run_ = 4096;
    num_leds_ = base->num_leds();
    if (num_leds_ <= 0) num_leds_ = 1;
    if (speed_run_ != 0) {
      uint32_t now_micros = micros();
      int32_t delta_micros = now_micros - last_micros_;
      last_micros_ = now_micros;
      m_ = MOD(m_ + delta_micros * speed_run_ / 333, 32768 * 1024);
    }
  }

  SimpleColor getColorBladeEnvelope(int led) {
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
    int bump = procedural_runtime_detail::SmoothstepUnit(t);
    uint32_t f = (uint32_t)clampi32(
        min_run_ + (int)((int64_t)bump * (max_run_ - min_run_) >> 15),
        0,
        65535);
    return procedural_runtime_detail::GrayFactor(f);
  }

  void scrollScroll(int speed, int period) {
    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;
    int32_t wrap = (int32_t)period * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed / 333, wrap);
  }

  void scrollScrollNoise(int speed, int scale) {
    uint32_t now_micros = micros();
    int32_t delta_micros = now_micros - last_micros_;
    last_micros_ = now_micros;
    int32_t wrap = (int32_t)scale * 64 * 1024;
    if (wrap < 1024) wrap = 1024;
    m_ = MOD(m_ + delta_micros * speed / 333, wrap);
  }

  ProceduralKind kind_ = PROC_PULSE_TRAIN;
  int a1_ = 0, a2_ = 0, a3_ = 0, a4_ = 65535, a5_ = 0, a6_ = 65535;

  int period_run_ = 0;
  int scale_run_ = 0;
  int min_run_ = 0;
  int max_run_ = 65535;
  int duty_run_ = 16384;
  int chirp_run_ = 0;
  int edge_run_ = 400;
  int edge_clamp_ = 400;
  int seed_run_ = 0;
  int strength_run_ = 65535;
  int p1_run_ = 0;
  int p2_run_ = 0;
  int center_run_ = 16384;
  int width_run_ = 4096;
  int speed_run_ = 0;
  int num_leds_ = 1;

  int last_period_ = -1;
  int last_scale_ = -1;
  int last_p1_ = -1;
  int last_p2_ = -1;
  uint32_t mult_ = 0;
  uint32_t mult1_ = 0;
  uint32_t mult2_ = 0;
  uint32_t last_micros_ = 0;
  int32_t m_ = 0;
  int32_t m1_ = 0;
  int32_t m2_ = 0;
};

class ProceduralBladeStyle : public Style<ProceduralRuntime> {
public:
  ProceduralBladeStyle() = default;
  explicit ProceduralBladeStyle(ProceduralKind kind) { base_.InitFromParser(kind); }

  void InitFromValues(ProceduralKind kind, const int values[6]) { base_.InitFromValues(kind, values); }

  int get_max_arg(int argument) override {
    if (argument < 1 || argument > base_.maxUsedArg()) return -1;
    return 65535;
  }
};

class ProceduralStyleFactory : public StyleFactory {
public:
  explicit ProceduralStyleFactory(ProceduralKind kind) : kind_(kind) {}
  BladeStyle* make() override { return new ProceduralBladeStyle(kind_); }

private:
  ProceduralKind kind_;
};

static ProceduralStyleFactory procedural_pulse_train_factory(PROC_PULSE_TRAIN);
static ProceduralStyleFactory procedural_chirp_factory(PROC_CHIRP);
static ProceduralStyleFactory procedural_smoothstep_bands_factory(PROC_SMOOTHSTEP_BANDS);
static ProceduralStyleFactory procedural_value_noise_factory(PROC_VALUE_NOISE);
static ProceduralStyleFactory procedural_fbm_noise_factory(PROC_FBM_NOISE);
static ProceduralStyleFactory procedural_moire_mask_factory(PROC_MOIRE_MASK);
static ProceduralStyleFactory procedural_blade_envelope_factory(PROC_BLADE_ENVELOPE);

#endif  // STYLES_PROCEDURAL_RUNTIME_H
