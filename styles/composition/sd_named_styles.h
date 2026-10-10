  { "standard_bend",
    &standard_bend_style_factory,
    NAMED_STYLE_DESC(    "Compositor blade with the same clash, lockup, and blast as standard. "
    "No wipe inside a config section. Default curve is bend. "
    "base_color clash_color extend_ms retract_ms lockup_color blast_color. Use -1 to match sound length.")
  },
  { "solid",
    &solid_color_style_factory,
    NAMED_STYLE_DESC(    "Solid color (no built-in clash/lockup/blast or wipe): base_color [extend_ms retract_ms]. "
    "Extend/retract is the stack transition mask, default bend like solid_bend. "
    "Use -1 to match the ignition/retraction sound length. Inside a config section, "
    "transition = bend {{ext}} {{ret}} sets the wipe; leftover times on this line are used when transition is omitted.")
  },
  { "solid_bend",
    &solid_color_style_factory,
    NAMED_STYLE_DESC(    "Same color base as solid. The name remains so existing recipes keep working. "
    "Extend/retract is the stack transition mask (default bend), not a wipe inside this layer. "
    "base_color [extend_ms retract_ms]. Use -1 to match sound length.")
  },
  { "strip_column", &config_strip_column_factory,
    NAMED_STYLE_DESC(    "SD column animation base: file_path source_height fps [frames_x|frames_y] extend_ms retract_ms. "
    "Normal 24-bit uncompressed .bmp on SD. No wipe of its own inside a config section; "
    "the section transition mask extends and retracts it. Times on this line feed that mask when transition is omitted. "
    "Use -1 for extend/retract to match sound length. Missing/invalid file: scrolling strobe red danger bands.")
  },
  { "strip_column_mask", &strip_column_mask_factory,
    NAMED_STYLE_DESC(    "SD column BMP multiply mask: file_path source_height fps. Same 24-bit BMP layout as "
    "strip_column (always frames_y). Grayscale R=G=B; stack as multiply opacity … strip_column_mask. "
    "Missing/invalid file: danger fallback pattern while blade is on.")
  },
  // Full pixel blades (opaque; use alone or as bottom layer in config sections).
  { "gradient",
    &config_gradient_factory,
    NAMED_STYLE_DESC(    "Gradient blade: hilt_color tip_color clash_color blast_color lockup_color extend_ms retract_ms. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "audio",
    &config_audio_factory,
    NAMED_STYLE_DESC(    "Audio-reactive blade (hum flicker base): base_color flicker_color clash_color extend_ms retract_ms. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "flicker",
    &config_flicker_factory,
    NAMED_STYLE_DESC(    "Brown-noise flicker blade: warm_color hot_color clash_color extend_ms retract_ms. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "sparkle_blade",
    &config_sparkle_blade_factory,
    NAMED_STYLE_DESC(    "Sparkle base blade: base_color sparkle_color blast_color lockup_color clash_color extend_ms retract_ms. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "cylon",
    &config_cylon_factory,
    NAMED_STYLE_DESC(    "Cylon scanner blade: scan_color clash_color extend_ms retract_ms (25% lit, 200 RPM when on). "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "pulse_blade",
    &config_pulse_blade_factory,
    NAMED_STYLE_DESC(    "Pulsing blade: off_color on_color pulse_ms extend_ms retract_ms. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it. Default curve is linear. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "water_flow",
    &config_water_flow_factory,
    NAMED_STYLE_DESC(    "Interactive water-flow blade (Fett263 WaterBlade stripes): base_color clash_color extend_ms retract_ms. "
    "Stripe speed/direction follows blade angle; hard upward swing can reverse flow. "
    "No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "static_electricity",
    &config_static_electricity_factory,
    NAMED_STYLE_DESC(    "Interactive static electricity blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "Swing to build charge; clash or lockup dissipates. Default base Rgb<0,135,255> (deepskyblue). No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "power_wave",
    &config_power_wave_factory,
    NAMED_STYLE_DESC(    "Power Wave blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "Wide slow reverse stripes; default base Rgb<100,100,150> (silver). No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "unstable_blades",
    &config_unstable_blades_factory,
    NAMED_STYLE_DESC(    "Unstable Pulse blade (Fett263 UnstableBlades OS7): base_color clash_color extend_ms retract_ms. "
    "Crackling stripes with SlowNoise-driven speed; default base silver. Not the same as named style \"unstable\". No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "fallen_order",
    &config_fallen_order_factory,
    NAMED_STYLE_DESC(    "Fallen Order blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "Wide stripes with pulsing mid-band (800ms); default base Rgb<100,100,150> (silver). No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "thunder_loop",
    &config_thunder_loop_factory,
    NAMED_STYLE_DESC(    "Thunderstorm idle loop (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "TransitionLoop TrBoing + rolling stripes + SlowNoise delay; default base blue. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "thunder_loop_layer",
    &thunder_loop_layer_factory,
    NAMED_STYLE_DESC(    "Thunderstorm loop texture only (Fett263 OS7): base_color (default blue). "
    "Use multiply/screen over an opaque base; does not include clash/lockup/blast.")
  },
  { "responsive_flame",
    &config_responsive_flame_factory,
    NAMED_STYLE_DESC(    "Responsive Flame blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "Angle-responsive dual StaticFire gradient; default base red. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "responsive_flame_layer",
    &responsive_flame_layer_factory,
    NAMED_STYLE_DESC(    "Responsive Flame texture only (Fett263 OS7): base_color (default red). "
    "Use multiply/screen over an opaque base; does not include clash/lockup/blast.")
  },
  { "shimmer_blade",
    &config_shimmer_blade_factory,
    NAMED_STYLE_DESC(    "Interactive Shimmer blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "Swing harder for faster, longer stripe shimmer (HoldPeakF + RandomFlicker). No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "rotoscope",
    &config_rotoscope_factory,
    NAMED_STYLE_DESC(    "Hyper responsive rotoscope blade (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "SwingAcceleration drives HoldPeakF stripe speed and mix (OT-style RandomFlicker bands). Default base silver. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "pulse_stripes",
    &config_pulse_stripes_factory,
    NAMED_STYLE_DESC(    "Ignition-surge pulse stripes (Fett263 OS7): base_color clash_color extend_ms retract_ms. "
    "HoldPeakF on ignition/alt-sound drives StripesX width and speed; Pulsing mid-band 1400 ms. Default base blue. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "kinetic_charge",
    &config_kinetic_charge_factory,
    NAMED_STYLE_DESC(    "Interactive kinetic charge blade (Fett263 OS7 BlackPanther idle base): base_color kinetic_color clash_color extend_ms retract_ms. "
    "Clash/lockup build kinetic stripes; long swing decay releases. Default kinetic Rgb<118,0,194>. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "rotating_pulse",
    &config_rotating_pulse_factory,
    NAMED_STYLE_DESC(    "Rotating pulse blade (Fett263 OS7 EnergyBlade Rotating Pulse): base_color clash_color extend_ms retract_ms. "
    "Wide StripesX with Saw-modulated speed (direction reverses). Default base blue. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  { "trickle_blade",
    &config_trickle_blade_factory,
    NAMED_STYLE_DESC(    "Energy trickle blade (Fett263 OS7 idle base): base_color clash_color extend_ms retract_ms. "
    "StaticFire + angle StripesX + HoldPeakF swing bands + tip-weighted flame. Default base green. No wipe of its own inside a config section; the section transition mask extends and retracts it.")
  },
  // Overlay layers for config/blade_styles.ini (transparent or blend-friendly; stack on a base layer).
  // BlastL returns RGBA_um_nod; Style<> + getLayerColor() preserve alpha for ConfigLayersStyle (see style_ptr.h).
  { "blast",
    StylePtr<BlastL<RgbArg<1, White>>>(),
    NAMED_STYLE_DESC(    "Blast overlay layer: blast color only (fade/wave timing fixed at 200/100/400 ms in template). Mostly transparent until a blast — use an opaque base layer first")
  },
  { "blast_wave_random",
    StylePtr<TransitionEffectConfigL<
      TrWaveX<RgbArg<1, White>,
              Scale<EffectRandomF<EFFECT_BLAST>, Int<100>, Int<400>>,
              Int<100>,
              Scale<EffectPosition<EFFECT_BLAST>, Int<100>, Int<400>>,
              Scale<EffectPosition<EFFECT_BLAST>, Int<28000>, Int<8000>>>,
      EFFECT_BLAST>>(),
    NAMED_STYLE_DESC(    "Blast overlay: OS7-style random wave (TrWaveX + EffectRandomF + EffectPosition); flash_color (default white). Transparent until blast")
  },
  { "responsive_blast",
    StylePtr<ResponsiveBlastWaveL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Responsive blast overlay: blade-angle positioned wave (ResponsiveBlastWaveL). flash_color (default white). Transparent until blast")
  },
  { "clash",
    StylePtr<SimpleClashL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Clash flash overlay layer: flash_color (transparent until clash)")
  },
  { "localized_clash",
    StylePtr<LocalizedClashL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Localized clash overlay: flash_color (positioned band; transparent until clash). "
    "Timing/width are compile-time defaults (40 ms, 50%% width).")
  },
  { "responsive_clash",
    StylePtr<ResponsiveClashL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Responsive clash overlay: blade-angle positioned bump band (ResponsiveClashL). flash_color (default white). Transparent until clash")
  },
  { "real_clash",
    StylePtr<RealClashConfigL<RgbArg<1, White>, IntArg<2, 16000>> >(),
    NAMED_STYLE_DESC(    "Real Clash V1 overlay (OS7): clash_color lockup_position (default white 16000). Impact strength picks bump/wave/spark/fade path; uses GetClashStrength")
  },
  { "responsive_lockup",
    StylePtr<ResponsiveLockupL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Responsive lockup overlay (localized bump, blade-angle reactive): lockup_color")
  },
  { "sparkle",
    StylePtr<SparkleL<RgbArg<1, White>, 300, 1024> >(),
    NAMED_STYLE_DESC(    "Sparkle overlay layer: sparkle_color (use add/screen blend over a base layer)")
  },
  { "pulse",
    StylePtr<PulsingL<RgbArg<1, White>, IntArg<2, 3000>> >(),
    NAMED_STYLE_DESC(    "Pulse overlay layer: pulse_color pulse_ms (use add or multiply blend over a base layer)")
  },
  { "swing",
    StylePtr<AlphaL<RgbArg<1, White>, SwingSpeedX<IntArg<2, 200>>> >(),
    NAMED_STYLE_DESC(    "Swing brightening overlay: color speed_threshold (brighter when swinging; use add blend)")
  },
  { "drag",
    StylePtr<ResponsiveDragL<RgbArg<1, Orange>> >(),
    NAMED_STYLE_DESC(    "Responsive drag overlay: drag_color (twist-controlled drag effect)")
  },
  { "melt",
    StylePtr<ResponsiveMeltL<RgbArg<1, OrangeRed>> >(),
    NAMED_STYLE_DESC(    "Responsive melt overlay: melt_color (twist-controlled melt effect)")
  },
  { "lb",
    StylePtr<ResponsiveLightningBlockL<RgbArg<1, White>> >(),
    NAMED_STYLE_DESC(    "Responsive lightning-block overlay: block_color")
  },
  // Texture overlays — rolling masks, stripes, noise (stack with multiply/screen/add over opaque base).
  { "fire_mask",
    StylePtr<FireMaskLayer<RgbArg<1, Black>, RgbArg<2, White>> >(),
    NAMED_STYLE_DESC(    "Rolling heat mask for layering; warm_color hot_color (default black white). Use multiply opacity ~20000 over a base")
  },
  { "smoke_up",
    StylePtr<SmokeUpLayer<RgbArg<1, Black>, RgbArg<2, White>> >(),
    NAMED_STYLE_DESC(    "Slow organic smoke bands toward tip (hilt→tip); dark light. "
    "Extend/retract comes from the stack mask on the base. multiply black white; screen black <base>")
  },
  { "smoke_down",
    StylePtr<SmokeDownLayer<RgbArg<1, Black>, RgbArg<2, White>> >(),
    NAMED_STYLE_DESC(    "Slow organic smoke bands toward hilt (tip→hilt); dark light. "
    "Extend/retract comes from the stack mask on the base. multiply black white; screen black <base>")
  },
  { "smoke_flow",
    StylePtr<SmokeFlowLayer<RgbArg<1, Black>, RgbArg<2, White>, IntArg<3, 1>> >(),
    NAMED_STYLE_DESC(    "Wide rolling smoke (offset dual sine bands); dark light speed. "
    "speed 1 = default roll; higher = faster. No extend/retract args — the stack mask follows the base. "
    "multiply black white = dim smoke; screen black <base> = bright wisps")
  },
  { "stripes",
    StylePtr<StripesLayer<IntArg<1, 1000>, IntArg<2, -2000>, RgbArg<3, Blue>, RgbArg<4, Cyan>> >(),
    NAMED_STYLE_DESC(    "Moving soft stripes texture; width speed color1 color2 (default 1000 -2000 blue cyan). Use multiply or add blend")
  },
  { "hard_stripes",
    StylePtr<HardStripesLayer<IntArg<1, 1000>, IntArg<2, -3000>, RgbArg<3, Black>, RgbArg<4, White>> >(),
    NAMED_STYLE_DESC(    "Hard-edged stripes texture; width speed color1 color2 (default 1000 -3000 black white)")
  },
  { "random_bands",
    StylePtr<RandomBandsLayer<IntArg<1, -2000>, RgbArg<2, Green>, RgbArg<3, Black>, IntArg<4, 2400>> >(),
    NAMED_STYLE_DESC(    "Irregular rolling bands with random gaps; speed band_color [gap_color] [scale] "
    "(default gap black scale 2400). multiply + black gaps leaves base unchanged; add tints bands only")
  },
  { "sine_waves",
    &waves_sine_factory,
    NAMED_STYLE_DESC(    "Sine brightness waves along blade (multiply mask). Five ints per wave: period phase min max speed; "
    "period 0 disables a slot (default waves 2–4 off). min/max/strength accept 0–100% or raw 0–65535 (>100). "
    "Example: sine_waves 2400 0 12.5% 100% -2000 1800 512 0 100% 2000")
  },
  { "saw_waves",
    &waves_saw_factory,
    NAMED_STYLE_DESC(    "Triangle brightness waves along blade (multiply mask). Same args as sine_waves (period 0 = slot off). "
    "Example: saw_waves 2400 0 12.5% 100% -2000")
  },
  { "hue_waves",
    &waves_hue_factory,
    NAMED_STYLE_DESC(    "Sine hue-offset waves along blade. Five ints per wave: period phase min_hue max_hue speed; "
    "period 0 disables a slot (default waves 2–4 off). min/max are RotateColorsX units "
    "(0 = no shift, 16384 = 180 deg, 32768 = 360 deg). Optional strength (default 65535) mixes toward 0. "
    "Stack with hue blend, not multiply. Example: hue_waves 2400 0 0 8192 -2000")
  },
  { "pulse_train",
    &procedural_pulse_train_factory,
    NAMED_STYLE_DESC(    "Rolling hard on/off square bands (multiply mask); period speed min max duty (duty 0–32768 lit fraction). "
    "min/max accept 0–100% or raw 0–65535. period 0 = passthrough. Example: pulse_train 2400 -2000 0 100% 50%")
  },
  { "chirp",
    &procedural_chirp_factory,
    NAMED_STYLE_DESC(    "Sine wave with spatial frequency sweep along blade (multiply mask). period_base speed min max chirp_rate; "
    "min/max accept 0–100% or raw 0–65535. period 0 = passthrough. Example: chirp 2400 -2000 12.5% 100% 80")
  },
  { "smoothstep_bands",
    &procedural_smoothstep_bands_factory,
    NAMED_STYLE_DESC(    "Rolling soft rectangular bands; period speed min max edge_width (period 0 = passthrough). "
    "Example: smoothstep_bands 2400 -2000 12.5% 100% 400")
  },
  { "value_noise",
    &procedural_value_noise_factory,
    NAMED_STYLE_DESC(    "1D smooth hash noise along blade; scale speed min max [seed]. scale 0 = passthrough. "
    "Example: value_noise 2400 -2000 12.5% 100% 0")
  },
  { "fbm_noise",
    &procedural_fbm_noise_factory,
    NAMED_STYLE_DESC(    "Cheap 3-octave 1D noise (multiply mask); scale speed min max strength. scale 0 = passthrough. "
    "Example: fbm_noise 2400 -2000 12.5% 100% 100%")
  },
  { "moire_mask",
    &procedural_moire_mask_factory,
    NAMED_STYLE_DESC(    "Two beating linear ramps; period1 period2 speed1 speed2 min max. period 0 = that ramp neutral. "
    "Example: moire_mask 2400 2450 -2000 2100 12.5% 100%")
  },
  { "blade_envelope",
    &procedural_blade_envelope_factory,
    NAMED_STYLE_DESC(    "Bump along blade (center width min max [speed]); center 0=hilt 32768=tip. speed 0 = static. "
    "Example: blade_envelope 50% 6000 12.5% 100% 0")
  },
  { "sine_waves_swing",
    &waves_sine_swing_factory,
    NAMED_STYLE_DESC(    "sine_waves args + swing_scale twist_scale at end (args 22–23). Stronger swing/twist = shorter wavelength. "
    "Example: sine_waves_swing 2400 0 12.5% 100% -2000 0 0 0 100% 0 0 0 100% 0 0 0 100% 0 0 0 100% 0 100% 12000 8000")
  },
  { "noise_flicker",
    StylePtr<BrownNoiseFlicker<RgbArg<1, Black>, RgbArg<2, White>, 100> >(),
    NAMED_STYLE_DESC(    "Organic flicker texture; base_color flicker_color (default black white). Use multiply over base")
  },
  { "base_flicker",
    StylePtr<BaseFlickerOverlay<
      IntArg<1, 10>,
      IntArg<2, 300>,
      IntArg<3, 500>
    > >(),
    NAMED_STYLE_DESC(    "Uniform alpha-style brightness flicker over layers below: delta_percent min_period_ms max_period_ms "
    "(default 10 300 500). No ext/ret on layer line (multiply stack). "
    "Stack as: layer = multiply opacity 32768 base_flicker 10 300 500")
  },
  { "pulse_layer",
    StylePtr<PulseLayerOverlay<IntArg<1, 3000>, IntArg<2, 10>> >(),
    NAMED_STYLE_DESC(    "Smooth breathing brightness pulse over layers below: pulse_ms [delta_percent] (defaults 3000, 10). "
    "delta_percent = +/- brightness swing (try 18–25 for visible idle pulse). "
    "No ext/ret on layer line (multiply stack). "
    "Stack as: layer = multiply opacity 100% pulse_layer 2000 20")
  },
  { "swing_layer",
    StylePtr<SwingLayerOverlay<IntArg<1, 10>, IntArg<2, 200>> >(),
    NAMED_STYLE_DESC(    "Uniform swing brightening over layers below: delta_percent speed_threshold (default 10 200). "
    "Idle = no change; faster swing = up to +delta%% brightness (hue preserved vs add swing). "
    "No ext/ret on layer line (multiply stack). Stack: layer = multiply opacity 32768 swing_layer 10 200")
  },
  { "unstable_layer",
    StylePtr<ClassicUnstableIdleBase<RgbArg<1, Rgb<150, 0, 0>>, RgbArg<2, Red>, RgbArg<3, Rgb<255, 40, 0>>, RgbArg<4, Rgb<255, 255, 10>>> >(),
    NAMED_STYLE_DESC(    "Classic unstable idle (Kylo crackle): warm warmer hot sparks — BrownNoiseFlicker + Strobe + Sparkle "
    "(same idle as monolith unstable). Stack normal opacity 100% over solid_bend.")
  },
  { "on_spark_layer",
    StylePtr<AlphaL<RgbArg<1, White>, OnSparkF<IntArg<2, 100>>> >(),
    NAMED_STYLE_DESC(    "Ignition OnSpark flash over layers below: spark_color fade_ms (monolith unstable idle uses white 100). "
    "Stack add opacity 100% over unstable_layer.")
  },
  { "unstable_lockup_layer",
    StylePtr<LockupL<
      ClassicUnstableLockupLayerColor<RgbArg<1, Red>, RgbArg<2, White>, IntArg<3, 200>>,
      ClassicUnstableLockupLayerColor<RgbArg<1, Red>, RgbArg<2, White>, IntArg<3, 200>>
    >>(),
    NAMED_STYLE_DESC(    "Monolith unstable lockup idle: warmer spark_color onspark_fade_ms (default red white 200). "
    "AudioFlicker + OnSpark + lockup strobe tree — use instead of responsive_lockup for Kylo match.")
  },
  { "unstable_stripes",
    StylePtr<UnstableStripesLayer<RgbArg<1, Rgb<100, 100, 150>>> >(),
    NAMED_STYLE_DESC(    "Crackling UnstableBlades stripe band texture; base_color (default silver). Fett263 OS7 idle band only — "
    "not named style unstable (use unstable_layer for Kylo). Use multiply/add/normal over solid_bend.")
  },
  { "per_led_flicker",
    StylePtr<PerLedFlickerLayer>(),
    NAMED_STYLE_DESC(    "Per-LED random brightness crackle over layers below (no args). No ext/ret on layer line. "
    "Stack: layer = multiply opacity 14000 per_led_flicker")
  },
  { "audio_layer",
    StylePtr<AudioLayerOverlay>(),
    NAMED_STYLE_DESC(    "Hum-reactive uniform brightness over layers below (no args). No ext/ret on layer line. "
    "Stack: layer = multiply opacity 32768 audio_layer")
  },
  { "gradient_layer",
    StylePtr<GradientLayer<RgbArg<1, Red>, RgbArg<2, Blue>> >(),
    NAMED_STYLE_DESC(    "Hilt-to-tip gradient over layers below: hilt_color tip_color. No ext/ret on layer line "
    "(normal blend auto-clips to base in/out). Use normal blend; layer opacity controls mix (32768=full, 3277~10%% tint). "
    "Example: layer = normal opacity 8000 gradient_layer blue cyan")
  },
  { "rainbow_layer",
    StylePtr<RainbowLayer>(),
    NAMED_STYLE_DESC(    "Animated RGB rainbow over layers below (no args). No ext/ret on layer line. "
    "Use normal blend; layer opacity controls mix vs base (32768=full rainbow, 3277~10%% tint). "
    "Example: layer = normal opacity 12000 rainbow_layer")
  },
  { "water_flow_layer",
    &water_flow_layer_factory,
    NAMED_STYLE_DESC(    "WaterBlade idle texture (Fett263 OS7): angle-reactive stripes + swing flow reversal. "
    "base_color (default blue). Stack normal/multiply over solid_bend; add composable clash/lockup overlays.")
  },
  { "darksaber_layer",
    &darksaber_layer_factory,
    NAMED_STYLE_DESC(    "DarkSaber idle texture (Fett263 OS7): metallic stripes + brown-noise + audio flicker + swing gleam. "
    "base_color (default silver). Stack over solid_bend.")
  },
  { "static_electricity_layer",
    &static_electricity_layer_factory,
    NAMED_STYLE_DESC(    "StaticElectricity idle/charge texture (Fett263 OS7): swing builds charge stripes/sparks; clash/lockup resets. "
    "base_color (default deepskyblue). Stack normal over solid_bend.")
  },
  { "power_wave_layer",
    &power_wave_layer_factory,
    NAMED_STYLE_DESC(    "PowerWave idle texture (Fett263 OS7): wide slow reverse stripes. base_color (default silver). "
    "Stack normal/multiply over solid_bend.")
  },
  { "drifting_bands_with_pulse_layer",
    &fallen_order_layer_factory,
    NAMED_STYLE_DESC(    "Wide drifting stripes with pulsing mid-band (800 ms). base_color (default silver). "
    "Same idle band as Fett263 FallenOrder OS7 / monolith fallen_order. Stack normal over solid_bend.")
  },
  { "shimmer_blade_layer",
    &shimmer_blade_layer_factory,
    NAMED_STYLE_DESC(    "ShimmerBlade idle texture (Fett263 OS7): HoldPeakF swing shimmer + RandomFlicker stripes. "
    "base_color (default cyan). Stack normal over solid_bend.")
  },
  { "rotoscope_layer",
    &rotoscope_layer_factory,
    NAMED_STYLE_DESC(    "Rotoscope idle texture (Fett263 OS7): SwingAcceleration-driven OT stripe bands. "
    "base_color (default silver). Stack normal over solid_bend.")
  },
  { "pulse_stripes_layer",
    &pulse_stripes_layer_factory,
    NAMED_STYLE_DESC(    "PulseStripes idle texture (Fett263 OS7): ignition-surge stripe width/speed + pulsing mid-band. "
    "base_color (default blue). Stack normal over solid_bend.")
  },
  { "kinetic_charge_layer",
    &kinetic_charge_layer_factory,
    NAMED_STYLE_DESC(    "KineticCharge idle/charge texture (Fett263 OS7): clash/lockup build kinetic stripes; swing decay releases. "
    "base_color kinetic_color (default blue purple). Stack normal over solid_bend.")
  },
  { "rotating_pulse_layer",
    &rotating_pulse_layer_factory,
    NAMED_STYLE_DESC(    "RotatingPulse idle texture (Fett263 OS7 EnergyBlade): Saw-modulated stripe speed reverses direction. "
    "base_color (default blue). Stack normal over solid_bend.")
  },
  { "trickle_blade_layer",
    &trickle_blade_layer_factory,
    NAMED_STYLE_DESC(    "TrickleBlade idle texture (Fett263 OS7): angle stripes + StaticFire tip trickle + swing bands. "
    "base_color (default green). Stack normal over solid_bend.")
  },
  { "cylon_layer",
    StylePtr<CylonLayer<RgbArg<1, Red>, IntArg<2, 25>, IntArg<3, 200>> >(),
    NAMED_STYLE_DESC(    "Cylon scanner band texture: scan_color on_percent on_rpm (default red 25 200). "
    "Stack with add over solid_bend (black sections add nothing).")
  },
  { "sparktip_layer",
    StylePtr<SparkTipLayer<RgbArg<1, White>, IntArg<2, 300>, IntArg<3, 800>> >(),
    NAMED_STYLE_DESC(    "Spark tip on the moving edge (four LEDs, extend and retract): spark_color extend_ms retract_ms. "
    "Prefer transition = spark ext ret bend spark_color. Omit bend for an even edge. hilt extends from the hilt and retracts back to the hilt. tip extends from the tip and retracts back to the tip. "
    "Stacking this layer as well paints a second band.")
  },
  // Simple accent: pulse while saber is on, off when retracted.
  { "accent_pulse",
    StylePtr<InOutHelper<PulsingX<Black, White, IntArg<1, 3000>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: white pulse when saber is on, off when saber is off; pulse_ms (default 3000)")
  },
  { "accent_on",
    StylePtr<InOutHelper<WHITE, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: solid on when saber is on, off when saber is off (no arguments)")
  },
  { "accent_sound_on",
    StylePtr<AlphaL<RgbArg<1, White>, IsGreaterThan<SmoothSoundLevel, OpacityScaleIntArg<2, 4096>>> >(),
    NAMED_STYLE_DESC(    "GPIO accent: full on while audio above threshold, off when quiet (not blade-state gated); "
    "color threshold_0_to_32768 (default white 4096). Motors: runs through postoff tail; use accent_on if you want blade-on only")
  },
  { "accent_audio_flicker",
    StylePtr<InOutHelper<AudioFlicker<RgbArg<1, Black>, RgbArg<2, White>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: audio-reactive flicker when saber is on; base_color flicker_color (default black white)")
  },
  { "accent_strobe",
    StylePtr<InOutHelper<StrobeX<Black, RgbArg<1, White>, IntArg<2, 15>, IntArg<3, 1>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: strobe when saber is on; flash_color freq_hz flash_ms (default white 15 1)")
  },
  { "accent_glow",
    StylePtr<InOutHelper<AlphaL<RgbArg<1, White>, SmoothSoundLevel>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: smooth hum-reactive brightness when saber is on; color (default white)")
  },
  { "accent_clash",
    StylePtr<InOutHelper<SimpleClash<RgbArg<1, Rgb<128, 128, 128>>, RgbArg<2, White>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: idle color with clash flash when saber is on; idle_color flash_color (default dim_white white)")
  },
  { "accent_color",
    StylePtr<InOutHelper<RgbArg<1, White>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: solid color when saber is on; color (default white)")
  },
  { "accent_pulse_color",
    StylePtr<InOutHelper<PulsingX<Black, RgbArg<1, White>, IntArg<2, 3000>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: pulse black to color when saber is on; color pulse_ms (default white 3000)")
  },
  { "accent_flicker",
    StylePtr<InOutHelper<BrownNoiseFlicker<RgbArg<1, Black>, RgbArg<2, White>, 100>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: organic flicker when saber is on; base_color flicker_color (default black white)")
  },
  { "accent_blink", &accent_blink_factory,
    NAMED_STYLE_DESC(    "GPIO accent: square blink when saber is on; color on_ms off_ms (default white 500 500)")
  },
  { "accent_sequence", &accent_sequence_factory,
    NAMED_STYLE_DESC(    "GPIO accent: repeating timed steps when saber is on; config = pixel,r,g,b,brightness,ms steps separated by | (default white 100ms on/off)")
  },
  { "accent_lockup",
    StylePtr<InOutHelper<Layers<RgbArg<1, Rgb<128, 128, 128>>, LockupL<RgbArg<2, White>>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: idle color with lockup/drag color when locked; idle_color lockup_color (default dim_white white)")
  },
  { "accent_swing",
    StylePtr<InOutHelper<Layers<Black, AlphaL<RgbArg<1, White>, SwingSpeedX<IntArg<2, 200>>>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: brightens when swinging; color speed_threshold (default white 200)")
  },
  { "accent_blast",
    StylePtr<InOutHelper<Layers<RgbArg<1, Rgb<128, 128, 128>>, BlastL<RgbArg<2, White>>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: idle color with blast flash when saber is on; idle_color flash_color (default dim_white white)")
  },
  { "accent_drag",
    StylePtr<InOutHelper<Layers<Black, ResponsiveDragL<RgbArg<1, Orange>>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: off until drag lockup, then twist-responsive color; color (default orange)")
  },
  { "accent_melt",
    StylePtr<InOutHelper<Layers<Black, ResponsiveMeltL<RgbArg<1, OrangeRed>>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: off until melt lockup, then twist-responsive color; color (default orange_red)")
  },
  { "accent_battery",
    StylePtr<InOutHelper<AlphaL<RgbArg<1, Green>, BatteryLevel>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: brightness follows battery level when saber is on; color (default green)")
  },
  { "accent_sparkle",
    StylePtr<InOutHelper<Layers<Black, SparkleL<RgbArg<1, White>, 300, 1024>>, 0, 0> >(),
    NAMED_STYLE_DESC(    "GPIO accent: random sparkle twinkle when saber is on; color (default white)")
  },
  { "accent_preon",
    preon_audio_glow_style,
    NAMED_STYLE_DESC(    "GPIO accent: glows during preon only (audio-reactive); color (default white)")
  },
  { "accent_postoff",
    postoff_audio_glow_style,
    NAMED_STYLE_DESC(    "GPIO accent: glows during postoff only (audio-reactive); color (default white)")
  },
  { "pixel_sequence", &pixel_sequencer_factory,
    NAMED_STYLE_DESC(    "Pixel sequencer: config = steps separated by |, each step pixel,r,g,b,brightness,ms; repeating pattern (pixel 0..N-1 or 255=all)")
  },
  // Ignition overlay — transparent when idle, triggered by EFFECT_IGNITION (during blade extension).
  // Uses TransitionEffectConfigL so the blade stays powered while the flash runs (same as preon/postoff).
  { "ignition_flash",
    StylePtr<TransitionEffectConfigL<
      IgnitionFlashTransition<RgbArg<1, White>, IntArg<2, 300>, IntArg<3, 600>>,
      EFFECT_IGNITION>>(),
    NAMED_STYLE_DESC(    "Ignition flash overlay (Fett263 OS7 SeismicCharge): flash_color extend_ms fade_ms. "
    "Full-blade flash during ignition; held for extend_ms then fades (default white 300 600)")
  },
  // Preon/Postoff layers — transparent when idle, triggered by EFFECT_PREON / EFFECT_POSTOFF.
  // Uses TransitionEffectConfigL (not TransitionEffectL) so that:
  //   idle  → Style<> calls allow_disable → captured by AllowDisableCapture
  //   active → Style<> does NOT call allow_disable → blade stays powered
  // ConfigLayersStyle only forwards allow_disable to the real blade when ALL layers agree.
  //
  // DURATION: Glow/sputter use WavLen<> inside TransitionEffectL so duration
  // matches the active preon/postoff/force wav. Wipes still use WavLen<EFFECT_*>
  // in the transition template.
  //
  // AUDIO-REACTIVE: Glow and sputter effects use SmoothSoundLevel to drive
  // blade brightness/length from the audio envelope.  SmoothSoundLevel is an
  // IIR-filtered audio envelope (0-32768) that follows loudness over time.
  // When the sound is loud the blade is bright/long; when quiet it dims/retracts.
  // This naturally fades the visual as the preon/postoff sound ends.
  //
  // TRANSPARENCY: Effects use bare AlphaL<> (not Layers<Black, AlphaL<>>)
  // so they produce RGBA with alpha=0 when SmoothSoundLevel is 0, making
  // them truly transparent when audio is silent.  This prevents opaque-black
  // artifacts from covering the main blade.

  // preon_glow: entire blade glows uniformly, brightness follows preon sound
  // volume.  All LEDs get the same brightness = SmoothSoundLevel.
  // Loud preon sound = bright blade, quiet = dim, silence = transparent.
  { "preon_glow",
    preon_audio_glow_style,
    NAMED_STYLE_DESC(    "Preon glow: color. Brightness follows preon sound volume, duration matches preon sound file")
  },
  // preon_wipe: color sweeps hilt→tip over the preon sound duration.
  // A directional "preview" of the blade path before the main ignition.
  { "preon_wipe",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrWipeX<WavLen<EFFECT_PREON>>,\
              RgbArg<1, Green>,\
              TrFadeX<Int<50>>>,
      EFFECT_PREON>>(),
    NAMED_STYLE_DESC(    "Preon wipe: color. Wipes hilt-to-tip over preon sound duration")
  },
  // preon_sputter: blade LENGTH extends from hilt proportional to preon
  // sound volume.  IsLessThan<RampF, SmoothSoundLevel> lights each LED only
  // when its position (0=hilt, 32768=tip) is below the audio envelope level.
  // Loud = long blade, quiet = short, silence = no blade.
  { "preon_sputter",
    preon_sputter_style,
    NAMED_STYLE_DESC(    "Preon sputter: color. Blade length follows preon sound volume, duration matches preon sound file")
  },
  // postoff_glow: entire blade glows uniformly after retraction, brightness
  // follows postoff sound volume.  Naturally fades as the postoff sound ends.
  { "postoff_glow",
    postoff_audio_glow_style,
    NAMED_STYLE_DESC(    "Postoff glow: color. Brightness follows postoff sound volume, duration matches postoff sound file")
  },
  // postoff_wipe: color wipes tip→hilt over the postoff sound duration.
  // A "draining" retraction effect after the main blade has already retracted.
  { "postoff_wipe",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<100>>,\
              RgbArg<1, White>,\
              TrWipeInX<WavLen<EFFECT_POSTOFF>>>,
      EFFECT_POSTOFF>>(),
    NAMED_STYLE_DESC(    "Postoff wipe: color. Wipes tip-to-hilt over postoff sound duration")
  },
  // postoff_sputter: blade LENGTH extends from hilt proportional to postoff
  // sound volume after retraction.  Same audio-reactive mechanism as
  // preon_sputter but for EFFECT_POSTOFF.
  { "postoff_sputter",
    postoff_sputter_style,
    NAMED_STYLE_DESC(    "Postoff sputter: color. Blade length follows postoff sound volume, duration matches postoff sound file")
  },
  // Force overlay — transparent when idle, triggered by EFFECT_FORCE while blade is on.
  // Same audio-reactive glow pattern as preon_glow; duration = force sound file (WavLen).
  // Requires font force/ (or mpush) sounds and a prop that calls DoEffect(EFFECT_FORCE).
  { "force_glow",
    force_audio_glow_style,
    NAMED_STYLE_DESC(    "Force glow overlay: color. Full-blade glow on Force effect; brightness follows force sound volume, duration matches force sound file")
  },
