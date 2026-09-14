#ifndef STYLES_PULSE_STRIPES_H
#define STYLES_PULSE_STRIPES_H

// Inspired by Fett263 OS7 Style — ignition-surge stripes + pulsing band option
// https://www.fett263.com/fett263-proffieOS7-style-library.html#JediSurvivor
// OS7.15 v3.44p
//
// Base Style: StripesX with HoldPeakF on ignition/alt-sound (width 8000↔3000,
// speed −2600↔−3600) and Pulsing mid-band (1400 ms).
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "pulse_stripes" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "pulsing.h"
#include "stripes.h"
#include "../functions/effect_increment.h"
#include "../functions/hold_peak.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/sum.h"

using PulseStripesIgnitionPeak = HoldPeakF<
  Sum<EffectPulseF<EFFECT_IGNITION>, EffectPulseF<EFFECT_ALT_SOUND>>,
  Int<3000>,
  Int<3000>>;

using PulseStripesWidth = Scale<PulseStripesIgnitionPeak, Int<8000>, Int<3000>>;
using PulseStripesSpeed = Scale<PulseStripesIgnitionPeak, Int<-2600>, Int<-3600>>;

template<class BASE_COLOR>
using PulseStripesBladeBase = StripesX<
  PulseStripesWidth,
  PulseStripesSpeed,
  BASE_COLOR,
  Mix<Int<12000>, Black, BASE_COLOR>,
  Pulsing<BASE_COLOR, Mix<Int<8000>, Black, BASE_COLOR>, 1400>>;

#endif  // STYLES_PULSE_STRIPES_H
