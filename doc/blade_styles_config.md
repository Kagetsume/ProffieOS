# Blade style config file

A **blade style config file** on the SD card lets you build blade effects from **layers** of existing styles (rainbow, fire, strobe, blast, pulse, clash, etc.) using a simple INI file. **Layer recipes** (`config/blade_styles.ini` and `config/presets.ini`) can be edited on the SD card without recompiling. **New named styles** in firmware (e.g. **`water_flow`**, **`fallen_order`**) require a one-time reflash; after that, colors and overlays stay SD-editable.

### Named style catalog (firmware)

**Full pixel blades** (opaque; typically the bottom `layer =` line): `standard`, `fire`, `rainbow`, `gradient`, `audio`, `flicker`, `sparktip`, `sparkle_blade`, `cylon`, `pulse_blade`, `water_flow`, `darksaber`, `static_electricity`, `power_wave`, `unstable_blades`, `fallen_order`, **`thunder_loop`** (Fett263 ThunderStorm idle loop), **`responsive_flame`** (Fett263 ResponsiveFlame angle-responsive fire), **`shimmer_blade`** (Fett263 ShimmerBlade interactive swing shimmer), **`rotoscope`** (Fett263 Rotoscope hyper responsive OT rotoscope — SwingAcceleration + HoldPeakF), **`pulse_stripes`** (ignition/alt-sound HoldPeakF StripesX + Pulsing mid-band; Fett263 OS7 ignition-surge option), **`kinetic_charge`** (clash/lockup kinetic charge — `base` + `kinetic` colors; Fett263 BlackPanther OS7 idle base), **`rotating_pulse`** (Fett263 EnergyBlade Rotating Pulse — Saw-modulated StripesX), **`trickle_blade`** (energy trickle — StaticFire + angle StripesX + HoldPeakF swing; Fett263 OS7 idle base), plus `unstable`, `strobe`, `cycle`, `advanced`. Texture-only: **`thunder_loop_layer`**, **`responsive_flame_layer`** (stack with multiply/screen).

**Overlay layers** (stack above a base; many are transparent until an event): `blast`, **`blast_wave_random`** (OS7-style random wave), `clash`, `localized_clash`, **`real_clash`** (OS7 Real Clash V1), `lockup`, `sparkle`, `pulse`, `swing`, `drag`, `melt`, `lb`, **`ignition_flash`** (full-blade flash during extension), all `preon_*` / `postoff_*` styles, **`force_glow`** (audio-reactive glow on `EFFECT_FORCE` while blade is on), and **texture masks** `fire_mask`, `stripes`, `hard_stripes`, `noise_flicker`, `unstable_stripes`, `pixel_sequence`.

**In/out:** Fett263 OS7 full blades (`water_flow`, `darksaber`, `static_electricity`, `power_wave`, `unstable_blades`, `fallen_order`, `thunder_loop`, `responsive_flame`) use **BendTimePow** extend/retract via **`Os7BladeWithBendInOut`**. Generic linear in/out: **`standard`**. Same with bend curves: **`standard_bend`**. Stack **`ignition_flash`** for SeismicCharge-style ignition overlay.

**Texture recipes** in **`examples/config/blade_styles.ini`**: `[solid_smoke]`, `[solid_lava]`, `[solid_unstable]`, `[solid_shimmer]`, `[solid_chase]`, `[solid_water_shimmer]`, `[solid_barber]` — opaque base + multiply/screen/add textures.

**GPIO accents** (simple PWM in `blades.ini`): `accent_sound_on`, `accent_on`, `accent_pulse`, `accent_color`, `accent_audio_flicker`, and other `accent_*` styles — see `examples/README.md`.

Argument order and examples: **`examples/config/blade_styles.ini`** (header comments + sections such as `[rainbow_pulse]`, `[standard_swing_sparkle]`, and Fett263 recipes `[smoke_blade]`, `[water_blade]`, `[fallen_order_blade]`, etc.).

## Location and name

- Path: **`config/blade_styles.ini`** in the **root** of the SD card (same level as `Fonts`, `tracks`, `config/presets.ini`, `config/blades.ini`).
- Create the **`config`** folder if it does not exist.

## Format

- **Sections:** Each effect has a section `[effect_name]`. The name is used in presets as the style **`config effect_name`**.
- **Layers:** Inside a section, each line **`layer = <style string>`** adds one layer. Layers are drawn in order (first = base, next = on top). Same style strings as in presets (e.g. `rainbow 300 800`, `fire red yellow`, `strobe black white 15 1`).
- **Comments:** Lines starting with `#` or `;` are ignored.
- **Whitespace:** Spaces, tabs, and blank lines are ignored. Spaces around `=` are allowed. Malformed lines are skipped; they do not cause a crash.
- **Local variables (same section):** Lines **`name = value`** define names you can use in **`layer`** lines as **`{{name}}`**. Put variable lines before (or between) **`layer`** lines. Up to **16** keys; values up to **128** characters. Keys are letters, digits, and underscore. Example: `base = cyan`, `clash = white`, then `layer = standard {{base}} {{clash}} 300 800`. Duplicate **`name =`** lines in the same section override the previous value.
- **Reserved `version`:** **`version = N`** (integer) may appear in an effect section, palette section, or include fragment. It is reserved for future format migrations and is **not** expanded as **`{{version}}`** (use another key name if you need a variable called `version`).
- **Named palettes:** A section **`[palette_<id>]`** (for example **`[palette_default]`**) holds **`name = value`** lines like a variable block. In an effect section, **`palette = <id>`** merges those names: only keys **not** already set in the section are added, so put **`palette = ...`** after any per-effect overrides you want to keep, or before lines that should override the palette. **`palette`** is reserved (like **`layer`**) and is not stored as a **`{{name}}`**. Up to **8** palette sections are cached.

### Includes

- **`include = path`** pulls in another file. **Outside** any `[section]` (typically after comments at the top of the file), an include adds **`[palette_…]`** sections from that file to the palette cache so **`palette = …`** can reference them.
- **Inside** a **`[effect_name]`** section, **`include = path`** merges **fragment** lines into that section: **`layer`**, **`palette`**, and **`name = value`** lines are processed as if they appeared in place. Order matters: put **`include`** after locals/palette lines you want to apply before merged content, or before **`layer`** lines that should come after.
- **Paths:** **`config/foo.ini`** — as on the SD card. **`blade_styles/foo.ini`** → **`config/blade_styles/foo.ini`**. **`foo.ini`** alone → **`config/blade_styles/foo.ini`**. Parent directory **`..`** is not allowed.
- **Nested includes** are allowed up to a **fixed depth**; including the same file again on the chain is ignored (cycle-safe). **`[`…`]`** lines inside a fragment file are skipped.

Implementation phases (locals, palettes, includes, structured keys, opacity, blend modes, preset overrides) are described in **blade_styles_config_roadmap.md**.

## Shipped examples (repository)

The **`examples/config/`** tree mirrors SD layout. **`examples/config/blade_styles.ini`** walks through one section per feature (locals, palettes, includes, structured `layer.<style>.<slot>`, opacity, multiply/screen/add blends, **`layer = config other_section`** nesting). **`examples/config/blade_styles/`** has **`palettes_extra.ini`** and **`strobe_overlay.ini`**. **`examples/config/presets.ini`** shows **`config <section>`**, **`config <section> key=value`**, and **multiple overrides**.

## Example `config/blade_styles.ini`

The canonical annotated copy is **`examples/config/blade_styles.ini`** in the ProffieOS tree. Minimal illustration:

```ini
# Simple: one style
[plain_rainbow]
layer = rainbow 300 800

# Two layers: rainbow base with a strobe on top
[rainbow_strobe]
layer = rainbow 300 800
layer = strobe black white 15 1 300 800

# Fire with a white blast overlay
[fire_blast]
layer = fire red yellow
layer = blast white

# Multiple layers: base, then effects
[complex]
layer = rainbow 300 800
layer = blast white
layer = strobe black cyan 20 1 300 800

# Shared palette + effect (palette id = name after "palette_")
[palette_my_colors]
base = cyan
clash = white
ext = 300
ret = 800

[uses_palette]
palette = my_colors
layer = standard {{base}} {{clash}} {{ext}} {{ret}}

# Nested: reuse another section as one layer (expands its layers)
[base_only]
layer = rainbow 300 800
layer = blast white

[stacked]
layer = config base_only
layer = strobe black white 15 1 300 800
```

## Using in presets

In **`config/presets.ini`** (or in a preset’s style field), set the style to **`config <effect_name>`** where `effect_name` is the section name in `config/blade_styles.ini`.

Example preset style string:

```ini
style = config rainbow_strobe
```

So the blade will use the **rainbow_strobe** effect (rainbow base + strobe layer) from the config file.

### Preset overrides (optional)

After **`config <effect_name>`**, you may add **`key=value`** tokens (each token must contain **`=`**, e.g. **`base=magenta`**). Up to **16** pairs; parsing stops at the first token without **`=`**. These values apply only to **`{{name}}`** substitution for that preset: for any name, the preset token wins over a same-name line from the INI section or merged palette. They do not add new **`layer =`** lines.

Example (section **`[with_vars]`** defines **`base`**, **`clash`**, etc.; preset overrides **`base`** for this preset only):

```ini
style = config with_vars base=magenta
```

**Base color on Fett263-style blades:** Named styles such as **`fallen_order`**, **`water_flow`**, and **`darksaber`** take **`base clash extend retract`** as their first four arguments. Set the beam color by (1) direct preset — `style = fallen_order cyan white 300 800`; (2) section variables — `base = cyan` and `layer = fallen_order {{base}} {{clash}} {{ext}} {{ret}}`; or (3) preset override — `style = config fallen_order_blade base=cyan`. Use **`silver`**, **`deepskyblue`**, or any name from **`styles/rgb_arg.h`**.

### Tooling note

An **offline expander** (resolve **`include`**, **`palette`**, and **`{{name}}`** into one flat INI) is useful for debugging on a PC; it is **not** built into ProffieOS. You can maintain a flattened copy by hand or use a small script if you need it.

## What you can layer

The config can compose **all** available blade styles. Any **named style** that the parser knows can be used in a `layer = ...` line:

- **standard**, **rainbow**, **fire**, **gradient**, **audio**, **flicker**, **sparktip**, **sparkle_blade**, **cylon**, **pulse_blade**, **strobe**, **cycle**, **advanced**, **unstable**
- **water_flow**, **darksaber**, **static_electricity**, **power_wave**, **unstable_blades**, **fallen_order** (Fett263 OS7 base templates; see below)
- **charging**, **pixel_sequence**
- **blast**, **clash**, **lockup**, **sparkle**, **pulse**, **swing**, **drag**, **melt**, **lb**, **preon_***, **postoff_***
- **builtin** (preset styles)
- **config** (another section name)—e.g. `layer = config other_effect` nests that section’s layers

Use the same syntax as in a preset: style name followed by arguments (colors, times, etc.). For example:

- `layer = rainbow 300 800` — extension/retraction times
- `layer = fire red yellow` — warm and hot colors
- `layer = strobe black white 15 1` — standby, flash, frequency, width
- `layer = blast white` — blast overlay (color only; fade timing is fixed in the template)
- `layer = standard cyan white 300 800` — base, clash, times

Layers are composited in order (first = bottom, last = top), like the compile-time `Layers<>` template.

## Effects (clash, lockup, blast, etc.)

All effects are handled by the underlying layers. If any layer handles a feature (clash, lockup, blast, stab, drag, etc.), the composite style reports that it handles it and that layer’s effect runs. You do not need special config for effects—use the same style strings as in presets (e.g. `blast white`, clash colors in **standard**, **`drag orange`**, etc.).

## Parser hardening

The config parser is hardened so invalid or odd input does not crash and is tolerant of formatting:

- **Whitespace:** Leading/trailing space and blank lines are ignored. Spaces around `=` and around section names/values are allowed.
- **Comments:** Lines starting with `#` or `;` are ignored.
- **Invalid input:** Malformed lines (e.g. missing `=`, unknown variable names) are skipped. Empty `layer =` values are skipped. Invalid style strings in a layer cause that layer to be skipped; the rest of the section is still used.
- **No crash:** The parser does not overwrite buffers or dereference null; bad or missing file/section returns 0 layers.
- **Line cap:** Parsing stops after **SD_STYLE_CONFIG_MAX_LINES** (4096) lines so a huge or malformed file does not hang.

## Limits

- **Layers per effect:** Up to **16** (`layer =` lines per section).
- **Layer string length:** Up to **384** characters per line.
- **File:** Only **`config/blade_styles.ini`** is read; one file for all config-driven styles.
- **Palettes:** Up to **8** **`[palette_…]`** sections; each can hold up to **16** keys (same as local variables). Additional palettes may come from **top-level** **`include`** files.
- **Includes:** Max **4** nested includes; paths must stay under **`config/`** (see **Includes** above).

**Why:** ProffieOS runs on microcontrollers with limited RAM. The limits cap memory: each config style has a fixed array of 16 layer pointers, and the loader uses a **16×384-byte** buffer for layer strings. See README_blade_styles_config.md for details.

### Per-layer opacity (Phase C)

For **`config <section>`** styles, each **`layer =`** line may optionally begin with **`opacity <alpha> `** (lowercase **`opacity`**) before the nested blade style string. **alpha** is an integer **0–32768** (same scale as compile-time **AlphaL**: **32768** = fully opaque contribution when stacked, **0** = invisible). Example:

```ini
layer = rainbow 300 800
layer = opacity 12000 strobe black white 15 1 300 800
```

This scales how strongly that layer is painted over the layers below.

**Blend modes** (optional, before **`opacity`** if present): **`normal`** (default), **`multiply`**, **`screen`**, **`add`**. They combine the layer’s straight RGB with the composite **below** using the usual formulas on 0–65535 channels, then the result is composited with **`opacity`** using the same alpha-over rules as **`normal`**. Example:

```ini
layer = rainbow 300 800
layer = multiply opacity 20000 strobe black white 15 1 300 800
layer = screen opacity 24000 blast white
```

If the first word of a sub-style could be confused with a blend keyword (rare), put **`normal`** first or reorder so the nested style does not start with **`multiply`**, **`screen`**, **`add`**, or **`normal`**.

### Structured layer keys (optional)

Instead of a single **`layer = standard cyan white 300 800`** line, you can set arguments by name (one line per argument). Unspecified arguments use the same **defaults** as the built-in style template.

- **Pattern:** **`layer.<style_name>.<slot> = value`** (e.g. **`layer.standard.base = cyan`**, **`layer.strobe.freq = 20`**).
- **Supported styles:** **`standard`**, **`fire`**, **`rainbow`**, **`strobe`**, **`cycle`**, **`unstable`**, **`advanced`**. Slot names match the style’s preset argument order (see **`style_parser.h`** descriptions). Aliases include **`ext`** / **`extension`**, **`ret`** / **`retraction`** where applicable.
- **Order:** Lines can appear in any order; they merge into **one** layer string for that style. Starting a **different** style’s **`layer.<other>.*`** line, a plain **`layer = …`**, **`palette`**, **`include`**, or leaving the section **flushes** the pending structured layer.

## Fett263 OS7 compiled style approximations

Some [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html) styles are too complex for a single named style, but **most of the look** can be built from layered **`config/blade_styles.ini`** sections. Shipped recipes live in **`examples/config/blade_styles.ini`**; each section’s comments list what matches the OS7 original and what still needs compiled C++.

| OS7 style | INI section | Key SD techniques |
|-----------|-------------|-------------------|
| SmokeBlade | `[smoke_blade]` / `[smoke_laser]` | `standard` base + `fire` multiply masks + warm `screen` + `swing` / `drag` / `melt` / `lb` (pure SD; green variant in `[smoke_laser]`) |
| WaterBlade | `[water_blade]` | **`water_flow`** (StripesX + BladeAngle + swing reversal) + optional `audio` / `pulse` / `sparkle` + lockup overlays |
| DarkSaber | `[darksaber_blade]` | **`darksaber`** (Stripes + BrownNoiseFlicker + AudioFlicker + SwingSpeed gleam) + drag/melt/lb overlays |
| StaticElectricity | `[static_electricity_blade]` | **`static_electricity`** (ColorSelect charge: swing builds, clash dissipates) + drag/melt/lb overlays |
| PowerWave | `[power_wave_blade]` | **`power_wave`** (Stripes 12000/-1800) + drag/melt/lb overlays |
| UnstableBlades | `[unstable_blades]` | **`unstable_blades`** (StripesX + SlowNoise speed + flicker/noise) + drag/melt/lb overlays |
| FallenOrder | `[fallen_order_blade]` | **`fallen_order`** (Stripes + Pulsing mid-band 800ms) + drag/melt/lb overlays |
| EnergyBlade (Surging Pulse) | `[energy_blade]` | **Pure SD:** `standard_bend` + `stripes` 6000/-3000 multiply + `real_clash` / `blast_wave_random` / drag/melt/lb (no firmware style) |
| Rolling surge (slow stripes + audio) | `[rolling_surge]` | **Pure SD:** `standard_bend` + `stripes` 22000/-1400 + `audio` screen + combat overlays (~80–85%); [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html#Acolyte) Master Sol option |
| Pulse stripes (wide bands + pulse) | `pulse_stripes` / `[pulse_stripes_sd]` | **`pulse_stripes`** HoldPeakF on ignition/alt-sound + StripesX + Pulsing 1400 ms + BendTimePow in/out; [Fett263 OS7 ignition-surge option](https://www.fett263.com/fett263-proffieOS7-style-library.html#JediSurvivor) |
| EnergyBlade (Rotating Pulse) | `[rotating_pulse_sd]` | **`rotating_pulse`** (StripesX 12000 + Saw speed) + `real_clash` / `blast_wave_random` / drag/melt/lb |
| EnergyBlade (flickering core option) | `[energy_core]` | **Pure SD:** `standard_bend` + `stripes` 12000/-2200 + `fire_mask` + `noise_flicker` + `pulse` + combat overlays (~70–80%) |
| Ghostbusters (Particle Beam) | `[particle_beam]` | **Pure SD:** `standard_bend` + wide/fast `stripes` + `fire_mask`/`fire` blue scroll + combat overlays (~70–85%) |
| Trickle blade (energy trickle) | `[trickle_blade_sd]` | **`trickle_blade`** (StaticFire + BladeAngle StripesX + HoldPeakF) + `real_clash` / `blast_wave_random` / drag/melt/lb — inspired by [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html#Ahsoka) |

**Fett263 base-style fidelity notes:** Named styles **`water_flow`**, **`darksaber`**, **`static_electricity`**, **`power_wave`**, **`unstable_blades`**, and **`fallen_order`** bake in OS7 base-layer templates (one firmware reflash). SD sections stack optional layers and lockup overlays. Still simpler than full OS7 for lockup/clash (no Real Clash V1 dual-path or Bump lockup zones). Each section documents an SD-only fallback if firmware is not updated yet.

**`unstable_blades` vs `unstable`:** The Fett263 **UnstableBlades** OS7 style uses **`unstable_blades`** (silver StripesX + SlowNoise). The older built-in **`unstable`** named style is a different red crackle/strobe blade (see **`[chaos_inferno]`**).

**Usage in presets:** `style = config fallen_order_blade`, `style = fallen_order silver white 300 800`, `style = config unstable_blades`, `style = unstable_blades silver white 300 800`, etc. Colors: **`silver`** = Rgb&lt;100,100,150&gt;; **`deepskyblue`** = Rgb&lt;0,135,255&gt;.

When you receive another compiled OS7 style, compare its **base layer** (stripes, fire, gradient, etc.) to the named style catalog above and stack **overlay layers** for blast/clash/lockup/drag/melt/LB. Document gaps in the section comments the same way.

## Notes

- **SD required:** The file is only read when SD is enabled and the file is present. If the file or section is missing, **`config &lt;name&gt;`** will not create a style (preset may fall back or show nothing for that blade).
- **Errors:** Invalid or unknown style names in a `layer =` line are skipped (that layer is not added). The rest of the effect still works.
- **Easy to read:** One section per effect, one line per layer; you can copy style strings from presets or examples and paste them as `layer = ...`.
