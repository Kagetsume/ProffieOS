#ifndef STYLES_KINETIC_CHARGE_H
#define STYLES_KINETIC_CHARGE_H

// Inspired by Fett263 BlackPanther (Primary Blade) OS7 Style
// https://www.fett263.com/fett263-proffieOS7-style-library.html#BlackPanther
// OS7.15 v3.44p — copyright Fett263
//
// Base Style: interactive kinetic charge — clash and lockup build energy stripes;
// long swing decay releases back to idle. Idle and kinetic stripe colors are
// template parameters (configurable; OS7 defaults blue + purple).
// This file contains the OS7 idle-base template only; clash/lockup/blast/in-out
// are provided by the "kinetic_charge" named style wrapper in style_parser.h
// (Os7BladeWithBendInOut — BendTimePow extend/retract).

#include "mix.h"
#include "stripes.h"
#include "../functions/effect_increment.h"
#include "../functions/ifon.h"
#include "../functions/increment.h"
#include "../functions/int.h"
#include "../functions/scale.h"
#include "../functions/sum.h"
#include "../functions/swing_speed.h"

// Charge on clash or lockup begin; release on long swing decay (inverse of StaticElectricity).
using KineticChargeLevel = IncrementWithReset<
  ThresholdPulseF<
    Sum<EffectPulseF<EFFECT_CLASH>, EffectPulseF<EFFECT_LOCKUP_BEGIN>>,
    Int<32000>>,
  ThresholdPulseF<
    Ifon<InvertF<SwingSpeed<400>>, Int<0>>,
    Int<18000>>,
  Int<32768>,
  Int<8100>>;

template<class BASE_COLOR>
using KineticChargeIdleStripes = Stripes<
  20000,
  -200,
  Mix<Int<10000>, Black, BASE_COLOR>,
  BASE_COLOR,
  Mix<Int<18000>, Black, BASE_COLOR>>;

template<class KINETIC_COLOR>
using KineticChargeChargedStripes = Stripes<
  15000,
  -3000,
  Mix<Int<10000>, Black, KINETIC_COLOR>,
  Mix<Int<18000>, Black, KINETIC_COLOR>,
  KINETIC_COLOR>;

template<class BASE_COLOR, class KINETIC_COLOR>
using KineticChargeBladeBase = Mix<
  KineticChargeLevel,
  KineticChargeIdleStripes<BASE_COLOR>,
  KineticChargeChargedStripes<KINETIC_COLOR>>;

#endif  // STYLES_KINETIC_CHARGE_H
