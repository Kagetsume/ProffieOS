#ifndef STYLES_CONFIG_LAYERS_STYLE_H
#define STYLES_CONFIG_LAYERS_STYLE_H

#include <stdint.h>

// Runtime blade style that composites multiple sub-styles (layers) in order.
// Used by the "config" style to build effects from config/blade_styles.ini.
// Each layer is drawn over the previous (same as compile-time Layers<>).

#include "blade_style.h"
#include "../common/color.h"
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
inline RGBA CompositeConfigLayer(RGBA base, RGBA_um over, ConfigLayerBlend blend_mode) {
  if (blend_mode == CONFIG_LAYER_BLEND_NORMAL || !over.alpha) return base << over;
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

  void run(BladeBase* blade) override {
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) layers_[i]->run(blade);
    }
  }

  OverDriveColor getColor(int led) override {
    RGBA result(RGBA_um::Transparent());
    for (int i = 0; i < num_layers_; i++) {
      if (layers_[i]) {
        OverDriveColor layer_c = layers_[i]->getColor(led);
        RGBA_um rgba(layer_c);
        if (layer_alpha_[i] != CONFIG_LAYER_ALPHA_OPAQUE) {
          rgba.alpha = (uint32_t)rgba.alpha * layer_alpha_[i] >> 15;
        }
        result = CompositeConfigLayer(result, rgba, (ConfigLayerBlend)layer_blend_[i]);
      }
    }
    return OverDriveColor(result.c, result.overdrive);
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
  BladeStyle* layers_[CONFIG_LAYERS_MAX];
  uint16_t layer_alpha_[CONFIG_LAYERS_MAX];
  uint8_t layer_blend_[CONFIG_LAYERS_MAX];
  int num_layers_;
};

#endif  // STYLES_CONFIG_LAYERS_STYLE_H
