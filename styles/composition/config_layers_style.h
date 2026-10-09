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

// Extend/retract wipes. ConfigExtensionMask is the shared clock and dispatcher.
#include "transitions/extension_mask.h"


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
