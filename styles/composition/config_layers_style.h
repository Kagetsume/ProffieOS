#ifndef STYLES_CONFIG_LAYERS_STYLE_H
#define STYLES_CONFIG_LAYERS_STYLE_H

#include <stdint.h>

// Runtime blade style that composites multiple sub-styles (layers) in order.
// Used by the "config" style to build effects from config/blade_styles.ini.
// Each layer is drawn over the previous (same as compile-time Layers<>).

#include "../blade_style.h"
#include "../../common/color.h"
#include "../../common/looper.h"
#include "../../common/math.h"
#include "../../common/saber_base.h"
#include "../../blades/blade_base.h"
#include "strip_column_source.h"
#include <math.h>
#include <string.h>

#define CONFIG_LAYERS_MAX 16  // Fixed array size per style; increase uses more RAM
// Alpha scale for layer stacking: 0 = transparent, 32768 = full contribution (see AlphaL in alpha.h).
#define CONFIG_LAYER_ALPHA_OPAQUE 32768

// Per-layer blend when compositing onto layers below (straight RGB math, then normal alpha-over).
enum ConfigLayerBlend : uint8_t {
  CONFIG_LAYER_BLEND_NORMAL = 0,
  CONFIG_LAYER_BLEND_MULTIPLY = 1,
  CONFIG_LAYER_BLEND_SCREEN = 2,
  CONFIG_LAYER_BLEND_ADD = 3,
  // Rotate hue of the straight base color. Overlay red is a RotateColorsX offset
  // (0 = none, 32768 = 360 degrees): angle = (r & 0x7fff) * 3, same as RotateColorsX.
  CONFIG_LAYER_BLEND_HUE = 4,
};

// Combine premultiplied base with straight overlay color using blend mode, then alpha-over (same as <<).
// Fully transparent overlay must leave base unchanged: base << RGBA_um(alpha=0) still perturbs premultiplied
// alpha in operator<<(RGBA, RGBA_um) due to rounding, which can zero the stack so only effects (e.g. blast) show.
inline RGBA CompositeConfigLayer(RGBA base, RGBA_um over, ConfigLayerBlend blend_mode) {
  if (!over.alpha) return base;
  if (blend_mode == CONFIG_LAYER_BLEND_NORMAL) return base << over;
  // Hue rotate needs a visible base and a non-zero offset. Zero offset (or no base)
  // leaves the stack unchanged so a trough does not repaint or crush the color.
  if (blend_mode == CONFIG_LAYER_BLEND_HUE) {
    if (!base.alpha || !(over.c.r & 0x7fff)) return base;
  }
  // Multiply/screen/hue need a visible base; alpha-over on transparent stack paints masks as
  // solid texture (e.g. sine_waves grayscale) when strip_column BMP failed to open.
  if (!base.alpha) {
    if (blend_mode == CONFIG_LAYER_BLEND_MULTIPLY ||
        blend_mode == CONFIG_LAYER_BLEND_SCREEN ||
        blend_mode == CONFIG_LAYER_BLEND_HUE)
      return base;
    return base << over;
  }
  uint32_t ba = base.alpha;
  uint64_t br = ((uint64_t)base.c.r << 15) / ba;
  uint64_t bg = ((uint64_t)base.c.g << 15) / ba;
  uint64_t bb = ((uint64_t)base.c.b << 15) / ba;
  if (br > 65535) br = 65535;
  if (bg > 65535) bg = 65535;
  if (bb > 65535) bb = 65535;
  uint32_t orr = over.c.r;
  uint32_t ogg = over.c.g;
  uint32_t obb = over.c.b;
  uint32_t mr = 0, mg = 0, mb = 0;
  switch (blend_mode) {
    case CONFIG_LAYER_BLEND_MULTIPLY:
      mr = (uint32_t)((br * orr) >> 15);
      mg = (uint32_t)((bg * ogg) >> 15);
      mb = (uint32_t)((bb * obb) >> 15);
      break;
    case CONFIG_LAYER_BLEND_SCREEN:
      mr = (uint32_t)(br + orr - ((br * orr) >> 15));
      mg = (uint32_t)(bg + ogg - ((bg * ogg) >> 15));
      mb = (uint32_t)(bb + obb - ((bb * obb) >> 15));
      break;
    case CONFIG_LAYER_BLEND_ADD: {
      uint64_t tr = br + orr;
      uint64_t tg = bg + ogg;
      uint64_t tb = bb + obb;
      mr = (uint32_t)(tr > 65535 ? 65535 : tr);
      mg = (uint32_t)(tg > 65535 ? 65535 : tg);
      mb = (uint32_t)(tb > 65535 ? 65535 : tb);
      break;
    }
    case CONFIG_LAYER_BLEND_HUE: {
      // Same angle formula as RotateColorsX in styles/rotate_color.h.
      int angle = (int)((over.c.r & 0x7fff) * 3);
      Color16 rotated = Color16((uint16_t)br, (uint16_t)bg, (uint16_t)bb).rotate(angle);
      mr = rotated.r;
      mg = rotated.g;
      mb = rotated.b;
      break;
    }
    default:
      return base << over;
  }
  RGBA_um blended(Color16((uint16_t)mr, (uint16_t)mg, (uint16_t)mb), over.overdrive, over.alpha);
  return base << blended;
}

// Fallback when the base style has no extend/retract args (fire, cycle, …).
// Clip normal/add overlays to lit pixels on layer 0. Multiply/screen are left alone.
// Bases that do have extend/retract use ConfigExtensionMask instead of this clip.
inline uint16_t OverlayClipFactorFromBase(RGBA_um base) {
  if (!base.alpha) return 0;
  if (!(base.c.r | base.c.g | base.c.b)) return 0;
  return CONFIG_LAYER_ALPHA_OPAQUE;
}

// How the base layer wipes. LINEAR matches InOutHelperX / InOutFuncAuto.
// BEND matches InOutTrBendAuto (BendTimePow). SPARK matches InOutSparkTipX's black edge.
// SPARKTIP is that bend wipe plus a four-LED spark on the moving edge, extend and retract.
// SPLIT opens a gap at the middle on retract (edges run out to hilt and tip).
// SPLIT_SPARK is that same gap with the spark band on both edges.
// EXPLODE keeps a lit center band: it grows out to both ends, then shrinks back in.
// EXPLODE_SPARK is that band with a spark on both edges.
// SPUTTER fades random pixels in over the extend. Retract plays that pattern backward.
enum ConfigInOutCurve : uint8_t {
  CONFIG_INOUT_NONE = 0,
  CONFIG_INOUT_LINEAR = 1,
  CONFIG_INOUT_BEND = 2,
  CONFIG_INOUT_SPARK = 3,
  CONFIG_INOUT_SPARKTIP = 4,
  CONFIG_INOUT_SPLIT = 5,
  CONFIG_INOUT_SPLIT_SPARK = 6,
  CONFIG_INOUT_EXPLODE = 7,
  CONFIG_INOUT_EXPLODE_SPARK = 8,
  CONFIG_INOUT_SPUTTER = 9,
  CONFIG_INOUT_BMP = 10,
};

// One wipe for the whole stack. Extend and retract are separate phases.
// `transition = bend|linear|spark|sparktip|split|explode|sputter|bmp ext ret ...`
// sets both. `transition_in` / `transition_out` override one phase:
// `behavior <ms> [spark] [color] [hilt|tip]`.
// tip (default) retracts tip→hilt. hilt mirrors that wipe so retract runs hilt→tip.
// split on the way in grows a lit center band out to hilt and tip.
// split on the way out opens a dark gap at the middle and both edges run outward.
// explode uses that same center band both ways: out to the ends, then back in until dark.
// sputter reveals random pixels over the extend. Retract hides them in reverse order.
// bmp scrubs a column file: row 0 → last row on extend, last row → 0 on retract.
// White in the file is lit. Black is covered. `spark` lights split and explode edges.
// When no line is set, the first base that has extend/retract supplies both phases.
// solid and solid_bend are colors; their default curve is bend.
// Painted after every inside layer and before preon, postoff,
// ignition_flash, and sparktip_layer. Textures do not carry their own InOut.
// Bend exponent matches BendInOutPower = Mult<Int<10992>, Int<98304>>.
// When the wipe has finished and the blade is off, ready_to_power_off() is
// the signal that the driver may cut power.

// Scrubs a column BMP as the wipe opacity. Progress 0 is row 0, progress 1 is the last row.
// The linear clock already runs backward on retract, so the file plays in reverse.
class ConfigBmpWipe {
public:
  void Release() { source_.SetPlaybackHold(false); ready_ = false; }
  bool ready() const { return ready_; }

  void Scrub(BladeBase* blade, const char* path, int source_height, int progress) {
    ready_ = false;
    if (!blade || !path || !path[0]) {
      Release();
      return;
    }
    source_.UsePath(path);
    int leds = blade->num_leds();
    if (leds < 1) return;
    int sh = source_height > 0 ? source_height : leds;
    static const StripColumnOpenOptions kOpts = {"transition_bmp"};
    source_.SetPlaybackHold(true);
    if (!source_.EnsureOpen(kOpts, sh, blade)) return;
    uint32_t n = source_.NumFrames();
    if (n < 1) return;
    if (progress < 0) progress = 0;
    if (progress > 32768) progress = 32768;
    uint32_t frame = (uint32_t)(((uint32_t)progress * (n - 1u)) / 32768u);
    int load_h = source_.LoadedSourceHeight();
    if (load_h < 1) load_h = sh;
    if (!source_.SeekFrame(kOpts, load_h, frame, blade)) return;
    num_leds_ = leds;
    source_height_ = load_h;
    ready_ = true;
  }

  uint16_t Cover(int led) const {
    if (!ready_ || num_leds_ <= 0 || source_height_ <= 0) return 0;
    const uint8_t* data = source_.CurrentFrameData();
    if (!data) return 0;
    int row_low = 0;
    int frac15 = 0;
    StripColumnMapLed(led, num_leds_, source_height_, &row_low, &frac15);
    int idx0 = row_low * 3;
    if (idx0 + 2 >= source_height_ * 3) return 32768;
    int g = GrayAt(data + idx0);
    if (frac15 != 0 && row_low < source_height_ - 1) {
      int g1 = GrayAt(data + idx0 + 3);
      g = g + (((g1 - g) * frac15) >> 15);
    }
    if (g < 0) g = 0;
    if (g > 255) g = 255;
    return (uint16_t)(((255 - g) * 32768) / 255);
  }

private:
  static int GrayAt(const uint8_t* p) {
    return ((int)p[0] + (int)p[1] + (int)p[2]) / 3;
  }
  StripColumnFrameSource source_;
  int num_leds_ = 0;
  int source_height_ = 0;
  bool ready_ = false;
};

class ConfigExtensionMask {
public:
  ~ConfigExtensionMask() { delete bmp_; }

  void configure(uint8_t curve, int extend_ms, int retract_ms,
                 Color16 spark = Color16(65535, 65535, 65535),
                 bool from_hilt = false) {
    configurePhases(curve, extend_ms, spark, from_hilt, curve, retract_ms, spark, from_hilt);
  }

  void configurePhases(uint8_t in_curve, int extend_ms, Color16 in_spark, bool in_from_hilt,
                       uint8_t out_curve, int retract_ms, Color16 out_spark, bool out_from_hilt,
                       const char* in_bmp = nullptr, int in_bmp_h = 0,
                       const char* out_bmp = nullptr, int out_bmp_h = 0) {
    in_curve_ = in_curve;
    out_curve_ = out_curve;
    extend_ms_ = extend_ms;
    retract_ms_ = retract_ms;
    in_spark_ = in_spark;
    out_spark_ = out_spark;
    in_from_hilt_ = in_from_hilt;
    out_from_hilt_ = out_from_hilt;
    CopyBmpPath(in_bmp_path_, in_bmp);
    CopyBmpPath(out_bmp_path_, out_bmp);
    in_bmp_height_ = in_bmp_h;
    out_bmp_height_ = out_bmp_h;
    bool want = (in_curve_ == CONFIG_INOUT_BMP && in_bmp_path_[0]) ||
                (out_curve_ == CONFIG_INOUT_BMP && out_bmp_path_[0]);
    if (want && !bmp_) bmp_ = new ConfigBmpWipe();
    if (!want && bmp_) {
      delete bmp_;
      bmp_ = nullptr;
    }
  }
  bool active() const {
    return in_curve_ != CONFIG_INOUT_NONE || out_curve_ != CONFIG_INOUT_NONE;
  }
  // True once the blade is off and this wipe has finished. ConfigLayersStyle
  // forwards that as allow_disable. Preon/postoff still block it.
  bool ready_to_power_off() const { return active() && power_off_ready_; }

  void run(BladeBase* blade) {
    if (!active() || !blade) {
      power_off_ready_ = false;
      return;
    }
    PollWav(blade);
    const int out_ms = ResolveMs(extend_ms_, ign_ms_);
    const int in_ms = ResolveMs(retract_ms_, ret_ms_);
    const bool want_lin = UsesLinear(in_curve_) || UsesLinear(out_curve_);
    const bool want_bend = UsesBendClock(in_curve_) || UsesBendClock(out_curve_);
    if (want_lin) {
      RunLinear(blade, out_ms, in_ms);
      num_leds_ = blade->num_leds();
    }
    if (want_bend) RunBend(blade, out_ms, in_ms);
    else on_ = blade->is_on();
    RunBmp(blade);
    const bool blade_on = blade->is_on();
    if (out_curve_ == CONFIG_INOUT_NONE) {
      power_off_ready_ = !blade_on;
    } else if (UsesLinear(out_curve_)) {
      power_off_ready_ = !blade_on && extension_ <= 0.0f;
    } else if (NestBend()) {
      power_off_ready_ = !on_ && !out_active_ && !in_active_;
    } else {
      power_off_ready_ = !blade_on && !in_active_;
    }
  }

  // 0 = full spark, 255 = blade color, 256 = no spark on this LED.
  // Four LEDs of spark on the lit side of the moving edge, then a one-LED fade.
  // Extend and retract both carry it. The hilt token mirrors the edge, so a hilt
  // retract walks the spark from hilt to tip.
  int SparkMix8(int led) const {
    uint8_t curve = PhaseCurve();
    if (curve == CONFIG_INOUT_SPLIT_SPARK) return SplitSparkMix(MapLed(led));
    if (curve == CONFIG_INOUT_EXPLODE_SPARK) return ExplodeSparkMix(MapLed(led));
    if (curve != CONFIG_INOUT_SPARKTIP) return 256;
    int edge = -1;
    if (on_ && out_active_) edge = (int)out_fade_;
    else if (!on_ && in_active_) edge = (int)in_fade_start_;
    if (edge < 0) return 256;
    return BandMix(edge, MapLed(led) << 8, true);
  }

  // Straight-color mix of spark over a premultiplied stack pixel.
  RGBA ApplySpark(RGBA base, int led) const {
    int mix = SparkMix8(led);
    if (mix >= 256) return base;
    uint32_t br = 0, bg = 0, bb = 0, ba = 0;
    if (base.alpha) {
      ba = base.alpha;
      br = (uint32_t)base.c.r * 32768u / ba;
      bg = (uint32_t)base.c.g * 32768u / ba;
      bb = (uint32_t)base.c.b * 32768u / ba;
      if (br > 65535) br = 65535;
      if (bg > 65535) bg = 65535;
      if (bb > 65535) bb = 65535;
    }
    Color16 straight = PhaseSpark().mix(Color16((uint16_t)br, (uint16_t)bg, (uint16_t)bb), mix);
    uint32_t a = (32768u * (uint32_t)(256 - mix) + ba * (uint32_t)mix) >> 8;
    if (a > 32768) a = 32768;
    uint16_t a16 = (uint16_t)a;
    bool od = base.overdrive && mix > 128;
    return RGBA((straight * a16) >> 15, od, a16);
  }

  // 0 = leave the composite alone, 32768 = cover this LED with black.
  uint16_t cover(int led) const {
    if (!active()) return 0;
    uint8_t curve = PhaseCurve();
    if (curve == CONFIG_INOUT_BMP) return BmpCover(led);
    led = MapLed(led);
    if (curve == CONFIG_INOUT_LINEAR) return LinearCover(led);
    if (curve == CONFIG_INOUT_SPARK) return SparkCover(led);
    if (curve == CONFIG_INOUT_SPLIT || curve == CONFIG_INOUT_SPLIT_SPARK)
      return SplitCover(led);
    if (curve == CONFIG_INOUT_EXPLODE || curve == CONFIG_INOUT_EXPLODE_SPARK)
      return ExplodeCover(led);
    if (curve == CONFIG_INOUT_SPUTTER) return SputterCover(led);
    return BendCover(led);
  }

private:
  // Stock bend retracts tip→hilt (led 0 = hilt). The hilt token mirrors the index
  // so the same cover and spark run the other way.
  int MapLed(int led) const {
    if (!PhaseFromHilt() || num_leds_ <= 1) return led;
    if (led < 0) return 0;
    if (led >= num_leds_) return 0;
    return num_leds_ - 1 - led;
  }

  // Four LEDs of full spark on the lit side of edge, then one LED of fade.
  // 0 = full spark, 256 = this LED is outside the band.
  // The dark side stays out of the band. Split retract has lit pixels on both
  // sides of the gap, so a spark that ran through the dark side would paint
  // the other lit end as well.
  static int BandMix(int edge, int led_s, bool lit_toward_hilt) {
    int into_lit = lit_toward_hilt ? (edge - led_s) : (led_s - edge);
    if (into_lit <= 0) return 256;
    if (into_lit <= 1024) return 0;
    int fade = into_lit - 1024;
    if (fade > 255) return 256;
    return fade;
  }

  static int StrongerSpark(int a, int b) {
    if (a >= 256) return b;
    if (b >= 256) return a;
    return a < b ? a : b;
  }

  // Lit length of the moving shape. 0 = off, scale = fully on.
  // Extend grows out_fade_. Retract shrinks in_fade_start_.
  uint32_t ActiveSpan() const {
    uint32_t scale = nleds_256_;
    uint32_t w = on_ ? (out_active_ ? out_fade_ : scale)
                     : (in_active_ ? in_fade_start_ : 0);
    if (w > scale) w = scale;
    return w;
  }

  // Lit pixels are the center band [lo, hi). Edges sit on that band.
  uint16_t CenterLitCover(int led, uint32_t width) const {
    uint32_t scale = nleds_256_;
    uint32_t lo = (scale - width) / 2;
    uint32_t hi = lo + width;
    int black8 = 256 - RangeMix(lo, hi, led);
    if (black8 < 0) black8 = 0;
    return (uint16_t)(black8 * 128);
  }

  // Sparks on the lit side of both center-band edges.
  int CenterLitSpark(int led, uint32_t width) const {
    uint32_t scale = nleds_256_;
    uint32_t lo = (scale - width) / 2;
    uint32_t hi = lo + width;
    int led_s = led << 8;
    return StrongerSpark(BandMix((int)lo, led_s, false), BandMix((int)hi, led_s, true));
  }

  // Extend: the center band grows out to hilt and tip.
  // Retract: a dark gap opens at the middle and those edges run out to both ends.
  uint16_t SplitCover(int led) const {
    if (nleds_256_ == 0) return on_ ? 0 : 32768;
    uint32_t width = ActiveSpan();
    if (on_) return CenterLitCover(led, width);
    uint32_t lo = width / 2;
    uint32_t hi = nleds_256_ - lo;
    return (uint16_t)(RangeMix(lo, hi, led) * 128);
  }

  int SplitSparkMix(int led) const {
    if (!out_active_ && !in_active_) return 256;
    uint32_t width = ActiveSpan();
    if (on_) return CenterLitSpark(led, width);
    uint32_t lo = width / 2;
    uint32_t hi = nleds_256_ - lo;
    int led_s = led << 8;
    return StrongerSpark(BandMix((int)lo, led_s, true), BandMix((int)hi, led_s, false));
  }

  // Extend: center band grows out to hilt and tip.
  // Retract: the same band shrinks. Edges start at hilt and tip and meet at the center.
  uint16_t ExplodeCover(int led) const {
    if (nleds_256_ == 0) return on_ ? 0 : 32768;
    return CenterLitCover(led, ActiveSpan());
  }

  int ExplodeSparkMix(int led) const {
    if (!out_active_ && !in_active_) return 256;
    return CenterLitSpark(led, ActiveSpan());
  }

  static bool UsesLinear(uint8_t curve) {
    return curve == CONFIG_INOUT_LINEAR || curve == CONFIG_INOUT_SPARK ||
           curve == CONFIG_INOUT_SPUTTER || curve == CONFIG_INOUT_BMP;
  }
  static bool UsesBendClock(uint8_t curve) {
    return curve == CONFIG_INOUT_BEND || curve == CONFIG_INOUT_SPARKTIP ||
           curve == CONFIG_INOUT_SPLIT || curve == CONFIG_INOUT_SPLIT_SPARK ||
           curve == CONFIG_INOUT_EXPLODE || curve == CONFIG_INOUT_EXPLODE_SPARK;
  }
  static bool BendFamily(uint8_t curve) {
    return curve == CONFIG_INOUT_BEND || curve == CONFIG_INOUT_SPARKTIP;
  }
  bool NestBend() const { return BendFamily(in_curve_) && BendFamily(out_curve_); }
  uint8_t PhaseCurve() const { return on_ ? in_curve_ : out_curve_; }
  bool PhaseFromHilt() const { return on_ ? in_from_hilt_ : out_from_hilt_; }
  Color16 PhaseSpark() const { return on_ ? in_spark_ : out_spark_; }

  static int ResolveMs(int configured, int wav_ms) {
    if (configured < 1) return wav_ms;
    return configured;
  }

  void PollWav(BladeBase* blade) {
    OneshotEffectDetector<EFFECT_IGNITION> ign;
    BladeEffect* effect = ign.Find(blade);
    if (effect) ign_ms_ = (int)(effect->sound_length * 1000);
    OneshotEffectDetector<EFFECT_RETRACTION> ret;
    effect = ret.Find(blade);
    if (effect) ret_ms_ = (int)(effect->sound_length * 1000);
  }

  // InOutFuncSVFBase. ms <= 0 snaps, matching a zero-length bend wipe.
  void RunLinear(BladeBase* blade, int out_ms, int in_ms) {
    uint32_t now = micros();
    uint32_t delta = now - last_micros_;
    last_micros_ = now;
    if (blade->is_on()) {
      if (out_ms <= 0) {
        extension_ = 1.0f;
      } else if (extension_ == 0.0f) {
        extension_ = 0.00001f;
      } else {
        extension_ += delta / (out_ms * 1000.0f);
        if (extension_ > 1.0f) extension_ = 1.0f;
      }
    } else {
      if (in_ms <= 0) {
        extension_ = 0.0f;
      } else {
        extension_ -= delta / (in_ms * 1000.0f);
        if (extension_ < 0.0f) extension_ = 0.0f;
      }
    }
    ext_value_ = (int)(extension_ * 32768.0f);
  }

  static float BendPow(uint32_t t, uint32_t len, bool inverse) {
    float x = (float)t / (float)len;
    if (x < 0.0f) x = 0.0f;
    if (x > 1.0f) x = 1.0f;
    const float exp = 32976.0f / 32768.0f;
    if (inverse) return 1.0f - powf(1.0f - x, exp);
    return powf(x, exp);
  }

  void StepBend(bool* active, bool* restart, uint32_t* start, uint32_t* len,
                int ms, uint32_t scale, bool inverse, uint32_t* fade_end) {
    if (!*active) return;
    if (*restart) {
      *start = millis();
      *len = ms > 0 ? (uint32_t)ms : 0;
      *restart = false;
    }
    float p = 1.0f;
    if (*len != 0) {
      uint32_t t = millis() - *start;
      if (t > *len) {
        *len = 0;
      } else {
        p = BendPow(t, *len, inverse);
      }
    }
    *fade_end = (uint32_t)(p * (float)scale + 0.5f);
    if (*len == 0) *active = false;
  }

  // InOutTrL + TrWipeX<BendTimePowInv> extend, TrWipeInX<BendTimePow> retract.
  void RunBend(BladeBase* blade, int out_ms, int in_ms) {
    if (on_ != blade->is_on()) {
      on_ = blade->is_on();
      if (on_) {
        out_restart_ = true;
        out_active_ = true;
      } else {
        in_restart_ = true;
        in_active_ = true;
      }
    }
    num_leds_ = blade->num_leds();
    uint32_t scale = 256u * (uint32_t)num_leds_;
    nleds_256_ = scale;
    StepBend(&out_active_, &out_restart_, &out_start_, &out_len_, out_ms, scale, true, &out_fade_);
    uint32_t in_end = 0;
    StepBend(&in_active_, &in_restart_, &in_start_, &in_len_, in_ms, scale, false, &in_end);
    if (in_end > scale) in_end = scale;
    in_fade_start_ = scale - in_end;
  }

  static int RangeMix(uint32_t range_start, uint32_t range_end, int led) {
    uint32_t led_s = (uint32_t)led << 8;
    uint32_t led_e = led_s + 256u;
    uint32_t s = range_start > led_s ? range_start : led_s;
    uint32_t e = range_end < led_e ? range_end : led_e;
    if (s >= e) return 0;
    uint32_t sz = e - s;
    if (sz > 256u) sz = 256u;
    return (int)sz;
  }

  // Each LED has a fixed random time. The linear clock reveals it over a
  // flare window, then hides it again as that clock runs backward.
  static uint32_t SputterHash(int led) {
    uint32_t x = (uint32_t)led * 0x9E3779B1u;
    x ^= x >> 16;
    x *= 0x7FEB352Du;
    x ^= x >> 15;
    return x;
  }

  uint16_t SputterCover(int led) const {
    int p = ext_value_;
    if (p < 0) p = 0;
    if (p > 32768) p = 32768;
    const int flare = 12288;
    const int span = 32768 - flare;
    int h = (int)(((SputterHash(led) & 0xFFFFu) * (uint32_t)span) >> 16);
    int delta = p - h;
    if (delta <= 0) return 32768;
    if (delta >= flare) return 0;
    return (uint16_t)(((uint32_t)(flare - delta) * 32768u) / (uint32_t)flare);
  }

  // InOutHelperF: high = unlit (black layer opaque).
  uint16_t LinearCover(int led) const {
    if (num_leds_ <= 0) return 0;
    int thres = ext_value_ * num_leds_ - 32768;
    int alpha = led * 32768 - thres;
    if (alpha < 0) return 0;
    if (alpha > 32768) return 32768;
    return (uint16_t)alpha;
  }

  // InOutSparkTipX black_mix: 255 = lit, 0 = off color.
  uint16_t SparkCover(int led) const {
    if (num_leds_ <= 0) return 0;
    int thres = (ext_value_ * (num_leds_ + 4)) >> 7;
    int black_mix = thres - led * 256;
    if (black_mix < 0) black_mix = 0;
    if (black_mix > 255) black_mix = 255;
    return (uint16_t)((255 - black_mix) * 32768 / 255);
  }

  uint16_t BendCover(int led) const {
    if (!out_active_ && !in_active_) return on_ ? 0 : 32768;
    int black8;
    if (on_) {
      int inner = 256;
      if (NestBend() && in_active_) inner = RangeMix(in_fade_start_, nleds_256_, led);
      if (out_active_) {
        int mix = RangeMix(0, out_fade_, led);
        black8 = (inner * (256 - mix)) / 256;
      } else {
        black8 = 0;
      }
    } else {
      int inner = 0;
      if (NestBend() && out_active_) {
        int mix = RangeMix(0, out_fade_, led);
        inner = 256 - mix;
      }
      if (in_active_) {
        int mix = RangeMix(in_fade_start_, nleds_256_, led);
        black8 = (inner * (256 - mix) + 256 * mix) / 256;
      } else {
        black8 = 256;
      }
    }
    if (black8 < 0) black8 = 0;
    if (black8 > 256) black8 = 256;
    return (uint16_t)(black8 * 128);
  }

  uint8_t in_curve_ = CONFIG_INOUT_NONE;
  uint8_t out_curve_ = CONFIG_INOUT_NONE;
  int extend_ms_ = 300;
  int retract_ms_ = 800;
  int ign_ms_ = 0;
  int ret_ms_ = 0;
  float extension_ = 0.0f;
  uint32_t last_micros_ = 0;
  int ext_value_ = 0;
  int num_leds_ = 0;
  bool on_ = false;
  bool out_active_ = false;
  bool in_active_ = false;
  bool out_restart_ = false;
  bool in_restart_ = false;
  uint32_t out_start_ = 0;
  uint32_t in_start_ = 0;
  uint32_t out_len_ = 0;
  uint32_t in_len_ = 0;
  uint32_t out_fade_ = 0;
  uint32_t in_fade_start_ = 0;
  uint32_t nleds_256_ = 0;
  bool power_off_ready_ = false;
  bool in_from_hilt_ = false;
  bool out_from_hilt_ = false;
  Color16 in_spark_ = Color16(65535, 65535, 65535);
  Color16 out_spark_ = Color16(65535, 65535, 65535);
  char in_bmp_path_[96] = {0};
  char out_bmp_path_[96] = {0};
  int in_bmp_height_ = 0;
  int out_bmp_height_ = 0;
  ConfigBmpWipe* bmp_ = nullptr;

  static void CopyBmpPath(char* dest, const char* src) {
    dest[0] = 0;
    if (!src || !src[0]) return;
    strncpy(dest, src, 95);
    dest[95] = 0;
  }

  void RunBmp(BladeBase* blade) {
    bool blade_on = blade->is_on();
    uint8_t curve = blade_on ? in_curve_ : out_curve_;
    if (curve != CONFIG_INOUT_BMP || !bmp_ || (!blade_on && extension_ <= 0.0f)) {
      if (bmp_) bmp_->Release();
      return;
    }
    const char* path = blade_on ? in_bmp_path_ : out_bmp_path_;
    int height = blade_on ? in_bmp_height_ : out_bmp_height_;
    bmp_->Scrub(blade, path, height, ext_value_);
  }

  uint16_t BmpCover(int led) const {
    if (!bmp_ || !bmp_->ready()) return on_ ? 0 : 32768;
    return bmp_->Cover(led);
  }
};

// CompositeConfigLayer produces premultiplied RGBA (see RGBA ctor from RGBA_um in color.h).
// RGBA_premul_to_overdrive / RGBA_to_RGBA_um: common/color.h

// Set to true by TransitionEffectConfigL when a preon/postoff transition is
// running.  ConfigLayersStyle checks this after running all sub-layers; if set,
// it suppresses the allow_disable call so the blade stays powered during the
// transition.  Saved/restored across nested ConfigLayersStyle invocations.
bool config_disable_blocked_ = false;

// Wraps a BladeBase to intercept allow_disable() calls from sub-layer styles.
// ConfigLayersStyle uses this so that individual layers cannot prematurely power
// off the blade (e.g. the main blade says "off" during a preon transition).
class AllowDisableCapture : public BladeBase {
public:
  AllowDisableCapture(BladeBase* b) : blade_(b), any_captured_(false) {}
  bool any_captured() const { return any_captured_; }
  int num_leds() const override { return blade_->num_leds(); }
  int GetBladeNumber() const override { return blade_->GetBladeNumber(); }
  Color8::Byteorder get_byteorder() const override { return blade_->get_byteorder(); }
  bool is_on() const override { return blade_->is_on(); }
  bool is_powered() const override { return blade_->is_powered(); }
  void set(int led, Color16 c) override { blade_->set(led, c); }
  void set_overdrive(int led, Color16 c) override { blade_->set_overdrive(led, c); }
  void allow_disable() override { any_captured_ = true; }
  void Activate(int bn) override { blade_->Activate(bn); }
  void Deactivate() override { blade_->Deactivate(); }
  BladeStyle* UnSetStyle() override { return blade_->UnSetStyle(); }
  void SetStyle(BladeStyle* s) override { blade_->SetStyle(s); }
  BladeStyle* current_style() const override { return blade_->current_style(); }
private:
  BladeBase* blade_;
  bool any_captured_;
};

class ConfigLayersStyle : public BladeStyle {
public:
  // alphas / blend_modes: optional per-layer (length num_layers); nullptr = opaque / normal blend.
  // past_mask: 1 = draw this layer after the shared extend/retract wipe (preon, postoff,
  // ignition_flash, sparktip_layer). use_phases stores a separate extend and retract wipe.
  ConfigLayersStyle(BladeStyle** layers, int num_layers, const uint16_t* alphas = nullptr,
                    const uint8_t* blend_modes = nullptr, const uint8_t* past_mask = nullptr,
                    uint8_t inout_curve = CONFIG_INOUT_NONE, int extend_ms = 300, int retract_ms = 800,
                    Color16 spark = Color16(65535, 65535, 65535),
                    bool from_hilt = false,
                    bool use_phases = false,
                    uint8_t in_curve = CONFIG_INOUT_NONE, int in_ms = 300,
                    Color16 in_spark = Color16(65535, 65535, 65535), bool in_from_hilt = false,
                    uint8_t out_curve = CONFIG_INOUT_NONE, int out_ms = 800,
                    Color16 out_spark = Color16(65535, 65535, 65535), bool out_from_hilt = false,
                    const char* in_bmp = nullptr, int in_bmp_h = 0,
                    const char* out_bmp = nullptr, int out_bmp_h = 0)
      : num_layers_(num_layers < 0 ? 0 : (num_layers > CONFIG_LAYERS_MAX ? CONFIG_LAYERS_MAX : num_layers)) {
    if (use_phases) {
      mask_.configurePhases(in_curve, in_ms, in_spark, in_from_hilt,
                            out_curve, out_ms, out_spark, out_from_hilt,
                            in_bmp, in_bmp_h, out_bmp, out_bmp_h);
    } else {
      mask_.configure(inout_curve, extend_ms, retract_ms, spark, from_hilt);
    }
    for (int i = 0; i < num_layers_ && i < CONFIG_LAYERS_MAX; i++) {
      layers_[i] = layers[i];
      layer_alpha_[i] = (alphas && i < num_layers) ? alphas[i] : CONFIG_LAYER_ALPHA_OPAQUE;
      layer_blend_[i] = (blend_modes && i < num_layers) ? blend_modes[i] : CONFIG_LAYER_BLEND_NORMAL;
      layer_past_[i] = (past_mask && i < num_layers) ? past_mask[i] : 0;
    }
    for (int i = num_layers_; i < CONFIG_LAYERS_MAX; i++) {
      layers_[i] = nullptr;
      layer_alpha_[i] = CONFIG_LAYER_ALPHA_OPAQUE;
      layer_blend_[i] = CONFIG_LAYER_BLEND_NORMAL;
      layer_past_[i] = 0;
    }
  }

  ~ConfigLayersStyle() override {
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) {
        delete layers_[i];
        layers_[i] = nullptr;
      }
    }
  }

  // Run sub-layers through a capture proxy so their individual allow_disable
  // calls don't reach the real blade directly. After all layers have run:
  //   - Forward allow_disable if ANY layer requested it, or if the transition
  //     mask has finished retracting (solid / solid_bend no longer do this).
  //   - UNLESS config_disable_blocked_ was set by a TransitionEffectConfigL
  //     whose preon/postoff transition is actively running, in which case
  //     suppress allow_disable so the blade stays powered.
  // The blocked flag propagates from nested ConfigLayersStyles via OR.
  void runUpdate(BladeBase* blade) override {
    AllowDisableCapture capture(blade);
    mask_.run(blade);
    bool saved_blocked = config_disable_blocked_;
    config_disable_blocked_ = false;
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) layers_[i]->runUpdate(&capture);
    }
    bool blocked = config_disable_blocked_;
    config_disable_blocked_ = saved_blocked || blocked;
    if ((capture.any_captured() || mask_.ready_to_power_off()) && !blocked)
      blade->allow_disable();
  }

  void run(BladeBase* blade) override {
    runUpdate(blade);
    int num_leds = blade->num_leds();
    int rotation = (SaberBase::GetCurrentVariation() & 0x7fff) * 3;
    bool rotate = !IsHandled(HANDLED_FEATURE_CHANGE) &&
                  blade->get_byteorder() != Color8::NONE &&
                  (SaberBase::GetCurrentVariation() & 0x7fff) != 0;
    for (int i = 0; i < num_leds; i++) {
      OverDriveColor c = getColor(i);
      Color16 cc = c.c;
      if (rotate) cc = cc.rotate(rotation);
      if (c.getOverdrive()) {
        blade->set_overdrive(i, cc);
      } else {
#ifdef DYNAMIC_BLADE_DIMMING
        cc.r = clampi32((cc.r * SaberBase::GetCurrentDimming()) >> 14, 0, 65535);
        cc.g = clampi32((cc.g * SaberBase::GetCurrentDimming()) >> 14, 0, 65535);
        cc.b = clampi32((cc.b * SaberBase::GetCurrentDimming()) >> 14, 0, 65535);
#endif
        blade->set(i, cc);
      }
      if (!(i & 0xf)) Looper::DoHFLoop();
    }
  }

  OverDriveColor getColor(int led) override {
    return RGBA_premul_to_overdrive(CompositeConfigLayersRGBA(led));
  }

  RGBA_um getLayerColor(int led) override {
    return RGBA_to_RGBA_um(CompositeConfigLayersRGBA(led));
  }

  bool IsHandled(HandledFeature feature) override {
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i] && layers_[i]->IsHandled(feature)) return true;
    }
    return false;
  }

  bool NoOnOff() override {
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i] && layers_[i]->NoOnOff()) return true;
    }
    return false;
  }

  bool Charging() override {
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i] && layers_[i]->Charging()) return true;
    }
    return false;
  }

private:
  RGBA CompositeOneLayer(RGBA result, int i, int led, uint16_t overlay_clip) {
    RGBA_um layer_rgba = layers_[i]->getLayerColor(led);
    if (i > 0 && !layer_past_[i] && overlay_clip != CONFIG_LAYER_ALPHA_OPAQUE &&
        (layer_blend_[i] == CONFIG_LAYER_BLEND_NORMAL ||
         layer_blend_[i] == CONFIG_LAYER_BLEND_ADD)) {
      layer_rgba.alpha = (uint32_t)layer_rgba.alpha * overlay_clip >> 15;
    }
    if (layer_alpha_[i] != CONFIG_LAYER_ALPHA_OPAQUE) {
      layer_rgba.alpha = (uint32_t)layer_rgba.alpha * layer_alpha_[i] >> 15;
    }
    return CompositeConfigLayer(result, layer_rgba, (ConfigLayerBlend)layer_blend_[i]);
  }

  RGBA CompositeConfigLayersRGBA(int led) {
    const bool mask_on = mask_.active();
    uint16_t overlay_clip = CONFIG_LAYER_ALPHA_OPAQUE;
    if (!mask_on && num_layers_ > 1 && layers_[0]) {
      overlay_clip = OverlayClipFactorFromBase(layers_[0]->getLayerColor(led));
    }

    RGBA result(RGBA_um::Transparent());
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i] && !layer_past_[i]) result = CompositeOneLayer(result, i, led, overlay_clip);
    }
    if (mask_on) {
      if (mask_.SparkMix8(led) < 256) result = mask_.ApplySpark(result, led);
      uint16_t cover = mask_.cover(led);
      if (cover >= 32768) {
        result = RGBA(Color16(0, 0, 0), false, 32768);
      } else if (cover) {
        result = result << RGBA_um(Color16(0, 0, 0), false, cover);
      }
    }
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i] && layer_past_[i]) {
        result = CompositeOneLayer(result, i, led, CONFIG_LAYER_ALPHA_OPAQUE);
      }
    }
    return result;
  }

  ConfigExtensionMask mask_;
  BladeStyle* layers_[CONFIG_LAYERS_MAX];
  uint16_t layer_alpha_[CONFIG_LAYERS_MAX];
  uint8_t layer_blend_[CONFIG_LAYERS_MAX];
  uint8_t layer_past_[CONFIG_LAYERS_MAX];
  int num_layers_;
};

// Wraps TransitionEffectL for use as a ConfigLayersStyle sub-layer.
// Two responsibilities:
//   1. Converts run() return from LayerRunResult to bool so that
//      Style<>::runUpdate calls allow_disable when idle (false) but
//      not when the transition is running (true).
//   2. Sets config_disable_blocked_ = true while the transition is
//      running, so ConfigLayersStyle's AllowDisableCapture logic knows
//      to suppress allow_disable from other layers (e.g. the main blade
//      layer says "off" during preon, but the blade must stay powered).
template<class TRANSITION, BladeEffectType EFFECT>
class TransitionEffectConfigL {
  TransitionEffectL<TRANSITION, EFFECT> effect_;
public:
  bool run(BladeBase* blade) {
    LayerRunResult r = effect_.run(blade);
    if (r == LayerRunResult::UNKNOWN) {
      config_disable_blocked_ = true;
      return true;
    }
    return false;
  }
  auto getColor(int led) -> decltype(effect_.getColor(led)) {
    return effect_.getColor(led);
  }
};

#endif  // STYLES_CONFIG_LAYERS_STYLE_H
