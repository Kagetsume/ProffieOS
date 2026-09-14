#ifndef STYLES_DARKSABER_H
#define STYLES_DARKSABER_H

// copyright Fett263 DarkSaber (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#DarkSaber
// OS7.15 v3.44p
//
// Base Style: Clone Wars Darksaber (AudioFlicker + BrownNoiseFlicker + Stripes + SwingSpeed gleam).
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "darksaber" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "audio_flicker.h"
#include "brown_noise_flicker.h"
#include "mix.h"
#include "stripes.h"
#include "../functions/int.h"
#include "../functions/swing_speed.h"

template<class BASE_COLOR>
using DarkSaberFlickerBase = AudioFlicker<
  BrownNoiseFlicker<
    Mix<SwingSpeed<400>, BASE_COLOR, Mix<Int<6425>, BASE_COLOR, White>>,
    Stripes<5000, -300,
      Mix<Int<7710>, Black, BASE_COLOR>,
      Mix<Int<25700>, Black, BASE_COLOR>,
      Mix<Int<1285>, Black, BASE_COLOR>,
      Mix<Int<16384>, Black, BASE_COLOR>
    >,
    300
  >,
  Mix<Int<6425>, BASE_COLOR, White>
>;

#endif
