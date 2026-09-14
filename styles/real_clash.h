#ifndef STYLES_REAL_CLASH_H
#define STYLES_REAL_CLASH_H

// Real Clash V1 overlay (Fett263 OS7-style): TrSelect among bump / wave / spark / fade
// paths based on ClashImpactF. For config/blade_styles.ini layers.
// Requires clash strength from the prop (Real Clash / GetClashStrength) for path selection.

#include "alpha.h"
#include "transition_effect.h"
#include "stripes.h"
#include "mix.h"
#include "remap.h"
#include "config_layers_style.h"
#include "../functions/blade_angle.h"
#include "../functions/bump.h"
#include "../functions/center_dist.h"
#include "../functions/clash_impact.h"
#include "../functions/scale.h"
#include "../functions/sum.h"
#include "../transitions/select.h"
#include "../transitions/wave.h"
#include "../transitions/concat.h"
#include "../transitions/instant.h"
#include "../transitions/fade.h"

// Blade-angle band used for positioned clash (lockup_position = tip-ish center, default 16000).
template<class LOCKUP_POS>
using RealClashBladeAngleScale = Scale<BladeAngle<>,
  Scale<BladeAngle<0, 16000>,
    Sum<LOCKUP_POS, Int<-12000>>,
    Sum<LOCKUP_POS, Int<10000>>>,
  Sum<LOCKUP_POS, Int<-10000>>>;

template<class CLASH_COLOR, class LOCKUP_POS>
using RealClashTransition = TrSelect<
  Scale<ClashImpactF<>, Int<0>, Int<4>>,
  TrConcat<
    TrInstant,
    AlphaL<
      CLASH_COLOR,
      Bump<RealClashBladeAngleScale<LOCKUP_POS>,
           Scale<ClashImpactF<>, Int<8000>, Int<12000>>>>,
    TrFadeX<Scale<ClashImpactF<>, Int<200>, Int<600>>>>,
  TrWaveX<
    CLASH_COLOR,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    Int<100>,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    RealClashBladeAngleScale<LOCKUP_POS>>,
  TrSparkX<
    Remap<
      CenterDistF<RealClashBladeAngleScale<LOCKUP_POS>>,
      Stripes<1500, -3000, CLASH_COLOR, Mix<Int<16384>, Black, CLASH_COLOR>>>,
    Int<100>,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    RealClashBladeAngleScale<LOCKUP_POS>>,
  TrConcat<
    TrInstant,
    CLASH_COLOR,
    TrFadeX<Scale<ClashImpactF<>, Int<200>, Int<400>>>>,
  TrConcat<
    TrInstant,
    CLASH_COLOR,
    TrFadeX<Scale<ClashImpactF<>, Int<300>, Int<500>>>>>;

template<class CLASH_COLOR, class LOCKUP_POS = Int<16000>>
using RealClashLayer = AlphaL<
  TransitionEffectL<RealClashTransition<CLASH_COLOR, LOCKUP_POS>, EFFECT_CLASH>,
  Scale<ClashImpactF<>, Int<24000>, Int<32768>>>;

// ConfigLayersStyle adapter (same role as TransitionEffectConfigL for preon/postoff).
template<class CLASH_COLOR, class LOCKUP_POS = IntArg<2, 16000>>
class RealClashConfigL {
  RealClashLayer<CLASH_COLOR, LOCKUP_POS> layer_;
public:
  bool run(BladeBase* blade) {
    LayerRunResult r = layer_.run(blade);
    if (r == LayerRunResult::UNKNOWN) {
      config_disable_blocked_ = true;
      return true;
    }
    return false;
  }
  auto getColor(int led) -> decltype(layer_.getColor(led)) {
    return layer_.getColor(led);
  }
};

#endif  // STYLES_REAL_CLASH_H
