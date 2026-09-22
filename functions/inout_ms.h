#ifndef FUNCTIONS_INOUT_MS_H
#define FUNCTIONS_INOUT_MS_H

#include "ifon.h"
#include "islessthan.h"
#include "scale.h"
#include "wavlen.h"

// When MILLIS >= 1, use explicit milliseconds. When < 1 (e.g. -1), use WavLen<EFFECT>.
template<class MILLIS, EffectType EFFECT>
using InOutMsOrWavLen = Scale<
  IsLessThan<MILLIS, Int<1>>,
  WavLen<EFFECT>,
  MILLIS
>;

// InOutFuncX with soundfont-length fallback for extend/retract args.
template<class EXTEND_MS, class RETRACT_MS>
using InOutFuncAuto = InOutFuncX<
  InOutMsOrWavLen<EXTEND_MS, EFFECT_IGNITION>,
  InOutMsOrWavLen<RETRACT_MS, EFFECT_RETRACTION>
>;

#endif
