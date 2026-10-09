#ifndef STYLES_TRANSITION_CONFIG_SHARED_H
#define STYLES_TRANSITION_CONFIG_SHARED_H

// Shared TransitionEffectConfigL transition trees (Tier B dedup).
// Reuse one Style<> per (transition shape, EFFECT) — multiple named_styles can share the
// same StyleAllocator (e.g. preon_glow + accent_preon).

#include "config_layers_style.h"
#include "../style_ptr.h"
#include "../../functions/int.h"
#include "../../functions/int_arg.h"
#include "../../functions/wavlen.h"
#include "../../functions/ramp.h"
#include "../../functions/islessthan.h"
#include "../../functions/sound_level.h"
#include "../../transitions/concat.h"
#include "../../transitions/delay.h"
#include "../../transitions/fade.h"

// Audio-reactive full-blade glow; duration from active effect wav (WavLen<> inside TransitionEffectL).
using ConfigAudioGlowTransition = TrConcat<
  TrFadeX<Int<1>>,
  AlphaL<RgbArg<1, White>, SmoothSoundLevel>,
  TrDelayX<WavLen<>>>;

using ConfigPreonAudioGlowLayer =
    TransitionEffectConfigL<ConfigAudioGlowTransition, EFFECT_PREON>;
using ConfigPostoffAudioGlowLayer =
    TransitionEffectConfigL<ConfigAudioGlowTransition, EFFECT_POSTOFF>;
using ConfigForceAudioGlowLayer =
    TransitionEffectConfigL<ConfigAudioGlowTransition, EFFECT_FORCE>;

static StyleAllocator preon_audio_glow_style = StylePtr<ConfigPreonAudioGlowLayer>();
static StyleAllocator postoff_audio_glow_style = StylePtr<ConfigPostoffAudioGlowLayer>();
static StyleAllocator force_audio_glow_style = StylePtr<ConfigForceAudioGlowLayer>();

// Length-from-hilt sputter (preon / postoff share shape; EFFECT differs).
using ConfigSputterTransition = TrConcat<
  TrFadeX<Int<1>>,
  AlphaL<RgbArg<1, White>, IsLessThan<RampF, SmoothSoundLevel>>,
  TrDelayX<WavLen<>>>;

using ConfigPreonSputterLayer =
    TransitionEffectConfigL<ConfigSputterTransition, EFFECT_PREON>;
using ConfigPostoffSputterLayer =
    TransitionEffectConfigL<ConfigSputterTransition, EFFECT_POSTOFF>;

static StyleAllocator preon_sputter_style = StylePtr<ConfigPreonSputterLayer>();
static StyleAllocator postoff_sputter_style = StylePtr<ConfigPostoffSputterLayer>();

#endif  // STYLES_TRANSITION_CONFIG_SHARED_H
