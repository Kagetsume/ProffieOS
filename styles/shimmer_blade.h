#ifndef STYLES_SHIMMER_BLADE_H
#define STYLES_SHIMMER_BLADE_H

// copyright Fett263 ShimmerBlade (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#ShimmerBlade
// OS7.15 v3.44p
//
// Base Style: Interactive Shimmer Blade — swing harder for faster, longer-lasting
// stripe shimmer (HoldPeakF<SwingSpeed> + RandomFlicker + StripesX).
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "shimmer_blade" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "random_flicker.h"
#include "stripes.h"
#include "../functions/hold_peak.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/swing_speed.h"

template<class BASE_COLOR>
using ShimmerBladeDimBase = Mix<Int<16384>, Black, BASE_COLOR>;

// Outer mix control: peak swing speed held, then decays (harder swing = longer shimmer).
using ShimmerBladeSwingPeak = HoldPeakF<
  SwingSpeed<200>,
  Int<300>,
  Scale<SwingSpeed<200>, Int<8000>, Int<24000>>>;

// Stripe scroll speed follows held swing peak (harder swing = faster bands).
using ShimmerBladeStripeSpeed = Scale<
  HoldPeakF<
    SwingSpeed<200>,
    Scale<SwingSpeed<200>, Int<1000>, Int<4000>>,
    Scale<SwingSpeed<200>, Int<4000>, Int<8000>>>,
  Int<-100>,
  Int<-3000>>;

template<class BASE_COLOR>
using ShimmerBladeStripes = StripesX<
  Int<16000>,
  ShimmerBladeStripeSpeed,
  Mix<Int<24576>, Black, BASE_COLOR>,
  BASE_COLOR,
  Mix<Int<8192>, Black, BASE_COLOR>>;

template<class BASE_COLOR>
using ShimmerBladeShimmer = RandomFlicker<
  ShimmerBladeDimBase<BASE_COLOR>,
  ShimmerBladeStripes<BASE_COLOR>>;

template<class BASE_COLOR>
using ShimmerBladeBase = Mix<
  ShimmerBladeSwingPeak,
  ShimmerBladeDimBase<BASE_COLOR>,
  ShimmerBladeShimmer<BASE_COLOR>>;

#endif  // STYLES_SHIMMER_BLADE_H
