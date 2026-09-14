#ifndef STYLES_ROTOSCOPE_H
#define STYLES_ROTOSCOPE_H

// copyright Fett263 Rotoscope (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#Rotoscope
// OS7.15 v3.44p
//
// Base Style: Hyper Responsive Rotoscope (Original Trilogy)
// HoldPeakF<SwingSpeed> + SwingAcceleration-driven StripesX speed and mix weight,
// RandomFlicker multi-band stripes for OT-style responsive blade art.
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "rotoscope" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "random_flicker.h"
#include "stripes.h"
#include "../functions/hold_peak.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/swing_speed.h"

// Outer mix: swing/acceleration peak controls rotoscope band visibility vs solid base.
using RotoscopeSwingPeak = HoldPeakF<
  SwingSpeed<250>,
  Scale<SwingAcceleration<100>, Int<50>, Int<500>>,
  Scale<SwingAcceleration<>, Int<20000>, Int<10000>>>;

// Stripe scroll speed peaks with acceleration (harder motion = faster crawl, then decays).
using RotoscopeStripeSpeedPeak = HoldPeakF<
  SwingSpeed<200>,
  Scale<SwingAcceleration<100>, Int<50>, Int<300>>,
  Scale<SwingAcceleration<100>, Int<24000>, Int<16000>>>;

using RotoscopeStripeSpeed = Scale<
  RotoscopeStripeSpeedPeak,
  Int<-3200>,
  Int<-200>>;

template<class BASE_COLOR>
using RotoscopeStripes = StripesX<
  Int<15000>,
  RotoscopeStripeSpeed,
  BASE_COLOR,
  BASE_COLOR,
  Mix<Int<7710>, Black, BASE_COLOR>,
  BASE_COLOR,
  Mix<Int<19276>, Black, BASE_COLOR>>;

template<class BASE_COLOR>
using RotoscopeFlicker = RandomFlicker<
  BASE_COLOR,
  RotoscopeStripes<BASE_COLOR>>;

template<class BASE_COLOR>
using RotoscopeBladeBase = Mix<
  RotoscopeSwingPeak,
  RotoscopeFlicker<BASE_COLOR>,
  BASE_COLOR,
  BASE_COLOR>;

#endif  // STYLES_ROTOSCOPE_H
