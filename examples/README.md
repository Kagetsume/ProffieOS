# ProffieOS config file examples

These are **example config files** for the SD card. Copy the entire **`config`** folder (or individual files) to the **root of your SD card** so the paths match what the firmware expects:

- SD root: `Fonts/`, `tracks/`, **`config/`**
- Config files: `config/board.ini`, `config/features.ini`, `config/blades.ini`, `config/blade_styles.ini`, `config/presets.ini`

You do **not** need to use every file. Only the files you put on the SD card are read. Omitted files are ignored and compile-time or default behavior is used.

The examples assume **`NUM_BLADES` 5** (see `config/config-files-config.h`): `blades.ini` defines NeoPixel strips on **blade indices 0–1**, plus **simple PWM** accents on **index 2** (Blade 3 / Free1 / `accent_pulse 1500`), **index 3** (Blade 4 / Free2 / `accent_on`), and **index 4** (Blade 5 / Free3 / `accent_glow`). `presets.ini` has **five** `style =` lines per preset (one per blade index). If you only have **one** physical strip, either set **`NUM_BLADES` 1** in your firmware config and use a **single-blade** `blades.ini` (blade 0 only) plus **one** `style =` per preset, or keep `NUM_BLADES` 2 and duplicate the same `style =` twice (the firmware maps the first working SD blade driver to the primary if blade 0 fails to init).

| File | Purpose |
|------|---------|
| **board.ini** | Board hardware: button count, OLED on/off, Bluetooth serial on/off. Optionally gesture/twist (overridden by features.ini if present). |
| **features.ini** | Feature toggles: gesture, twist-on, twist-off. Loaded after board.ini; use for contest-specific overrides without changing hardware. |
| **blades.ini** | Blade wiring: NeoPixel (`data_pin`, `pixels`, power pins) or simple PWM LED (`type=simple`, `data_pin`/`pin1`…`pin4`, `led`/`led1`…`led4`). Replaces compiled blade config when present (Proffieboard). |
| **blade_styles.ini** | Named style "recipes" as layers. See table below for full feature list. |
| **blade_styles/palettes_extra.ini** | Example **`[palette_alt]`** pulled in by **`include =`** from **`blade_styles.ini`**. |
| **blade_styles/strobe_overlay.ini** | Example fragment merged by **`include =`** inside a **`[section]`**. |
| **presets.ini** | Preset list: font, track, style, name. Includes examples of **`config <section>`**, variable overrides, nested configs, preon/postoff, and direct named styles. |

## GPIO accent named styles

For **simple PWM** outputs (`type=simple` in `blades.ini`), use **`accent_*`** styles on the matching `style =` line. All are off when the saber is retracted.

**SD config checklist (accents dark but main blades work):**

1. **`config/blades.ini`** — define **every** accent blade index (`blade = 2` … `blade = 4` for Free1–Free3). Wiring alone is not enough; missing indices are not activated at boot.
2. **`config/presets.ini`** — **five** `style =` lines per preset when `NUM_BLADES` is 5 (lines 3–5: `accent_pulse 1500`, `accent_on`, `accent_glow`). If accent lines are omitted, firmware fills accent defaults — do **not** rely on copying the main `config …` strip style onto PWM accents.
3. **Firmware** — `accent_*` styles must exist in `named_styles[]` (reflash after adding them). Over serial, `list_named_styles` should list `accent_pulse`, `accent_on`, etc. A failed parse logs `Blade N: failed to parse style "…"`.
4. **Compiled fallback** — without `presets.ini`, accents use `builtin <preset> <blade>` from compiled `config-files-config.h` (always works after flash). With `presets.ini`, styles come from the SD strings above.

**Polarity (`active_state`) vs “renders off”:** If accents work **without** `config/presets.ini` (compiled presets) but not with SD presets, polarity is usually **not** the cause — compiled `ActiveHighPIN` and SD `active_state=high` are the same. If accents work **without** `config/blades.ini` but fail **with** it, the SD runtime driver path differs (check serial for `Simple Blade (SD config)` and `failed to parse style`). Try `active_state=low` on one accent **only** if that pin drives an **N-FET** (external MOSFET), not a direct LED. Over serial while ignited: `blade 3 on` / `blade 4 on` / `blade 5 on` should force that accent on regardless of preset style.

| Style | Example | Notes |
|-------|---------|-------|
| `accent_on` | `style = accent_on` | Solid on (motor drive, indicators) |
| `accent_pulse` | `style = accent_pulse 1500` | Smooth pulse; optional `pulse_ms` (default 3000) |
| `accent_color` | `style = accent_color amber` | Solid color |
| `accent_pulse_color` | `style = accent_pulse_color red 2000` | Pulse black → color |
| `accent_strobe` | `style = accent_strobe white 15 1` | Hard flash; `flash freq_hz flash_ms` |
| `accent_flicker` | `style = accent_flicker black white` | Organic random flicker (not audio) |
| `accent_audio_flicker` | `style = accent_audio_flicker` | Jittery hum-reactive flicker |
| `accent_glow` | `style = accent_glow white` | Smooth hum-reactive brightness |
| `accent_clash` | `style = accent_clash` | Idle glow + bright flash on clash |

## Pixel blade named styles

Use directly in `presets.ini` (`style = rainbow 300 800`) or as **`layer =`** lines in `blade_styles.ini`.

### Full blades (opaque — use as bottom layer or alone)

| Style | Example | Notes |
|-------|---------|-------|
| `standard` | `standard cyan white 300 800 white white` | Base, clash, extend, retract, lockup, blast |
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
| `unstable`, `strobe`, `cycle`, `advanced` | (see `blade_styles.ini` header) | Existing complex styles |

### Overlay layers (stack on a base — many transparent until triggered)

| Style | Example | Blend tip |
|-------|---------|-----------|
| `blast` | `blast white` | Transparent until blast (no blend needed) |
| `clash` | `clash white` | Transparent until clash |
| `localized_clash` | `localized_clash white` | Positioned clash band |
| `lockup` | `lockup cyan` | Lockup / drag / melt tint |
| `sparkle` | `add opacity 8000 sparkle white` | Random sparkles |
| `pulse` | `multiply opacity 24000 pulse white 3000` | Breathing brightness |
| `swing` | `add opacity 12000 swing white 200` | Brightens when swinging |
| `drag` / `melt` / `lb` | `drag orange` | Responsive lockup variants |
| `preon_*` / `postoff_*` | `preon_glow blue` | Transparent until preon/postoff |

**Layering rule:** Opaque full blades cover everything below unless you use **`add`**, **`multiply`**, **`screen`**, or **`opacity`**. Overlays like **`blast`**, **`clash`**, **`pulse`**, and preon/postoff handle transparency internally.

Example sections in `examples/config/blade_styles.ini`: `[rainbow_pulse]`, `[standard_swing_sparkle]`, `[gradient_standard]`, `[preon_rainbow_pulse]`, `[smoke_blade]`, `[smoke_laser]`, `[water_blade]`, `[darksaber_blade]`, `[static_electricity_blade]`, `[power_wave_blade]`, `[unstable_blades]`, `[fallen_order_blade]`.

### Fett263 OS7 style approximations

These recipes approximate [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html) compiled styles via **`config/blade_styles.ini`**. **`smoke_blade`** is pure SD layers; the others need one firmware reflash for their base named styles, then remain SD-editable.

| OS7 style | SD section | Preset | Approximates well | Cannot replicate |
|-----------|------------|--------|-------------------|------------------|
| [SmokeBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#SmokeBlade) | `smoke_blade` | Smoke Blade | Rolling smoke masks, warm scatter, drag/melt/LB | StaticFire base texture, Sin/StripesX bands, OS7 lockup Bump |
| [WaterBlade](https://www.fett263.com/fett263-proffieOS7-style-library.html#WaterBlade) | `water_blade` | Water Blade | **`water_flow`** angle-reactive stripes + swing reversal, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones, BendTimePow ignition |
| [DarkSaber](https://www.fett263.com/fett263-proffieOS7-style-library.html#DarkSaber) | `darksaber_blade` | Dark Saber | **`darksaber`** stripes + brown-noise + audio + swing gleam, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones, BendTimePow ignition |
| [StaticElectricity](https://www.fett263.com/fett263-proffieOS7-style-library.html#StaticElectricity) | `static_electricity_blade` | Static Electricity | **`static_electricity`** swing charge + clash dissipate, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones, BendTimePow ignition |
| [PowerWave](https://www.fett263.com/fett263-proffieOS7-style-library.html#PowerWave) | `power_wave_blade` | Power Wave | **`power_wave`** wide slow reverse stripes, drag/melt/LB | OS7 Real Clash V1, Bump lockup zones, BendTimePow ignition |
| [UnstableBlades](https://www.fett263.com/fett263-proffieOS7-style-library.html#UnstableBlades) | `unstable_blades` | Unstable Blades | **`unstable_blades`** crackling StripesX + SlowNoise speed | OS7 Real Clash V1, Bump lockup zones; **not** named style `unstable` |
| [FallenOrder](https://www.fett263.com/fett263-proffieOS7-style-library.html#FallenOrder) | `fallen_order_blade` | Fallen Order | **`fallen_order`** pulsing stripe mid-band (800ms) on wide stripes | OS7 Real Clash V1, Bump lockup zones |

**Usage:** `style = config fallen_order_blade`, or direct: `style = fallen_order silver white 300 800`. Also: `config unstable_blades`, `config power_wave_blade`, `config smoke_blade`. Red crackle variant: **`config chaos_inferno`**.

**Base color:** Fett named styles take **`base clash extend retract`** as the first four args. Change the beam color with a direct preset (`style = fallen_order cyan white 300 800`), section variables (`base = cyan` + `layer = fallen_order {{base}} …`), or a preset override (`style = config fallen_order_blade base=cyan`). Named colors include **`silver`** (Rgb&lt;100,100,150&gt;) and **`deepskyblue`** (Rgb&lt;0,135,255&gt;); see `styles/rgb_arg.h` for the full list.

## blade_styles.ini features

| Feature | Description |
|---------|-------------|
| **Layer styles** | Full blades (`standard`, `fire`, `rainbow`, `gradient`, `audio`, …) plus overlay layers (`blast`, `clash`, `pulse`, `sparkle`, `swing`, …). |
| **Preon/postoff** | `preon_glow`, `preon_wipe`, `preon_sputter`, `postoff_glow`, `postoff_wipe`, `postoff_sputter` -- transparent transition layers that play before ignition or after retraction, with duration and intensity driven by sound files. See section below. |
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
