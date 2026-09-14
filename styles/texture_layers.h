#ifndef STYLES_TEXTURE_LAYERS_H
#define STYLES_TEXTURE_LAYERS_H

// Non-opaque-friendly texture overlays for config/blade_styles.ini layering.
// Use over an opaque base (standard, gradient, rainbow, …) with multiply, screen, or add.
//
// Examples:
//   layer = standard blue white 300 800
//   layer = multiply opacity 20000 fire_mask white white
//   layer = multiply opacity 12000 stripes 800 -1500 black white
//   layer = add opacity 6000 noise_flicker black cyan

#include "fire.h"
#include "stripes.h"
#include "unstable_blades.h"

// Rolling heat texture (StaticFire — no clash/lockup/off fire configs). Same color args as fire.
template<class WARM, class HOT>
using FireMaskLayer = StaticFire<WARM, HOT>;

// Moving soft stripes (width, speed, color1, color2).
template<class WIDTH, class SPEED, class C1, class C2>
using StripesLayer = StripesX<WIDTH, SPEED, C1, C2>;

// Hard-edged stripes variant.
template<class WIDTH, class SPEED, class C1, class C2>
using HardStripesLayer = HardStripesX<WIDTH, SPEED, C1, C2>;

// UnstableBlades stripe/noise band only (no full InOutHelper wrapper).
template<class BASE>
using UnstableStripesLayer = UnstableBladesStripesBase<BASE>;

#endif  // STYLES_TEXTURE_LAYERS_H
