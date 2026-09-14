#ifndef STYLES_RESPONSIVE_FLAME_H
#define STYLES_RESPONSIVE_FLAME_H

// copyright Fett263 ResponsiveFlame (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#ResponsiveFlame
// OS7.15 v3.44p
//
// Base Style: Responsive Flame (Real Flame Gradient) — dual StaticFire layers mixed by
// BladeAngle, with RampF remap for flame length and SmoothStep tip fade.
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "responsive_flame" named style wrapper in style_parser.h,
// or stack overlays in config/blade_styles.ini.
// Full "responsive_flame" named style uses Os7BladeWithBendInOut (BendTimePow in/out).

#include "alpha.h"
#include "fire.h"
#include "gradient.h"
#include "layers.h"
#include "mix.h"
#include "remap.h"
#include "rotate_color.h"
#include "../functions/blade_angle.h"
#include "../functions/int.h"
#include "../functions/islessthan.h"
#include "../functions/ramp.h"
#include "../functions/scale.h"
#include "../functions/smoothstep.h"

// Real-flame gradient (four rotated shades of base color).
template<class BASE_COLOR>
using ResponsiveFlameGradient1 = Gradient<
  RotateColorsX<Int<1600>, BASE_COLOR>,
  RotateColorsX<Int<1000>, BASE_COLOR>,
  RotateColorsX<Int<400>, BASE_COLOR>,
  BASE_COLOR>;

template<class BASE_COLOR>
using ResponsiveFlameGradient2 = Gradient<
  RotateColorsX<Int<1600>, BASE_COLOR>,
  RotateColorsX<Int<1200>, BASE_COLOR>,
  RotateColorsX<Int<600>, BASE_COLOR>,
  BASE_COLOR>;

template<class BASE_COLOR>
using ResponsiveFlameStaticFire1 = StaticFire<
  ResponsiveFlameGradient1<BASE_COLOR>,
  Mix<Int<16384>, Black, BASE_COLOR>,
  0, 2, 0, 1800, 10>;

template<class BASE_COLOR>
using ResponsiveFlameStaticFire2 = StaticFire<
  ResponsiveFlameGradient2<BASE_COLOR>,
  Mix<Int<16384>, Black, BASE_COLOR>,
  0, 4, 0, 2200, 2>;

// RampF remap scale: flame extends when blade is horizontal, compresses when vertical.
using ResponsiveFlameRemapScale = Scale<
  RampF,
  Int<0>,
  Scale<
    IsLessThan<BladeAngle<>, Int<15000>>,
    Int<32768>,
    Scale<BladeAngle<0, 15000>, Int<60000>, Int<32768>>>>;

using ResponsiveFlameTipFade = SmoothStep<
  Scale<
    IsLessThan<BladeAngle<>, Int<16000>>,
    Int<36000>,
    Scale<BladeAngle<>, Int<10924>, Int<54000>>>,
  Scale<
    IsLessThan<BladeAngle<>, Int<16000>>,
    Int<-1>,
    Scale<BladeAngle<>, Int<-10000>, Int<-1>>>>;

// Idle flame only (for multiply/screen over another base).
template<class BASE_COLOR>
using ResponsiveFlameInner = AlphaL<
  Remap<
    ResponsiveFlameRemapScale,
    Mix<
      BladeAngle<>,
      ResponsiveFlameStaticFire1<BASE_COLOR>,
      ResponsiveFlameStaticFire2<BASE_COLOR>>>,
  ResponsiveFlameTipFade>;

// Full primary-blade base (black under flame).
template<class BASE_COLOR>
using ResponsiveFlameBlade = Layers<Black, ResponsiveFlameInner<BASE_COLOR>>;

#endif  // STYLES_RESPONSIVE_FLAME_H
