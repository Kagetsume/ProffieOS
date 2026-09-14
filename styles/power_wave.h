#ifndef STYLES_POWER_WAVE_H
#define STYLES_POWER_WAVE_H

// copyright Fett263 PowerWave (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#PowerWave
// OS7.15 v3.44p
//
// Base Style: Power Wave High (wide slow-moving Stripes on silver base).
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "power_wave" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "stripes.h"
#include "../functions/int.h"

template<class BASE_COLOR>
using PowerWaveStripesBase = Stripes<12000, -1800,
  BASE_COLOR,
  Mix<Int<6000>, Black, BASE_COLOR>,
  BASE_COLOR,
  Mix<Int<14000>, Black, BASE_COLOR>
>;

#endif
