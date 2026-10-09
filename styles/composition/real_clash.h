#ifndef STYLES_REAL_CLASH_H
#define STYLES_REAL_CLASH_H

// Real Clash V1 overlay (Fett263 OS7-style): TrSelect among bump / wave / spark / fade
// paths based on ClashImpactF. For config/blade_styles.ini layers.
// Requires clash strength from the prop (Real Clash / GetClashStrength) for path selection.
//
// Second arg — blade band position:
//   49% / 49     fixed center along blade (0% hilt, 100% tip), OS7 angle-modulated band
//   angle        band center follows blade tilt (ResponsiveClash-style mapping)

#include "../alpha.h"
#include "../transition_effect.h"
#include "../stripes.h"
#include "../mix.h"
#include "../remap.h"
#include "config_layers_style.h"
#include "../../common/arg_parser.h"
#include "../../functions/blade_angle.h"
#include "../../functions/bump.h"
#include "../../functions/center_dist.h"
#include "../../functions/clash_impact.h"
#include "../../functions/int_arg.h"
#include "../../functions/scale.h"
#include "../../functions/sum.h"
#include "../../transitions/select.h"
#include "../../transitions/wave.h"
#include "../../transitions/concat.h"
#include "../../transitions/instant.h"
#include "../../transitions/fade.h"

inline bool RealClashUsesAnglePosition(const char* token) {
  return token && token[0] && FirstWord(token, "angle");
}

// OS7 fixed lockup_position with blade-tilt modulation (LOCKUP_POS = band center 0–32768).
template<class LOCKUP_POS>
using RealClashFixedPositionScale = Scale<
  BladeAngle<>,
  Scale<BladeAngle<0, 16000>,
    Sum<LOCKUP_POS, Int<-12000>>,
    Sum<LOCKUP_POS, Int<10000>>>,
  Sum<LOCKUP_POS, Int<-10000>>>;

// Blade-tilt → position along strip (defaults aligned with ResponsiveClashL).
using RealClashAnglePositionScale = Scale<
  BladeAngle<>,
  Scale<BladeAngle<0, 16000>, Int<4000>, Int<26000>>,
  Int<6000>>;

template<class CLASH_COLOR, class POS_SCALE>
using RealClashTransition = TrSelect<
  Scale<ClashImpactF<>, Int<0>, Int<4>>,
  TrConcat<
    TrInstant,
    AlphaL<
      CLASH_COLOR,
      Bump<POS_SCALE, Scale<ClashImpactF<>, Int<8000>, Int<12000>>>>,
    TrFadeX<Scale<ClashImpactF<>, Int<200>, Int<600>>>>,
  TrWaveX<
    CLASH_COLOR,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    Int<100>,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    POS_SCALE>,
  TrSparkX<
    Remap<
      CenterDistF<POS_SCALE>,
      Stripes<1500, -3000, CLASH_COLOR, Mix<Int<16384>, Black, CLASH_COLOR>>>,
    Int<100>,
    Scale<ClashImpactF<>, Int<100>, Int<400>>,
    POS_SCALE>,
  TrConcat<
    TrInstant,
    CLASH_COLOR,
    TrFadeX<Scale<ClashImpactF<>, Int<200>, Int<400>>>>,
  TrConcat<
    TrInstant,
    CLASH_COLOR,
    TrFadeX<Scale<ClashImpactF<>, Int<300>, Int<500>>>>>;

template<class CLASH_COLOR, class POS_SCALE>
using RealClashLayer = AlphaL<
  TransitionEffectL<RealClashTransition<CLASH_COLOR, POS_SCALE>, EFFECT_CLASH>,
  Scale<ClashImpactF<>, Int<24000>, Int<32768>>>;

template<class CLASH_COLOR, class LOCKUP_POS>
using RealClashLayerFixed = RealClashLayer<CLASH_COLOR, RealClashFixedPositionScale<LOCKUP_POS>>;

template<class CLASH_COLOR>
using RealClashLayerAngle = RealClashLayer<CLASH_COLOR, RealClashAnglePositionScale>;

// ConfigLayersStyle adapter (same role as TransitionEffectConfigL for preon/postoff).
template<class CLASH_COLOR, class LOCKUP_POS = BladePositionIntArg<2, 16000>>
class RealClashConfigL {
  RealClashLayerFixed<CLASH_COLOR, LOCKUP_POS> layer_;
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

template<class CLASH_COLOR>
class RealClashAngleConfigL {
  RealClashLayerAngle<CLASH_COLOR> layer_;
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

class RealClashFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* pos = CurrentArgParser->GetArg(2, "", "");
    if (RealClashUsesAnglePosition(pos)) {
      return StylePtr<RealClashAngleConfigL<RgbArg<1, White>> >()->make();
    }
    return StylePtr<RealClashConfigL<RgbArg<1, White>, BladePositionIntArg<2, 16000>> >()->make();
  }
};

static RealClashFactory real_clash_factory;

#endif  // STYLES_REAL_CLASH_H
