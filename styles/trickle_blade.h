#ifndef STYLES_TRICKLE_BLADE_H
#define STYLES_TRICKLE_BLADE_H

// Inspired by Fett263 OS7 primary blade style (energy trickle / angle flame stripes)
// https://www.fett263.com/fett263-proffieOS7-style-library.html#Ahsoka
// OS7.15 v3.44p — copyright Fett263
//
// Base Style: StaticFire over angle-responsive StripesX with HoldPeakF swing brightening
// and SmoothStep tip-weighted flame (energy trickles toward the tip).
// Named "trickle_blade" in the API — generic; no franchise character names.
// Clash/lockup/blast/in-out are provided by the "trickle_blade" named style wrapper
// in style_parser.h (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "fire.h"
#include "mix.h"
#include "stripes.h"
#include "../functions/blade_angle.h"
#include "../functions/hold_peak.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/smoothstep.h"
#include "../functions/swing_speed.h"

template<class BASE_COLOR>
using TrickleBladeTipMix = Mix<
  SmoothStep<Scale<BladeAngle<>, Int<38000>, Int<23000>>, Int<8000>>,
  Mix<Int<400>, Black, BASE_COLOR>,
  Mix<Int<6000>, Black, BASE_COLOR>>;

template<class BASE_COLOR>
using TrickleBladeSwingStripeMix = Mix<
  Scale<
    HoldPeakF<SwingSpeed<250>, Int<1000>, Int<8000>>,
    Int<6000>,
    Int<16000>>,
  Black,
  BASE_COLOR>;

template<class BASE_COLOR>
using TrickleBladeStripes = StripesX<
  Int<14000>,
  Scale<BladeAngle<>, Int<-5>, Int<-50>>,
  BASE_COLOR,
  TrickleBladeSwingStripeMix<BASE_COLOR>>;

template<class BASE_COLOR>
using TrickleBladeBase = StaticFire<
  TrickleBladeTipMix<BASE_COLOR>,
  TrickleBladeStripes<BASE_COLOR>,
  0, 2, 4, 2000, 2>;

#endif  // STYLES_TRICKLE_BLADE_H
