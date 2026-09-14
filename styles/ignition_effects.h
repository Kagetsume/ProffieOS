#ifndef STYLES_IGNITION_EFFECTS_H
#define STYLES_IGNITION_EFFECTS_H

// Ignition overlay effects for config/blade_styles.ini (EFFECT_IGNITION).
// SeismicCharge OS7 pattern: hold flash for extend duration, then fade out.

#include "config_layers_style.h"
#include "../transitions/concat.h"
#include "../transitions/delay.h"
#include "../transitions/fade.h"
#include "../transitions/instant.h"
#include "../transitions/join.h"

// Hold FLASH_COLOR for EXTEND_MS (sync with blade extension), then fade over FADE_MS.
template<class FLASH_COLOR, class EXTEND_MS, class FADE_MS>
using IgnitionFlashTransition = TrConcat<
  TrJoin<TrDelayX<EXTEND_MS>, TrInstant>,
  FLASH_COLOR,
  TrFadeX<FADE_MS>>;

#endif  // STYLES_IGNITION_EFFECTS_H
