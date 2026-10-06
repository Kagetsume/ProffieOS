#ifndef STYLES_OS7_MONOLITH_FACTORIES_H
#define STYLES_OS7_MONOLITH_FACTORIES_H

// Static StyleFactory instances for Fett263 OS7 monolith + *_layer pairs (Phase 2).

#include "os7_monolith_common.h"
#include "water_flow.h"
#include "darksaber.h"
#include "static_electricity.h"
#include "power_wave.h"
#include "unstable_blades.h"
#include "fallen_order.h"
#include "thunder_loop.h"
#include "responsive_flame.h"
#include "shimmer_blade.h"
#include "rotoscope.h"
#include "pulse_stripes.h"
#include "kinetic_charge.h"
#include "rotating_pulse.h"
#include "trickle_blade.h"

using WaterFlowOs7Base = WaterFlowStripesBase<RgbArg<1, Blue>>;
static Os7IdleBaseStyleFactory<WaterFlowOs7Base> water_flow_layer_factory;
static Os7MonolithFromBaseStyleFactory<WaterFlowOs7Base> water_flow_factory;

using DarkSaberOs7Base = DarkSaberFlickerBase<RgbArg<1, Rgb<100, 100, 150>>>;
static Os7IdleBaseStyleFactory<DarkSaberOs7Base> darksaber_layer_factory;
static Os7MonolithFromBaseStyleFactory<DarkSaberOs7Base> darksaber_factory;

using StaticElectricityOs7Base = StaticElectricityBladeBase<RgbArg<1, Rgb<0, 135, 255>>>;
static Os7IdleBaseStyleFactory<StaticElectricityOs7Base> static_electricity_layer_factory;
static Os7MonolithFromBaseStyleFactory<StaticElectricityOs7Base> static_electricity_factory;

using PowerWaveOs7Base = PowerWaveStripesBase<RgbArg<1, Rgb<100, 100, 150>>>;
static Os7IdleBaseStyleFactory<PowerWaveOs7Base> power_wave_layer_factory;
static Os7MonolithFromBaseStyleFactory<PowerWaveOs7Base> power_wave_factory;

using UnstableBladesOs7Base = UnstableBladesStripesBase<RgbArg<1, Rgb<100, 100, 150>>>;
static Os7MonolithFromBaseStyleFactory<UnstableBladesOs7Base> unstable_blades_factory;

using FallenOrderOs7Base = FallenOrderStripesBase<RgbArg<1, Rgb<100, 100, 150>>>;
static Os7IdleBaseStyleFactory<FallenOrderOs7Base> fallen_order_layer_factory;
static Os7MonolithFromBaseStyleFactory<FallenOrderOs7Base> fallen_order_factory;

using ThunderLoopOs7Base = ThunderLoopBlade<RgbArg<1, Blue>>;
using ThunderLoopLayerBase = ThunderLoopConfigL<RgbArg<1, Blue>>;
static Os7IdleBaseStyleFactory<ThunderLoopLayerBase> thunder_loop_layer_factory;
static Os7MonolithFromBaseStyleFactory<ThunderLoopOs7Base> thunder_loop_factory;

using ResponsiveFlameOs7Base = ResponsiveFlameBlade<RgbArg<1, Red>>;
using ResponsiveFlameLayerBase = ResponsiveFlameInner<RgbArg<1, Red>>;
static Os7IdleBaseStyleFactory<ResponsiveFlameLayerBase> responsive_flame_layer_factory;
static Os7MonolithFromBaseStyleFactory<ResponsiveFlameOs7Base> responsive_flame_factory;

using ShimmerBladeOs7Base = ShimmerBladeBase<RgbArg<1, Cyan>>;
static Os7IdleBaseStyleFactory<ShimmerBladeOs7Base> shimmer_blade_layer_factory;
static Os7MonolithFromBaseStyleFactory<ShimmerBladeOs7Base> shimmer_blade_factory;

using RotoscopeOs7Base = RotoscopeBladeBase<RgbArg<1, Rgb<100, 100, 150>>>;
static Os7IdleBaseStyleFactory<RotoscopeOs7Base> rotoscope_layer_factory;
static Os7MonolithFromBaseStyleFactory<RotoscopeOs7Base> rotoscope_factory;

using PulseStripesOs7Base = PulseStripesBladeBase<RgbArg<1, Blue>>;
static Os7IdleBaseStyleFactory<PulseStripesOs7Base> pulse_stripes_layer_factory;
static Os7MonolithFromBaseStyleFactory<PulseStripesOs7Base> pulse_stripes_factory;

using KineticChargeOs7Base = KineticChargeBladeBase<RgbArg<1, Blue>, RgbArg<2, Rgb<118, 0, 194>>>;
static Os7IdleBaseStyleFactory<KineticChargeOs7Base> kinetic_charge_layer_factory;
static Os7MonolithFromBaseKineticFactory<KineticChargeOs7Base> kinetic_charge_factory;

using RotatingPulseOs7Base = RotatingPulseStripesBase<RgbArg<1, Blue>>;
static Os7IdleBaseStyleFactory<RotatingPulseOs7Base> rotating_pulse_layer_factory;
static Os7MonolithFromBaseStyleFactory<RotatingPulseOs7Base> rotating_pulse_factory;

using TrickleBladeOs7Base = TrickleBladeBase<RgbArg<1, Green>>;
static Os7IdleBaseStyleFactory<TrickleBladeOs7Base> trickle_blade_layer_factory;
static Os7MonolithFromBaseStyleFactory<TrickleBladeOs7Base> trickle_blade_factory;

#endif  // STYLES_OS7_MONOLITH_FACTORIES_H
