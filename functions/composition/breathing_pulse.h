#ifndef FUNCTIONS_BREATHING_PULSE_H
#define FUNCTIONS_BREATHING_PULSE_H

// Usage: BreathingPulseF<PULSE_MS>
// Sine wave generator + shared uniform brightness overlay mix.

#include "uniform_brightness_overlay.h"

template<class PULSE_MS, class DELTA_PERCENT = Int<10>>
using BreathingPulseF = UniformBrightnessOverlayF<PulsingF<PULSE_MS>, DELTA_PERCENT>;

#endif
