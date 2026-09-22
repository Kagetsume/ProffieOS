#ifndef STYLES_SPARKTIP_LAYER_H
#define STYLES_SPARKTIP_LAYER_H

// Composable spark-tip texture for config/blade_styles.ini.
// Emits only the InOutSparkTip spark band (no off-color mask) for add/normal stacks.
//
// Stack over solid_bend / solid with matching ext/ret on this layer line:
//   layer = solid_bend green 300 800
//   layer = add opacity 32768 sparktip_layer white 300 800
//
// Use -1 for extend_ms / retract_ms to match ignition/retraction sound length (same as base).
// ConfigLayersStyle auto-clips add/normal overlays to lit base pixels during in/out.

#include "colors.h"
#include "mix.h"
#include "../functions/inout_ms.h"
#include "../functions/int_arg.h"
#include "../functions/svf.h"

template<class SPARK_COLOR, class EXT, class RET>
class SparkTipLayerConfigL {
public:
  bool run(BladeBase* blade) {
    RunFunction(&extension_, blade);
    on_ = blade->is_on();
    thres_ = (extension_.calculate(blade) * (blade->num_leds() + 4)) >> 7;
    spark_color_.run(blade);
    if (thres_ == 0) return false;
    return true;
  }

  auto getColor(int led) -> decltype(MixColors(Black, spark_color_.getColor(0), 1, 8)) {
    if (!on_) return Black;
    int spark_mix = clampi32(thres_ - 1024 - led * 256, 0, 255);
    if (spark_mix <= 0) return Black;
    return MixColors(Black, spark_color_.getColor(led), spark_mix, 8);
  }

private:
  PONUA SVFWrapper<InOutFuncAuto<EXT, RET>> extension_;
  SPARK_COLOR spark_color_;
  bool on_ = false;
  int thres_ = 0;
};

template<class SPARK_COLOR, class EXT, class RET>
using SparkTipLayer = SparkTipLayerConfigL<SPARK_COLOR, EXT, RET>;

#endif
