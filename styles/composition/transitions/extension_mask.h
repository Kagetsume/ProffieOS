#ifndef STYLES_COMPOSITION_TRANSITIONS_EXTENSION_MASK_H
#define STYLES_COMPOSITION_TRANSITIONS_EXTENSION_MASK_H

#include <math.h>
#include <string.h>
#include "bmp_wipe.h"

// How the base layer wipes. LINEAR matches InOutHelperX / InOutFuncAuto.
// BEND matches InOutTrBendAuto (BendTimePow). SPARK matches InOutSparkTipX's black edge.
// SPARKTIP is that bend wipe plus a four-LED spark on the moving edge, extend and retract.
// SPLIT opens a gap at the middle on retract (edges run out to hilt and tip).
// SPLIT_SPARK is that same gap with the spark band on both edges.
// EXPLODE keeps a lit center band: it grows out to both ends, then shrinks back in.
// EXPLODE_SPARK is that band with a spark on both edges.
// SPUTTER fades random pixels in over the extend. Retract plays that pattern backward.
// FLAME is a bend base plus motes that always travel toward the tip.
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
  CONFIG_INOUT_FLAME = 11,
};

// One wipe for the whole stack. Extend and retract are separate phases.
// `transition = bend|linear|spark|split|explode|sputter|flame|bmp ext ret ...`
// spark is one effect. The word bend on that line selects the bend curve.
// sparktip is spark with bend already selected.
// sets both. `transition_in` / `transition_out` override one phase:
// `behavior <ms> [spark] [color] [hilt|tip]`.
// The direction word is the end the blade extends from and retracts to.
// hilt (default): extend hilt→tip, retract back to the hilt.
// tip: extend tip→hilt, retract back to the tip. Spark stays on the moving edge.
// split on the way in grows a lit center band out to hilt and tip.
// split on the way out opens a dark gap at the middle and both edges run outward.
// explode uses that same center band both ways: out to the ends, then back in until dark.
// sputter reveals random pixels over the extend. Retract hides them in reverse order.
// flame grows and shrinks a bend base. Motes whip toward the tip on both phases.
// bmp scrubs a column file: row 0 → last row on extend, last row → 0 on retract.
// White in the file is lit. Black is covered. `spark` lights split and explode edges.
// When no line is set, the first base that has extend/retract supplies both phases.
// solid and solid_bend are colors; their default curve is bend.
// Painted after every inside layer and before preon, postoff,
// ignition_flash, and sparktip_layer. Textures do not carry their own InOut.
// Bend exponent matches BendInOutPower = Mult<Int<10992>, Int<98304>>.
// When the wipe has finished and the blade is off, ready_to_power_off() is
// the signal that the driver may cut power.

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
      SyncWipeFrame(false);
      return;
    }
    PollWav(blade);
    // run() stops while the card is unmounted, so last_micros_ is stale and
    // the next extend would jump to the last row in one frame.
    const bool blade_now = blade->is_on();
    if (blade_now && !on_) {
      extension_ = 0;
      last_micros_ = micros();
      if (bmp_) bmp_->DropSession();
    }
    const int out_ms = ResolveMs(extend_ms_, ign_ms_, 300);
    const int in_ms = ResolveMs(retract_ms_, ret_ms_, 800);
    const bool want_lin = UsesLinear(in_curve_) || UsesLinear(out_curve_);
    const bool want_bend = UsesBendClock(in_curve_) || UsesBendClock(out_curve_);
    if (want_lin) {
      RunLinear(blade, out_ms, in_ms);
      num_leds_ = blade->num_leds();
    }
    if (want_bend) RunBend(blade, out_ms, in_ms);
    else on_ = blade->is_on();
    RunBmp(blade);
    SyncWipeFrame(true);
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
  // Extend and retract both carry it. hilt extends from the hilt and retracts
  // back to the hilt. tip extends from the tip and retracts back to the tip.
  int SparkMix8(int led) const {
    uint8_t curve = PhaseCurve();
    if (curve == CONFIG_INOUT_SPLIT_SPARK) return SplitSparkMix(MapLed(led));
    if (curve == CONFIG_INOUT_EXPLODE_SPARK) return ExplodeSparkMix(MapLed(led));
    if (curve == CONFIG_INOUT_FLAME) return FlameSparkMix(MapLed(led));
    if (curve == CONFIG_INOUT_SPARK) return LinearSparkMix(MapLed(led));
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
    if (curve == CONFIG_INOUT_FLAME) return FlameCover(led);
    return BendCover(led);
  }

private:
  // LED 0 is the hilt. The tip word mirrors the index, so the same cover and
  // spark extend from the tip and retract back to the tip.
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

  static bool UsesLinear(uint8_t curve) {
    return curve == CONFIG_INOUT_LINEAR || curve == CONFIG_INOUT_SPARK ||
           curve == CONFIG_INOUT_SPUTTER || curve == CONFIG_INOUT_BMP;
  }
  static bool UsesBendClock(uint8_t curve) {
    return curve == CONFIG_INOUT_BEND || curve == CONFIG_INOUT_SPARKTIP ||
           curve == CONFIG_INOUT_SPLIT || curve == CONFIG_INOUT_SPLIT_SPARK ||
           curve == CONFIG_INOUT_EXPLODE || curve == CONFIG_INOUT_EXPLODE_SPARK ||
           curve == CONFIG_INOUT_FLAME;
  }
  static bool BendFamily(uint8_t curve) {
    return curve == CONFIG_INOUT_BEND || curve == CONFIG_INOUT_SPARKTIP;
  }
  bool NestBend() const { return BendFamily(in_curve_) && BendFamily(out_curve_); }
  uint8_t PhaseCurve() const { return on_ ? in_curve_ : out_curve_; }
  bool PhaseFromHilt() const { return on_ ? in_from_hilt_ : out_from_hilt_; }
  Color16 PhaseSpark() const { return on_ ? in_spark_ : out_spark_; }

  static int ResolveMs(int configured, int wav_ms, int fallback) {
    if (configured >= 1) return configured;
    if (wav_ms >= 1) return wav_ms;
    // -1 means "use the wav". A 0 length is "not known yet", and treating
    // that as a finished wipe skips every row of the transition image.
    return fallback;
  }

  void PollWav(BladeBase* blade) {
    OneshotEffectDetector<EFFECT_IGNITION> ign;
    BladeEffect* effect = ign.Find(blade);
    if (effect) ign_ms_ = (int)(effect->sound_length * 1000);
    OneshotEffectDetector<EFFECT_RETRACTION> ret;
    effect = ret.Find(blade);
    if (effect) ret_ms_ = (int)(effect->sound_length * 1000);
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

#include "wipe_linear.h"
#include "wipe_bend.h"
#include "wipe_split.h"
#include "wipe_sputter.h"
#include "wipe_flame.h"
#include "wipe_bmp.h"
};

#endif
