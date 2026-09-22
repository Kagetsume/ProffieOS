# ProffieOS config file examples

These are **example config files** for the SD card. Copy the entire **`config`** folder (or individual files) to the **root of your SD card** so the paths match what the firmware expects:

- SD root: `Fonts/`, `tracks/`, **`config/`**
- Config files: `config/board.ini`, `config/features.ini`, `config/blades.ini`, `config/blade_styles.ini`, `config/presets.ini`

You do **not** need to use every file. Only the files you put on the SD card are read. Omitted files are ignored and compile-time or default behavior is used.

The examples assume **`NUM_BLADES` 5** (see `config/config-files-config.h`): `blades.ini` defines NeoPixel strips on **blade indices 0–1**, plus **simple PWM** accents on **index 2** (Blade 3 / Free1 / `accent_pulse 1500`), **index 3** (Blade 4 / Free2 / `accent_sound_on white 4096`), and **index 4** (Blade 5 / Free3 / `accent_glow`). `presets.ini` has **five** `style =` lines per preset (one per blade index). If you only have **one** physical strip, either set **`NUM_BLADES` 1** in your firmware config and use a **single-blade** `blades.ini` (blade 0 only) plus **one** `style =` per preset, or keep `NUM_BLADES` 2 and duplicate the same `style =` twice (the firmware maps the first working SD blade driver to the primary if blade 0 fails to init).

| File | Purpose |
|------|---------|
| **board.ini** | Board hardware: button count, OLED on/off, Bluetooth serial on/off. Optionally gesture/twist (overridden by features.ini if present). |
| **features.ini** | Feature toggles: gesture, twist-on, twist-off. Loaded after board.ini; use for contest-specific overrides without changing hardware. |
| **blades.ini** | Blade wiring: NeoPixel (`data_pin`, `pixels`, power pins) or simple PWM LED (`type=simple`, `data_pin`/`pin1`…`pin4`, `led`/`led1`…`led4`). Replaces compiled blade config when present (Proffieboard). **Guide:** [`website/BLADES.md`](../website/BLADES.md) (examples + use cases). |
| **blade_styles.ini** | Named style "recipes" as layers. **Guide:** [`website/BLADE_STYLES.md`](../website/BLADE_STYLES.md). See table below for full feature list. |
| **blade_styles/palettes_extra.ini** | Example **`[palette_alt]`** pulled in by **`include =`** from **`blade_styles.ini`**. |
| **blade_styles/strobe_overlay.ini** | Example fragment merged by **`include =`** inside a **`[section]`**. |
| **presets.ini** | Preset list: font, track, style, name. Includes examples of **`config <section>`**, variable overrides, nested configs, preon/postoff, and direct named styles. |

## GPIO accent named styles

For **simple PWM** outputs (`type=simple` in `blades.ini`), use **`accent_*`** styles on the matching `style =` line. All are off when the saber is retracted.

**SD config checklist (accents dark but main blades work):**

1. **`config/blades.ini`** — define **every** accent blade index (`blade = 2` … `blade = 4` for Free1–Free3). Wiring alone is not enough; missing indices are not activated at boot.
2. **`config/presets.ini`** — **five** `style =` lines per preset when `NUM_BLADES` is 5 (lines 3–5: `accent_pulse 1500`, `accent_sound_on white 4096`, `accent_glow`). If accent lines are omitted, firmware fills accent defaults — do **not** rely on copying the main `config …` strip style onto PWM accents.
3. **Firmware** — `accent_*` styles must exist in `named_styles[]` (reflash after adding them). Over serial, `list_named_styles` should list `accent_pulse`, `accent_sound_on`, etc. A failed parse logs `Blade N: failed to parse style "…"`.
4. **Compiled fallback** — without `presets.ini`, accents use `builtin <preset> <blade>` from compiled `config-files-config.h` (always works after flash). With `presets.ini`, styles come from the SD strings above.

**Polarity (`active_state`) vs “renders off”:** If accents work **without** `config/presets.ini` (compiled presets) but not with SD presets, polarity is usually **not** the cause — compiled `ActiveHighPIN` and SD `active_state=high` are the same. If accents work **without** `config/blades.ini` but fail **with** it, the SD runtime driver path differs (check serial for `Simple Blade (SD config)` and `failed to parse style`). Try `active_state=low` on one accent **only** if that pin drives an **N-FET** (external MOSFET), not a direct LED. Over serial while ignited: `blade 3 on` / `blade 4 on` / `blade 5 on` should force that accent on regardless of preset style.

| Style | Example | Notes |
|-------|---------|-------|
| `accent_on` | `style = accent_on` | Solid on while blade is out (motor / indicators) |
| `accent_sound_on` | `style = accent_sound_on white 4096` | Full on while audio above threshold; off when quiet (motors through postoff tail) |
| `accent_pulse` | `style = accent_pulse 1500` | Smooth pulse; optional `pulse_ms` (default 3000) |
| `accent_color` | `style = accent_color amber` | Solid color |
| `accent_pulse_color` | `style = accent_pulse_color red 2000` | Pulse black → color |
| `accent_strobe` | `style = accent_strobe white 15 1` | Hard flash; `flash freq_hz flash_ms` |
| `accent_flicker` | `style = accent_flicker black white` | Organic random flicker (not audio) |
| `accent_audio_flicker` | `style = accent_audio_flicker` | Jittery hum-reactive flicker |
| `accent_glow` | `style = accent_glow white` | Smooth hum-reactive brightness |
| `accent_clash` | `style = accent_clash` | Idle glow + bright flash on clash |
| `accent_blink` | `style = accent_blink white 200 800` | Square on/off; `color on_ms off_ms` |
| `accent_sequence` | `style = accent_sequence 0,255,255,255,100,100\|0,0,0,0,0,400` | Timed steps (Morse, patterns); off when retracted |
| `accent_lockup` | `style = accent_lockup` | Idle dim + bright on lockup/drag |
| `accent_swing` | `style = accent_swing white 300` | Brightens when swinging |
| `accent_blast` | `style = accent_blast` | Idle dim + flash on blast |
| `accent_drag` | `style = accent_drag orange` | On during drag lockup; twist-responsive |
| `accent_melt` | `style = accent_melt` | On during melt lockup; twist-responsive |
| `accent_battery` | `style = accent_battery green` | Brightness = battery level |
| `accent_sparkle` | `style = accent_sparkle white` | Random twinkle |
| `accent_preon` | `style = accent_preon white` | Glows during preon only (follows preon sound) |
| `accent_postoff` | `style = accent_postoff red` | Glows during postoff only (follows postoff sound) |

### Layered accents (`config` on PWM blades)

Simple accents can use **`style = config <section>`** the same way NeoPixel blades do. Stack **`accent_*`** bases with overlay layers (`clash`, `lockup`, `swing`, `blast`, …). See **`examples/config/blade_styles.ini`** sections **`accent_glow_clash`**, **`accent_glow_lockup`**, and **`accent_reactive`**.

Example preset line (Blade 5):

```ini
style = config accent_reactive
```

Or a Morse-style timed pattern:

```ini
style = accent_sequence 0,255,255,255,100,100|0,0,0,0,0,100|0,255,255,255,100,100|0,0,0,0,0,100|0,255,255,255,100,300|0,255,255,255,100,300|0,255,255,255,100,300|0,0,0,0,0,300|0,255,255,255,100,100|0,0,0,0,0,100|0,255,255,255,100,100|0,0,0,0,0,700
```

(Keep RGB at `255,255,255` on white Cree accents; use **brightness** 0–100 and **ms** for timing. Up to 16 steps per sequence.)

## Pixel blade named styles

Use directly in `presets.ini` (`style = rainbow 300 800`) or as **`layer =`** lines in `blade_styles.ini`.

### Full blades (opaque — use as bottom layer or alone)

| Style | Example | Notes |
|-------|---------|-------|
| `solid` | `solid cyan 300 800` | Opaque base + extend/retract only — stack `clash` / `blast` / lockup overlays for composable recipes |
| `solid_bend` | `solid_bend cyan 300 800` | Like `solid` with OS7 BendTimePow in/out |
| `standard` | `standard cyan white 300 800 white white` | Base, clash, extend, retract, lockup, blast (monolithic) |
| `fire` | `fire red yellow` | Rolling flame (no extend/retract animation) |
| `rainbow` | `rainbow 300 800 white white` | Extend, retract, clash, lockup |
| `gradient` | `gradient red blue white white white 300 800` | Hilt, tip, blast, lockup, clash, extend, retract |
| `audio` | `audio cyan white white 300 800` | Hum-reactive flicker base |
| `flicker` | `flicker red orange white 300 800` | Brown-noise flicker base |
| `sparktip` | `sparktip green white 300 800 white` | Spark tip on extension |
| `sparkle_blade` | `sparkle_blade blue white white white white 300 800` | Base, sparkle, blast, lockup, clash, extend, retract |
| `cylon` | `cylon red white 300 800` | Scanner / KR effect |
| `pulse_blade` | `pulse_blade black cyan 2000 300 800` | Whole blade pulses (monolithic) |
| `water_flow` | `water_flow blue white 300 800` | Angle-reactive stripes (Fett263 WaterBlade base; firmware required) |
| `darksaber` | `darksaber silver white 300 800` | Metallic stripes + noise + audio (Fett263 DarkSaber base) |
| `static_electricity` | `static_electricity deepskyblue white 300 800` | Swing charge / clash dissipate (Fett263 StaticElectricity base) |
| `power_wave` | `power_wave silver white 300 800` | Wide slow reverse stripes (Fett263 PowerWave base) |
| `unstable_blades` | `unstable_blades silver white 300 800` | Crackling StripesX (Fett263 UnstableBlades — **not** `unstable`) |
| `fallen_order` | `fallen_order silver white 300 800` | Pulsing stripe mid-band (Fett263 FallenOrder base) |
| `thunder_loop` | `thunder_loop blue white 300 800` | TransitionLoop thunder bands (Fett263 ThunderStorm idle base) |
| `thunder_loop_layer` | `multiply opacity 20000 thunder_loop_layer blue` | Loop texture only — stack over another base |
| `responsive_flame` | `responsive_flame red white 300 800` | Angle-responsive dual StaticFire (Fett263 ResponsiveFlame idle base) |
| `responsive_flame_layer` | `multiply opacity 22000 responsive_flame_layer orange` | Flame texture only — stack over another base |
| `shimmer_blade` | `shimmer_blade cyan white 300 800` | Swing-driven stripe shimmer (Fett263 ShimmerBlade) |
| `rotoscope` | `rotoscope silver white 300 800` | Hyper responsive OT rotoscope (Fett263 Rotoscope; default base silver) |
| `pulse_stripes` | `pulse_stripes blue white 300 800` | Ignition-surge stripes + pulsing band (Fett263 OS7; default base blue) |
| `kinetic_charge` | `kinetic_charge blue purple white 300 800` | Clash/lockup kinetic charge; swing release (Fett263 BlackPanther OS7 base) |
| `rotating_pulse` | `rotating_pulse blue white 300 800` | Wide stripes, Saw-modulated reverse (Fett263 EnergyBlade Rotating Pulse) |
| `trickle_blade` | `trickle_blade green white 300 800` | Energy trickle: angle stripes + tip flame + swing bands (Fett263 OS7) |
| `unstable`, `strobe`, `cycle`, `advanced` | (see `blade_styles.ini` header) | Existing complex styles |

### Overlay layers (stack on a base — many transparent until triggered)

| Style | Example | Blend tip |
|-------|---------|-----------|
| `blast` | `blast white` | Transparent until blast (fixed wave timing) |
| `blast_wave_random` | `blast_wave_random white` | Random wave position/duration (OS7-style; use instead of `blast`) |
| `clash` | `clash white` | Transparent until clash |
| `localized_clash` | `localized_clash white` | Positioned clash band |
| `real_clash` | `real_clash white 16000` | OS7 Real Clash V1 (impact-based path; needs clash strength) |
| `lockup` | `lockup cyan` | Lockup / drag / melt tint |
| `sparkle` | `add opacity 8000 sparkle white` | Random sparkles |
| `pulse` | `multiply opacity 24000 pulse white 3000` | Breathing brightness |
| `swing` | `add opacity 12000 swing white 200` | Brightens when swinging |
| `drag` / `melt` / `lb` | `drag orange` | Responsive lockup variants |
| `preon_*` / `postoff_*` | `preon_glow blue` | Transparent until preon/postoff |
| `force_glow` | `add opacity 14000 force_glow white` | Glow on Force effect (font + button required) |
| `ignition_flash` | `ignition_flash white 300 600` | Full-blade flash during ignition extension |
| `standard_bend` | `standard_bend cyan white 300 800` | Like `standard` with OS7 BendTimePow in/out |

### Texture overlays (masks — stack with multiply / screen / add)

| Style | Example | Notes |
|-------|---------|-------|
| `fire_mask` | `multiply opacity 20000 fire_mask white white` | Rolling heat mask (smoke, lava); same color args as `fire` |
| `smoke_flow` | multiply `black white {{ext}} {{ret}}`; screen `black <base> {{ext}} {{ret}}` | Smoke blade recipe; **ext/ret must match base** (use `{{ext}}`/`{{ret}}`; `-1` = sound length) |
| `stripes` | `add opacity 10000 stripes 800 -1500 white cyan` | Soft moving stripes; `width speed color1 color2` |
| `hard_stripes` | `multiply opacity 18000 hard_stripes 1200 -4000 black white` | Hard-edged bands |
| `noise_flicker` | `multiply opacity 8000 noise_flicker black white` | Organic crackle texture |
| `unstable_stripes` | `multiply opacity 16000 unstable_stripes silver` | UnstableBlades band only (not full `unstable_blades`) |
| `pixel_sequence` | `pixel_sequence config 0,255,0,0,80,100\|…` | Timed chase / segment pattern as a layer |

**Layering rule:** Opaque full blades cover everything below unless you use **`add`**, **`multiply`**, **`screen`**, or **`opacity`**. Overlays like **`blast`**, **`clash`**, **`pulse`**, and preon/postoff handle transparency internally.

Example sections in `examples/config/blade_styles.ini`: `[rainbow_pulse]`, `[standard_swing_sparkle]`, `[smoke_blade]`, `[composable_gradient]`, `[composable_audio]`, `[composable_breathe]`, `[composable_crackle]`, `[composable_shimmer]`, `[greyscale_mercenary]`, `[greyscale_coda]`, `[water_blade]`, `[energy_blade]`, `[rolling_surge]`, `[pulse_stripes]`, `[solid_smoke]`, `[solid_lava]`, `[solid_unstable]`, `[solid_shimmer]`, `[solid_chase]`, `[solid_water_shimmer]`, `[solid_barber]`, plus Fett263 bases `[darksaber_blade]`, `[fallen_order_blade]`, etc.

### Fett263 OS7 style approximations

These recipes approximate [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html) compiled styles via **`config/blade_styles.ini`**. **`smoke_blade`** is pure SD layers (**`solid`** base + **`smoke_flow`** + composable overlays); the others need one firmware reflash for their base named styles, then remain SD-editable.

| OS7 style | SD section | Preset | Approximates well | Cannot replicate |
|-----------|------------|--------|-------------------|------------------|
| [SmokeBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#SmokeBlade) | `smoke_blade` | Smoke Blade | **`solid`** base + **`smoke_flow`** (multiply + screen; **same `{{ext}}`/`{{ret}}` as base**) + composable **`clash`** / **`blast`** / lockup overlays, drag/melt/LB | StaticFire base texture, Sin/StripesX bands, OS7 lockup Bump |
| [WaterBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#WaterBlade) | `water_blade` | Water Blade | **`water_flow`** + BendTimePow in/out, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones |
| [DarkSaber](https://www.fett263.com/fett263-proffieOS7-style-library.html#DarkSaber) | `darksaber_blade` | Dark Saber | **`darksaber`** + BendTimePow in/out, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones |
| [StaticElectricity](https://www.fett263.com/fett263-proffieOS7-style-library.html#StaticElectricity) | `static_electricity_blade` | Static Electricity | **`static_electricity`** + BendTimePow in/out, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones |
| [PowerWave](https://www.fett263.com/fett263-proffieOS7-style-library.html#PowerWave) | `power_wave_blade` | Power Wave | **`power_wave`** + BendTimePow in/out, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones |
| [UnstableBlades](https://www.fett263.com/fett263-proffieOS7-style-library.html#UnstableBlades) | `unstable_blades` | Unstable Blades | **`unstable_blades`** + BendTimePow in/out | OS7 Real Clash V1, Bump lockup zones; **not** named style `unstable` |
| [FallenOrder](https://www.fett263.com/fett263-proffieOS7-style-library.html#FallenOrder) | `fallen_order_blade` | Fallen Order | **`fallen_order`** + BendTimePow in/out | OS7 Real Clash V1, Bump lockup zones |
| [EnergyBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#EnergyBlade) | `energy_blade` / `rotating_pulse_sd` / `energy_core` | Energy / Rotating / Core | **Surging:** SD stripes; **Rotating:** **`rotating_pulse`** firmware; **Core:** SD stripes + fire_mask + noise_flicker | Flickering core SD-only as `energy_core` (~70–80%) |
| Rolling surge | `rolling_surge` | Rolling Surge | **Pure SD:** slow `stripes` 22000/-1400 + `audio` screen (~80–85%); [Fett263 OS7 Master Sol option](https://www.fett263.com/fett263-proffieOS7-style-library.html#Acolyte) | Five-band Mix stripe shading, exact AudioFlicker mix |
| Pulse stripes | `pulse_stripes` / `pulse_stripes_sd` | Pulse Stripes | **`pulse_stripes`** HoldPeakF on ignition/alt-sound + StripesX + Pulsing 1400 ms; [Fett263 OS7 ignition-surge option](https://www.fett263.com/fett263-proffieOS7-style-library.html#JediSurvivor) | Full OS7 lockup absorb shapes |
| [Greyscale](https://www.fett263.com/fett263-proffieOS7-style-library.html#Greyscale) | `greyscale_mercenary` / `greyscale_coda` | Greyscale | **Mercenary:** fire_mask + stripes + swing; **CODA:** pulse + stripes + sparkle (SD only) | OS7 `STYLE_OPTION` switch; Sin-driven StripesX on CODA |
| [ShimmerBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#ShimmerBlade) | `shimmer_blade` / `shimmer_blade_sd` | Shimmer Blade | **`shimmer_blade`** HoldPeakF swing shimmer + BendTimePow in/out | Full OS7 lockup absorb shapes |
| [Rotoscope](https://www.fett263.com/fett263-proffieOS7-style-library.html#Rotoscope) | `rotoscope` / `rotoscope_sd` | Rotoscope | **`rotoscope`** SwingAcceleration + HoldPeakF rotoscope bands + BendTimePow in/out | Full OS7 lockup absorb shapes (Bump zones, melt twist) |
| [BlackPanther](https://www.fett263.com/fett263-proffieOS7-style-library.html#BlackPanther) | `kinetic_charge` / `kinetic_charge_sd` | Kinetic Charge | **`kinetic_charge`** clash/lockup charge + configurable kinetic color | Full OS7 lockup absorb shapes; inverse of StaticElectricity |
| [ThunderStorm](https://www.fett263.com/fett263-proffieOS7-style-library.html#ThunderStorm) | `thunder_storm` / `thunder_storm_sd` | Thunder Storm | **`thunder_loop`** + BendTimePow in/out; optional **`real_clash`** + **`blast_wave_random`** | Full OS7 lockup/drag/melt/LB shapes |
| [ResponsiveFlame](https://www.fett263.com/fett263-proffieOS7-style-library.html#ResponsiveFlame) | `responsive_flame` / `responsive_flame_sd` | Responsive Flame | **`responsive_flame`** + BendTimePow in/out; optional **`real_clash`** + **`blast_wave_random`** | Full OS7 lockup absorb shapes, Remap-wrapped combat |
| [Trickle blade](https://www.fett263.com/fett263-proffieOS7-style-library.html#Ahsoka) | `trickle_blade` / `trickle_blade_sd` | Trickle Blade | **`trickle_blade`** StaticFire + BladeAngle StripesX + HoldPeakF swing | Fett263 OS7 energy-trickle idle base |
| [Ghostbusters](https://www.fett263.com/fett263-proffieOS7-style-library.html#Ghostbusters) | `particle_beam` | Particle Beam | **Pure SD:** silver stripes + blue stream bands + fire scroll (~70–85%) | Nested Stripe mix, SmoothStep core weight, exact StaticFire tuning |

**Usage:** `style = config fallen_order_blade`, or direct: `style = fallen_order silver white 300 800`. ThunderStorm: **`style = thunder_loop blue white 300 800`** or **`style = config thunder_storm_sd`**. ResponsiveFlame: **`style = responsive_flame orange white 300 800`** or **`style = config responsive_flame_sd`**. Greyscale: **`style = config greyscale_mercenary`** or **`style = config greyscale_coda`**. ShimmerBlade: **`style = shimmer_blade cyan white 300 800`** or **`style = config shimmer_blade_sd`**. Rotoscope: **`style = rotoscope silver white 300 800`** or **`style = config rotoscope_sd`**. Kinetic charge: **`style = kinetic_charge blue purple white 300 800`** or **`style = config kinetic_charge kinetic=gold`**. EnergyBlade surging (SD-only): **`style = config energy_blade`**. Rolling surge (SD-only): **`style = config rolling_surge`**. Pulse stripes: **`style = pulse_stripes blue white 300 800`** or **`style = config pulse_stripes_sd`**. Rotating Pulse: **`style = rotating_pulse blue white 300 800`** or **`style = config rotating_pulse_sd`**. Energy core (SD-only): **`style = config energy_core`**. Particle beam (SD-only): **`style = config particle_beam`**. Trickle blade: **`style = trickle_blade green white 300 800`** or **`style = config trickle_blade_sd`**. Also: `config smoke_blade`. Red crackle variant: **`config chaos_inferno`**.

**Base color:** Fett named styles take **`base clash extend retract`** as the first four args. Change the beam color with a direct preset (`style = fallen_order cyan white 300 800`), section variables (`base = cyan` + `layer = fallen_order {{base}} …`), or a preset override (`style = config fallen_order_blade base=cyan`). Named colors include **`silver`** (Rgb&lt;100,100,150&gt;) and **`deepskyblue`** (Rgb&lt;0,135,255&gt;); see `styles/rgb_arg.h` for the full list.

## blade_styles.ini features

| Feature | Description |
|---------|-------------|
| **Layer styles** | Full blades (`solid`, `solid_bend`, `standard`, `fire`, `rainbow`, `gradient`, `audio`, …) plus overlay layers (`blast`, `clash`, `pulse`, `sparkle`, `swing`, …). Composable recipes use **`solid`** + overlay `clash`/`blast`. |
| **Preon/postoff** | `preon_glow`, `preon_wipe`, `preon_sputter`, `postoff_glow`, `postoff_wipe`, `postoff_sputter` -- transparent transition layers that play before ignition or after retraction, with duration and intensity driven by sound files. See section below. |
| **Ignition flash** | `ignition_flash` -- full-blade color flash during `EFFECT_IGNITION` (SeismicCharge OS7). Args: `color extend_ms fade_ms`. |
| **Bend in/out** | All Fett263 OS7 named bases (`water_flow`, `darksaber`, `fallen_order`, `thunder_loop`, `responsive_flame`, …) use BendTimePow in/out. Generic blades: **`standard_bend`**, **`solid_bend`** (linear **`standard`** / **`solid`** unchanged). |
| **Blend modes** | `normal`, `multiply`, `screen`, `add` -- control how layers combine. |
| **Opacity** | `opacity <0-32768>` -- per-layer transparency control. |
| **Variables** | `name = value` + `{{name}}` -- section-local variables with preset overrides (`config section key=value`). |
| **Palettes** | `[palette_<id>]` sections with `palette = <id>` -- shared variable sets across sections. |
| **Includes** | `include = path/file.ini` -- merge layers or palettes from external files. |
| **Structured layers** | `layer.<style>.<slot> = value` -- key-per-argument alternative to single-line format. |
| **Nesting** | `layer = config <other_section>` -- compose sections from other sections. |

## Preon and postoff configuration layers

This section explains how **preon** and **postoff** work when you use SD card **config** styles (`style = config <section>` in `presets.ini` and a matching `[section]` in `blade_styles.ini`). The same ideas apply to postoff; both are implemented as **transition layers** inside a multi-layer `ConfigLayersStyle`.

### What a “config layer” is

A preset that uses `style = config my_blade` does **not** embed the whole blade style in `presets.ini`. Instead, the firmware builds one composite style from the **`layer = ...` lines** in `[my_blade]` inside `config/blade_styles.ini`.

- Layers are evaluated **bottom to top** (first `layer =` is the base; each later line is drawn **on top**).
- Each layer can be a normal blade style (`standard`, `fire`, `rainbow`, …) or a special **preon/postoff** style (`preon_glow`, `postoff_wipe`, …).
- Colors are **composited** per LED using the layer’s blend mode and opacity (preon/postoff layers use **internal** transparency; you usually do **not** wrap them in `opacity` unless you know you want that).

Preon and postoff layers are **idle most of the time**: they contribute **fully transparent** pixels until their blade effect fires, play **one transition**, then go idle again.

### How preon/postoff hook into the saber (firmware behavior)

This is the sequence the **prop and font** drive; your config layers only **visualize** it.

**Preon (before main ignition)**

1. You activate the saber. The firmware fires **`EFFECT_PREON`** and, if the active font has **preon** sounds, plays a **preon** WAV.
2. While preon is active, the main blade style is still logically **off** (no full extension yet). Ignition of the main blade (extension + hum as you expect) is **delayed until the preon sound finishes** when preon files exist.
3. After preon audio ends, the main blade ignites as usual.

**Postoff (after main retraction)**

1. You deactivate the saber. The main blade **retracts** first.
2. When retraction is complete, the firmware fires **`EFFECT_POSTOFF`**. If the font has **pstoff** (post-off) sounds, those play now.
3. When postoff audio finishes, blade power can fully shut down.

So: **preon = startup delay + startup visuals tied to preon audio**; **postoff = after full retraction + visuals tied to pstoff audio**. Your `preon_*` / `postoff_*` layers should assume this order.

**Font sound folders (typical ProffieOS layout)**

- **Preon:** effect **`preon`** — WAVs usually live under a **`preon/`** folder in the font.
- **Post-off:** effect **`pstoff`** — WAVs usually live under a **`pstoff/`** folder (name is **`pstoff`**, not “postoff”, in the effect system).

If those sounds are missing, timing falls back to the prop’s default (often **no** preon delay and **no** postoff tail). The visual layers still **receive** the preon/postoff effect events when the prop fires them; audio-reactive layers tend to stay **transparent** when there is little or no signal.

### How the named preon/postoff layers are implemented (summary)

In firmware, these SD “named styles” are built from **`TransitionEffectConfigL`**: a thin adapter around **`TransitionEffectL`** so they work correctly **inside** `ConfigLayersStyle`.

- **While the transition runs**, the adapter sets an internal flag so **`ConfigLayersStyle` does not forward `allow_disable()`** from other layers. That keeps the blade **powered** even though the base layer thinks the saber is still “off” (preon) or has already retracted (postoff).
- **When idle**, the layer behaves like a no-op for power and produces **transparent** output so lower layers show through.

That is why preon/postoff work as **ordinary** `layer =` entries next to `standard` or `fire`: they do not need a separate wiring path beyond being listed in the section.

### Duration: `WavLen` matches the sound file

**Extend/retract auto timing:** On named styles with **`extend_ms`** / **`retract_ms`** args (e.g. **`solid`**, **`standard`**, **`rainbow`**), use **`-1`** to match ignition or retraction soundfont length instead of a fixed millisecond value. Example: `ext = -1`, `ret = -1`, or `layer = solid {{base}} -1 -1`.

**Layered recipes — who needs `ext`/`ret` on the line?**

| Layer | Pass `{{ext}}` / `{{ret}}`? |
|-------|----------------------------|
| Base (`solid`, `solid_bend`, …) | **Yes** |
| `gradient_layer`, `stripes` (add), … | **No** — compositor follows base (including `-1`) |
| `audio_layer`, `pulse_layer`, `fire_mask`, … | **No** |
| **`smoke_flow`** (each line) | **Yes — must match base** |
| Full InOut styles as layers (`audio`, `flicker`, …) | **Yes — when args include ext/ret** |

Smoke blades use **`smoke_flow`** only (not `smoke_up`/`smoke_down`). Composable **`audio_layer`** does not take ext/ret; stacked **`audio`** does. See **`doc/blade_styles_config.md`**.

All six built-in preon/postoff styles use **`WavLen<EFFECT_PREON>`** or **`WavLen<EFFECT_POSTOFF>`** for their timed phases. In practice:

- **`WavLen`** reads the **length in milliseconds** of the WAV that was chosen for that effect (from the blade effect’s `sound_length`).
- Wipe animations (hilt→tip or tip→hilt) are stretched to that length.
- Hold phases (glow/sputter) stay active for that length.

You **do not** pass millisecond arguments for these styles in INI — only **`layer = preon_glow blue`** style **`<color>`**.

**Caveat:** `WavLen` is only meaningful when the effect has a real sound length. If there is no matching sound (or length is zero), behavior can be minimal or degenerate; pairing these layers with fonts that actually ship **preon** / **pstoff** WAVs gives the intended result.

### Audio reactivity: `SmoothSoundLevel`

**`preon_glow`**, **`postoff_glow`**, **`preon_sputter`**, and **`postoff_sputter`** use **`SmoothSoundLevel`**: a **smoothed envelope** of the audio output (roughly “how loud” the speaker is over time), not raw per-sample waveform.

- **Glow:** same brightness on every LED; scales with loudness.
- **Sputter:** each LED from hilt toward tip turns on when the envelope exceeds a position threshold — **loud → longer lit segment**, **quiet → shorter**, **silent → transparent**.

Because the envelope follows **what is playing**, during preon/pstoff it is dominated by those clips. Any other simultaneous audio could also influence the envelope slightly; that is expected.

### Layer order (recommended)

A practical default:

```ini
[my_blade]
layer = standard cyan white 300 800    ; base blade (opaque when on)
layer = blast white                     ; optional transparent overlay
layer = preon_glow blue                 ; on top when preon runs
layer = postoff_wipe red                ; on top when postoff runs
```

**Why this order**

- The **base** should be first so clash, lockup, and extension/retraction behave normally.
- **Blast** (and similar transparent overlays) usually sit above the base but below optional accents.
- **Preon/postoff** are normally **last** (or among the last) so their transition draws **on top** of the dark/off blade during startup and shutdown.

You can add **multiple** preon or postoff layers in one section; if they share the same trigger, they **all** start together when that effect fires.

### Structured layer syntax (preon/postoff)

The optional **`layer.<style>.<slot> = value`** form in `blade_styles.ini` is implemented only for **standard**, **fire**, **rainbow**, **strobe**, **cycle**, **unstable**, and **advanced** (see **doc/blade_styles_config.md**). **Preon and postoff named styles** are not wired into that path yet — use a single line per layer:

```ini
layer = preon_glow blue
layer = postoff_wipe red
```

### Available styles (reference)

| Style | Trigger | Effect | Arguments |
|-------|---------|--------|-----------|
| `preon_glow` | EFFECT_PREON | Uniform blade glow, brightness ≈ sound envelope | `<color>` |
| `preon_wipe` | EFFECT_PREON | Wipe color hilt-to-tip over sound duration | `<color>` |
| `preon_sputter` | EFFECT_PREON | Lit length from hilt follows sound envelope | `<color>` |
| `postoff_glow` | EFFECT_POSTOFF | Uniform blade glow, brightness ≈ sound envelope | `<color>` |
| `postoff_wipe` | EFFECT_POSTOFF | Wipe color tip-to-hilt over sound duration | `<color>` |
| `postoff_sputter` | EFFECT_POSTOFF | Lit length from hilt follows sound envelope | `<color>` |
| `force_glow` | EFFECT_FORCE | Full-blade glow while on; brightness ≈ force sound | `<color>` (stack with `add`) |

**Force:** Unlike preon/postoff, `force_glow` runs while the blade is **already ignited**. Needs `force/` sounds in the font and a prop that triggers Force. Example section: **`[force_glow_demo]`**.

### End-to-end timeline

```
Button press
  |-> EFFECT_PREON fires
  |-> Preon sound plays (if font has preon/)
  |-> Preon config layers run for the preon sound duration (WavLen)
  |     - glow: brightness tracks SmoothSoundLevel
  |     - wipe: color sweeps hilt-to-tip over that duration
  |     - sputter: lit length tracks SmoothSoundLevel
  |-> Preon sound ends -> main blade ignites
  |-> Normal operation (clash, lockup, blast, etc.)
  |
Button off
  |-> Main blade retracts
  |-> Blade fully retracted -> EFFECT_POSTOFF fires
  |-> Pstoff sound plays (if font has pstoff/)
  |-> Postoff config layers run for the pstoff sound duration (WavLen)
  |-> Pstoff sound ends -> LEDs power off
```

### Full minimal example

**presets.ini**

```ini
new_preset
font = MyFont
track = tracks/hum.wav
style = config my_blade
style = config my_blade
name = Preon demo
variation = 0
end
```

**blade_styles.ini**

```ini
[my_blade]
layer = standard cyan white 300 800
layer = blast white
layer = preon_glow blue
layer = postoff_wipe red
```

### Example sections in this repo

- **[mystic_awakening]** — `preon_glow` + `postoff_wipe` (Preset 10).
- **[spectral_gate]** — `preon_wipe` + `postoff_wipe` (Preset 11).
- **[inferno_ritual]** — `preon_glow` + `postoff_wipe` on a **fire** base (Preset 12).
- **[sputter_gate]** — `preon_sputter` + `postoff_sputter` (Preset 13).

### Tips

- Copy **`config/blade_styles.ini`** whenever you change layers; the saber reads it from the SD card.
- Rebuild and flash firmware when **named style definitions** in C++ change; INI-only edits need only the SD files.
- Use **glow** for a full-blade pulse, **sputter** for length that follows loudness, **wipe** for a clear directional sweep.
- Contrasting preon vs main blade color reads clearly on a dark blade before extension.

See **doc/board_config.md**, **doc/blade_config.md**, **doc/blade_styles_config.md**, **doc/README_blade_styles_config.md**, and **doc/sd_config.md** for full format and options.

Feature checklist and implementation history: **doc/blade_styles_config_roadmap.md**.
