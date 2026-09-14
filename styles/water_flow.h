#ifndef STYLES_WATER_FLOW_H
#define STYLES_WATER_FLOW_H

// copyright Fett263 WaterBlade (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#WaterBlade
// OS7.15 v3.44p
//
// Base Style: Interactive Water Blade (StripesX + BladeAngle + swing reversal).
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "water_flow" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "stripes.h"
#include "mix.h"
#include "../functions/blade_angle.h"
#include "../functions/hold_peak.h"
#include "../functions/islessthan.h"
#include "../functions/scale.h"
#include "../functions/swing_speed.h"
#include "../functions/int.h"

template<class BASE_COLOR>
using WaterFlowStripesBase = StripesX<
  Scale<
    IsLessThan<BladeAngle<>, Int<16384>>,
    Scale<BladeAngle<>, Int<20000>, Int<10000>>,
    Scale<BladeAngle<>, Int<10000>, Int<20000>>
  >,
  Scale<
    BladeAngle<>,
    Int<-1000>,
    Scale<
      IsGreaterThan<
        HoldPeakF<
          SwingAcceleration<>,
          Scale<HoldPeakF<SwingAcceleration<>, Int<200>, Int<4000>>, Int<100>, Int<600>>,
          Scale<BladeAngle<>, Int<3000>, Int<6000>>
        >,
        Int<16384>
      >,
      Int<1000>,
      Int<-1000>
    >
  >,
  BASE_COLOR,
  Mix<Int<16384>, Black, BASE_COLOR>,
  Mix<Int<10280>, Black, BASE_COLOR>,
  Mix<Int<25700>, Black, BASE_COLOR>,
  Mix<Int<7710>, Black, BASE_COLOR>
>;

#endif
