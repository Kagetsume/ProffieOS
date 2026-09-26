#ifndef STYLES_TEXTURE_LAYERS_H
#define STYLES_TEXTURE_LAYERS_H

// Non-opaque-friendly texture overlays for config/blade_styles.ini layering.
// Use over an opaque base (solid, solid_bend, standard, …) with multiply, screen, or add.
// ConfigLayersStyle automatically clips overlay layers (index >= 1) to lit pixels on the
// base layer during extend/retract — no ext/ret args on texture lines needed.
//
// Examples:
//   layer = standard blue white 300 800
//   layer = multiply opacity 20000 fire_mask white white
//   layer = multiply opacity 12000 stripes 800 -1500 black white
//   layer = add opacity 6000 noise_flicker black cyan

#include "alpha.h"
#include "colors.h"
#include "cylon.h"
#include "sparktip_layer.h"
#include "darksaber.h"
#include "fallen_order.h"
#include "fire.h"
#include "gradient.h"
#include "kinetic_charge.h"
#include "mix.h"
#include "power_wave.h"
#include "pulse_stripes.h"
#include "rainbow.h"
#include "responsive_flame.h"
#include "rotating_pulse.h"
#include "rotoscope.h"
#include "shimmer_blade.h"
#include "smoke_mask.h"
#include "static_electricity.h"
#include "random_bands.h"
#include "sine_waves.h"
#include "saw_waves.h"
#include "pulse_train.h"
#include "chirp.h"
#include "smoothstep_bands.h"
#include "value_noise.h"
#include "fbm_noise.h"
#include "moire_mask.h"
#include "blade_envelope.h"
#include "sine_waves_swing.h"
#include "stripes.h"
#include "thunder_loop.h"
#include "trickle_blade.h"
#include "unstable_blades.h"
#include "water_flow.h"
#include "../functions/inout_ms.h"
#include "../functions/scale.h"
#include "../functions/random.h"
#include "../functions/sound_level.h"
#include "../functions/uniform_brightness_overlay.h"
// Rolling heat texture (StaticFire — no clash/lockup/off fire configs). Same color args as fire.
template<class WARM, class HOT>
using FireMaskLayer = StaticFire<WARM, HOT>;

// Wide rolling smoke toward tip (hilt→tip). Slow heat, low rand — blobs not per-LED flicker.
template<class WARM, class HOT>
using SmokeUpLayer = StyleSmokeLuminance<
  WARM, HOT, 0, 1,
  FireConfig<0, 400, 1>, FireConfig<0, 400, 1>, FireConfig<0, 400, 1>, FireConfig<0, 400, 1>>;

// Wide rolling smoke toward hilt (tip→hilt). Slightly stronger rand — drives upper-blade activity.
template<class WARM, class HOT>
using SmokeDownLayer = StyleSmokeLuminanceReverse<
  WARM, HOT, 0, 1,
  FireConfig<0, 550, 1>, FireConfig<0, 550, 1>, FireConfig<0, 550, 1>, FireConfig<0, 550, 1>>;

// Opposing wide sine smoke rolls (offset dual bands, not fire merge).
template<class WARM, class HOT, class ROLL_SPEED = Int<1>>
using SmokeFlowLayer = StyleSmokeFlow<
  WARM, HOT, 0, ROLL_SPEED,
  FireConfig<0, 400, 1>, FireConfig<0, 550, 1>>;

// Clip smoke to the lit blade during extend/retract. Uses AlphaL + inverted InOutHelperF
// (NOT InOutHelperX — that pattern masks opaque bases with black and inverts on overlays).
template<class WARM, class HOT, class EXT, class RET, class ROLL_SPEED = Int<1>>
using SmokeFlowInOutLayer = AlphaL<
  SmokeFlowLayer<WARM, HOT, ROLL_SPEED>,
  InvertF<InOutHelperF<InOutFuncAuto<EXT, RET>, 0>>>;

template<class WARM, class HOT, class EXT, class RET>
using SmokeUpInOutLayer = AlphaL<
  SmokeUpLayer<WARM, HOT>,
  InvertF<InOutHelperF<InOutFuncAuto<EXT, RET>, 0>>>;

template<class WARM, class HOT, class EXT, class RET>
using SmokeDownInOutLayer = AlphaL<
  SmokeDownLayer<WARM, HOT>,
  InvertF<InOutHelperF<InOutFuncAuto<EXT, RET>, 0>>>;

// Moving soft stripes (width, speed, color1, color2).
template<class WIDTH, class SPEED, class C1, class C2>
using StripesLayer = StripesX<WIDTH, SPEED, C1, C2>;

// Hard-edged stripes variant.
template<class WIDTH, class SPEED, class C1, class C2>
using HardStripesLayer = HardStripesX<WIDTH, SPEED, C1, C2>;

// Irregular-width rolling bands with random gaps (gap default Black for multiply stacks).
template<class SPEED, class BAND, class GAP, class SCALE>
using RandomBandsLayer = RandomBandsX<SPEED, BAND, GAP, SCALE>;

// Up to four sine brightness waves along the blade (multiply mask; period 0 = slot off).
template<
  class P1, class PH1, class MN1, class MX1, class SP1,
  class P2, class PH2, class MN2, class MX2, class SP2,
  class P3, class PH3, class MN3, class MX3, class SP3,
  class P4, class PH4, class MN4, class MX4, class SP4,
  class STRENGTH = Int<65535>>
using SineWavesLayer = SineWavesX<
  P1, PH1, MN1, MX1, SP1,
  P2, PH2, MN2, MX2, SP2,
  P3, PH3, MN3, MX3, SP3,
  P4, PH4, MN4, MX4, SP4,
  STRENGTH>;

// Triangle/saw linear-ramp waves (same slot model as sine_waves; no sin_table).
template<
  class P1, class PH1, class MN1, class MX1, class SP1,
  class P2, class PH2, class MN2, class MX2, class SP2,
  class P3, class PH3, class MN3, class MX3, class SP3,
  class P4, class PH4, class MN4, class MX4, class SP4,
  class STRENGTH = Int<65535>>
using SawWavesLayer = SawWavesX<
  P1, PH1, MN1, MX1, SP1,
  P2, PH2, MN2, MX2, SP2,
  P3, PH3, MN3, MX3, SP3,
  P4, PH4, MN4, MX4, SP4,
  STRENGTH>;

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class DUTY>
using PulseTrainLayer = PulseTrainX<PERIOD, SPEED, MIN_B, MAX_B, DUTY>;

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class CHIRP>
using ChirpLayer = ChirpX<PERIOD, SPEED, MIN_B, MAX_B, CHIRP>;

template<class PERIOD, class SPEED, class MIN_B, class MAX_B, class EDGE>
using SmoothstepBandsLayer = SmoothstepBandsX<PERIOD, SPEED, MIN_B, MAX_B, EDGE>;

template<class SCALE, class SPEED, class MIN_B, class MAX_B, class SEED = Int<0>>
using ValueNoiseLayer = ValueNoiseX<SCALE, SPEED, MIN_B, MAX_B, SEED>;

template<class SCALE, class SPEED, class MIN_B, class MAX_B, class STRENGTH = Int<65535>>
using FbmNoiseLayer = FbmNoiseX<SCALE, SPEED, MIN_B, MAX_B, STRENGTH>;

template<class P1, class P2, class S1, class S2, class MIN_B, class MAX_B>
using MoireMaskLayer = MoireMaskX<P1, P2, S1, S2, MIN_B, MAX_B>;

template<class CENTER, class WIDTH, class MIN_B, class MAX_B, class SPEED = Int<0>>
using BladeEnvelopeLayer = BladeEnvelopeX<CENTER, WIDTH, MIN_B, MAX_B, SPEED>;

template<
  class P1, class PH1, class MN1, class MX1, class SP1,
  class P2, class PH2, class MN2, class MX2, class SP2,
  class P3, class PH3, class MN3, class MX3, class SP3,
  class P4, class PH4, class MN4, class MX4, class SP4,
  class STRENGTH = Int<65535>,
  class SWING_SCALE = Int<0>,
  class TWIST_SCALE = Int<0>>
using SineWavesSwingLayer = SineWavesSwingX<
  P1, PH1, MN1, MX1, SP1,
  P2, PH2, MN2, MX2, SP2,
  P3, PH3, MN3, MX3, SP3,
  P4, PH4, MN4, MX4, SP4,
  STRENGTH, SWING_SCALE, TWIST_SCALE>;

// UnstableBlades stripe/noise band only (no full InOutHelper wrapper).
template<class BASE>
using UnstableStripesLayer = UnstableBladesStripesBase<BASE>;

// Uniform whole-blade brightness overlay (multiply over layers below).
// WAVE: 0–32768 driver (sine, random hold, …); DELTA: +/- brightness percent.
template<class WAVE, class DELTA = Int<10>>
using BrightnessOverlayLayer = Mix<
  UniformBrightnessOverlayF<WAVE, DELTA>,
  Black,
  White>;

// Random +/- flicker — delta_percent min_period_ms max_period_ms.
template<class DELTA, class MIN_MS, class MAX_MS>
using BaseFlickerOverlay = BrightnessOverlayLayer<
  RandomHoldWaveF<MIN_MS, MAX_MS>,
  DELTA>;

// Smooth breathing pulse — pulse_ms (delta defaults to 10%).
template<class PULSE_MS>
using PulseLayerOverlay = BrightnessOverlayLayer<
  PulsingF<PULSE_MS>>;

// Uniform swing brightening — idle = no change, harder swing = up to +delta% (multiply preserves hue).
template<class DELTA = Int<10>, class THRESHOLD = Int<200>>
using SwingLayerOverlay = Mix<
  SwingBoostOverlayF<THRESHOLD, DELTA>,
  Black,
  White>;

// Per-LED random brightness mask — multiply over layers below preserves underlying hue.
using PerLedFlickerLayer = Mix<RandomPerLEDF, Black, White>;

// Hum-reactive uniform brightness — same driver as AudioFlicker, as multiply mask.
using AudioLayerOverlay = Mix<NoisySoundLevelCompat, Black, White>;

// Hilt-to-tip color gradient — stack with normal blend; layer opacity sets mix vs base below.
template<class HILT, class TIP>
using GradientLayer = Gradient<HILT, TIP>;

// Animated sin-table RGB rainbow — stack with normal blend; opacity tints base toward full rainbow.
using RainbowLayer = Rainbow;

// OS7 / interactive idle bases extracted for config layering (multiply/normal/add over solid_bend).
template<class BASE_COLOR>
using WaterFlowLayer = WaterFlowStripesBase<BASE_COLOR>;

template<class BASE_COLOR>
using DarkSaberLayer = DarkSaberFlickerBase<BASE_COLOR>;

template<class BASE_COLOR>
using StaticElectricityLayer = StaticElectricityBladeBase<BASE_COLOR>;

template<class BASE_COLOR>
using PowerWaveLayer = PowerWaveStripesBase<BASE_COLOR>;

template<class BASE_COLOR>
using FallenOrderLayer = FallenOrderStripesBase<BASE_COLOR>;

template<class BASE_COLOR>
using ShimmerBladeLayer = ShimmerBladeBase<BASE_COLOR>;

template<class BASE_COLOR>
using RotoscopeLayer = RotoscopeBladeBase<BASE_COLOR>;

template<class BASE_COLOR>
using PulseStripesLayer = PulseStripesBladeBase<BASE_COLOR>;

template<class BASE_COLOR, class KINETIC_COLOR>
using KineticChargeLayer = KineticChargeBladeBase<BASE_COLOR, KINETIC_COLOR>;

template<class BASE_COLOR>
using RotatingPulseLayer = RotatingPulseStripesBase<BASE_COLOR>;

template<class BASE_COLOR>
using TrickleBladeLayer = TrickleBladeBase<BASE_COLOR>;

// Cylon scanner band — stack with add over solid_bend (black sections add nothing).
template<class SCAN_COLOR, class ON_PERCENT, class ON_RPM>
using CylonLayer = CylonConfigL<SCAN_COLOR, ON_PERCENT, ON_RPM>;

#endif  // STYLES_TEXTURE_LAYERS_H
