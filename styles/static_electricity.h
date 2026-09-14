#ifndef STYLES_STATIC_ELECTRICITY_H
#define STYLES_STATIC_ELECTRICITY_H

// copyright Fett263 StaticElectricity (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#StaticElectricity
// OS7.15 v3.44p
//
// Base Style: Interactive Static Electricity Blade — swing to build charge, clash to dissipate.
// This file contains the OS7 base-layer template only; clash/lockup/blast/in-out
// are provided by the "static_electricity" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "audio_flicker.h"
#include "color_select.h"
#include "layers.h"
#include "mix.h"
#include "random_per_led_flicker.h"
#include "stripes.h"
#include "../functions/effect_increment.h"
#include "../functions/increment.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/sum.h"
#include "../functions/swing_speed.h"
#include "../transitions/concat.h"
#include "../transitions/fade.h"
#include "../transitions/instant.h"
#include "../transitions/select.h"

template<class MAX, class I = Int<1>>
using StaticElectricityCharge = IncrementWithReset<
  ThresholdPulseF<SwingSpeed<400>, Int<18000>>,
  Sum<EffectPulseF<EFFECT_CLASH>, EffectPulseF<EFFECT_LOCKUP_BEGIN>>,
  MAX,
  I
>;

using StaticElectricitySelect = StaticElectricityCharge<Int<1>>;
using StaticElectricityStripeSpeed = StaticElectricityCharge<Int<32000>, Int<2000>>;
using StaticElectricitySparkleAlpha = StaticElectricityCharge<Int<30000>, Int<4000>>;

template<class BASE_COLOR>
using StaticElectricityBladeBase = Layers<
  Black,
  ColorSelect<
    StaticElectricitySelect,
    TrSelect<
      StaticElectricitySelect,
      TrConcat<TrInstant, Mix<Int<16384>, BASE_COLOR, White>, TrSmoothFade<500>>,
      TrSmoothFade<600>
    >,
    AudioFlicker<BASE_COLOR, Mix<Int<18000>, Black, BASE_COLOR>>,
    Layers<
      StripesX<
        Int<6000>,
        Scale<StaticElectricityStripeSpeed, Int<-100>, Int<-3000>>,
        Mix<Int<9000>, Black, BASE_COLOR>,
        BASE_COLOR,
        Mix<Int<18000>, Black, BASE_COLOR>
      >,
      AlphaL<RandomPerLEDFlickerL<Black>, StaticElectricitySparkleAlpha>
    >
  >
>;

#endif
