#ifndef STYLES_ROTATING_PULSE_H
#define STYLES_ROTATING_PULSE_H

// Inspired by Fett263 EnergyBlade (Primary Blade) OS7 Style — Rotating Pulse option
// https://www.fett263.com/fett263-proffieOS7-style-library.html#EnergyBlade
// OS7.15 v3.44p — copyright Fett263
//
// Base Style: wide StripesX with Saw-modulated speed (stripe direction reverses periodically).
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "rotating_pulse" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "stripes.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/sin.h"

template<class BASE_COLOR>
using RotatingPulseStripesBase = StripesX<
  Int<12000>,
  Scale<Saw<Int<20>>, Int<3200>, Int<-3000>>,
  BASE_COLOR,
  Mix<Int<16384>, Black, BASE_COLOR>,
  BASE_COLOR,
  Mix<Int<8871>, Black, BASE_COLOR>>;

#endif  // STYLES_ROTATING_PULSE_H
