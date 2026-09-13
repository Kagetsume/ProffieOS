#ifndef STYLES_FALLEN_ORDER_H
#define STYLES_FALLEN_ORDER_H

// copyright Fett263 FallenOrder (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#FallenOrder
// OS7.15 v3.44p
//
// Base Style: Fallen Order Cal Kestis (Stripes with pulsing mid-band on silver base).
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "fallen_order" named style wrapper in style_parser.h.

#include "mix.h"
#include "pulsing.h"
#include "stripes.h"
#include "../functions/int.h"

template<class BASE_COLOR>
using FallenOrderStripesBase = Stripes<16000, -1000,
  BASE_COLOR,
  Pulsing<Mix<Int<11565>, Black, BASE_COLOR>, BASE_COLOR, 800>,
  BASE_COLOR
>;

#endif
