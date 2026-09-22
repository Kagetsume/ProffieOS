#ifndef FUNCTIONS_UNIFORM_TIMED_FLICKER_H
#define FUNCTIONS_UNIFORM_TIMED_FLICKER_H

// Usage: UniformTimedFlickerF<DELTA_PERCENT, MIN_MS, MAX_MS>
// Random-hold wave generator + shared uniform brightness overlay mix.

#include "uniform_brightness_overlay.h"

template<class DELTA_PERCENT, class MIN_MS, class MAX_MS>
using UniformTimedFlickerF =
    UniformBrightnessOverlayF<RandomHoldWaveF<MIN_MS, MAX_MS>, DELTA_PERCENT>;

#endif
