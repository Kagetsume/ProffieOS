#ifndef STYLES_CONFIG_LAYERS_STYLE_H
#define STYLES_CONFIG_LAYERS_STYLE_H

#include <stdint.h>

// Runtime blade style that composites multiple sub-styles (layers) in order.
// Used by the "config" style to build effects from config/blade_styles.ini.
// Each layer is drawn over the previous (same as compile-time Layers<>).

#include "blade_style.h"
#include "../common/color.h"
#include "../common/looper.h"
#include "../common/math.h"
#include "../common/saber_base.h"

#define CONFIG_LAYERS_MAX 16  // Fixed array size per style; increase uses more RAM
// Alpha scale for layer stacking: 0 = transparent, 32768 = full contribution (see AlphaL in alpha.h).
#define CONFIG_LAYER_ALPHA_OPAQUE 32768

// Per-layer blend when compositing onto layers below (straight RGB math, then normal alpha-over).
enum ConfigLayerBlend : uint8_t {
  CONFIG_LAYER_BLEND_NORMAL = 0,
  CONFIG_LAYER_BLEND_MULTIPLY = 1,
  CONFIG_LAYER_BLEND_SCREEN = 2,
  CONFIG_LAYER_BLEND_ADD = 3,
};

// Combine premultiplied base with straight overlay color using blend mode, then alpha-over (same as <<).
// Fully transparent overlay must leave base unchanged: base << RGBA_um(alpha=0) still perturbs premultiplied
// alpha in operator<<(RGBA, RGBA_um) due to rounding, which can zero the stack so only effects (e.g. blast) show.
inline RGBA CompositeConfigLayer(RGBA base, RGBA_um over, ConfigLayerBlend blend_mode) {
  if (!over.alpha) return base;
  if (blend_mode == CONFIG_LAYER_BLEND_NORMAL) return base << over;
  if (!base.alpha) return base << over;
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
    default:
      return base << over;
  }
  RGBA_um blended(Color16((uint16_t)mr, (uint16_t)mg, (uint16_t)mb), over.overdrive, over.alpha);
  return base << blended;
}

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
  ConfigLayersStyle(BladeStyle** layers, int num_layers, const uint16_t* alphas = nullptr,
                    const uint8_t* blend_modes = nullptr)
      : num_layers_(num_layers < 0 ? 0 : (num_layers > CONFIG_LAYERS_MAX ? CONFIG_LAYERS_MAX : num_layers)) {
    for (int i = 0; i < num_layers_ && i < CONFIG_LAYERS_MAX; i++) {
      layers_[i] = layers[i];
      layer_alpha_[i] = (alphas && i < num_layers) ? alphas[i] : CONFIG_LAYER_ALPHA_OPAQUE;
      layer_blend_[i] = (blend_modes && i < num_layers) ? blend_modes[i] : CONFIG_LAYER_BLEND_NORMAL;
    }
    for (int i = num_layers_; i < CONFIG_LAYERS_MAX; i++) {
      layers_[i] = nullptr;
      layer_alpha_[i] = CONFIG_LAYER_ALPHA_OPAQUE;
      layer_blend_[i] = CONFIG_LAYER_BLEND_NORMAL;
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
  //   - Forward allow_disable if ANY layer requested it (matches original
  //     behavior for existing layer types like BlastL that never call it).
  //   - UNLESS config_disable_blocked_ was set by a TransitionEffectConfigL
  //     whose preon/postoff transition is actively running, in which case
  //     suppress allow_disable so the blade stays powered.
  // The blocked flag propagates from nested ConfigLayersStyles via OR.
  void runUpdate(BladeBase* blade) override {
    AllowDisableCapture capture(blade);
    bool saved_blocked = config_disable_blocked_;
    config_disable_blocked_ = false;
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) layers_[i]->runUpdate(&capture);
    }
    bool blocked = config_disable_blocked_;
    config_disable_blocked_ = saved_blocked || blocked;
    if (capture.any_captured() && !blocked) blade->allow_disable();
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
  RGBA CompositeConfigLayersRGBA(int led) {
    RGBA result(RGBA_um::Transparent());
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) {
        RGBA_um layer_rgba = layers_[i]->getLayerColor(led);
        if (layer_alpha_[i] != CONFIG_LAYER_ALPHA_OPAQUE) {
          layer_rgba.alpha = (uint32_t)layer_rgba.alpha * layer_alpha_[i] >> 15;
        }
        result = CompositeConfigLayer(result, layer_rgba, (ConfigLayerBlend)layer_blend_[i]);
      }
    }
    return result;
  }

  BladeStyle* layers_[CONFIG_LAYERS_MAX];
  uint16_t layer_alpha_[CONFIG_LAYERS_MAX];
  uint8_t layer_blend_[CONFIG_LAYERS_MAX];
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
