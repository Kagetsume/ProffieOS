#ifndef STYLES_UNSTABLE_BLADES_H
#define STYLES_UNSTABLE_BLADES_H

// copyright Fett263 UnstableBlades (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#UnstableBlades
// OS7.15 v3.44p
//
// Base Style: Unstable Pulse (StripesX + SlowNoise speed + flicker/noise stripe colors).
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "unstable_blades" named style wrapper in style_parser.h.
// Note: distinct from the built-in "unstable" named style (red crackle/strobe blade).

#include "brown_noise_flicker.h"
#include "mix.h"
#include "random_per_led_flicker.h"
#include "stripes.h"
#include "../functions/brown_noise.h"
#include "../functions/int.h"
#include "../functions/scale.h"

template<class BASE_COLOR>
using UnstableBladesStripesBase = StripesX<
  Int<6000>,
  Scale<SlowNoise<Int<2000>>, Int<-1600>, Int<-3200>>,
  BASE_COLOR,
  RandomPerLEDFlicker<Mix<Int<10280>, Black, BASE_COLOR>, Mix<Int<1285>, Black, BASE_COLOR>>,
  BrownNoiseFlicker<Mix<Int<1285>, Black, BASE_COLOR>, Mix<Int<16384>, Black, BASE_COLOR>, 300>,
  BASE_COLOR,
  RandomPerLEDFlicker<Black, Mix<Int<16384>, Black, BASE_COLOR>>,
  BASE_COLOR
>;

#endif
