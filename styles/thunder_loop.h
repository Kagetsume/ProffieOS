#ifndef STYLES_THUNDER_LOOP_H
#define STYLES_THUNDER_LOOP_H

// copyright Fett263 ThunderStorm (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#ThunderStorm
// OS7.15 v3.44p
//
// Base Style: Thunderstorm — TransitionLoop with TrBoing, rolling Stripes bands,
// and SlowNoise random delay between cycles.
// This file contains the OS7 idle-loop template only; clash/lockup/blast/in-out
// are provided by the "thunder_loop" named style wrapper in style_parser.h,
// or stack overlays in config/blade_styles.ini.
// Full "thunder_loop" named style uses Os7BladeWithBendInOut (BendTimePow in/out).

#include "alpha.h"
#include "layers.h"
#include "mix.h"
#include "stripes.h"
#include "transition_loop.h"
#include "../functions/brown_noise.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../transitions/boing.h"
#include "../transitions/concat.h"
#include "../transitions/delay.h"

// One cycle: bounce → rolling thunder bands → random pause (then repeats).
template<class BASE_COLOR>
using ThunderLoopTransition = TrConcat<
  TrBoing<500, 3>,
  Layers<
    Stripes<
      10000, 100,
      Mix<Int<16384>, Black, BASE_COLOR>,
      Mix<Int<3855>, Black, BASE_COLOR>,
      Mix<Int<25700>, Black, BASE_COLOR>>,
    AlphaL<
      Stripes<
        8000, -200,
        BASE_COLOR,
        Mix<Int<7710>, Black, BASE_COLOR>>,
      Int<16384>>
  >,
  TrDelayX<Scale<SlowNoise<Int<3000>>, Int<100>, Int<2000>>>
>;

// Full blade base: base color under the looping transition.
template<class BASE_COLOR>
using ThunderLoopBlade = TransitionLoop<BASE_COLOR, ThunderLoopTransition<BASE_COLOR>>;

// Loop animation only (for multiply/screen layers over another base).
template<class BASE_COLOR>
class ThunderLoopConfigL {
  TransitionLoopL<ThunderLoopTransition<BASE_COLOR>> loop_;
public:
  bool run(BladeBase* blade) {
    loop_.run(blade);
    return true;
  }
  auto getColor(int led) -> decltype(loop_.getColor(led)) {
    return loop_.getColor(led);
  }
};

#endif  // STYLES_THUNDER_LOOP_H
