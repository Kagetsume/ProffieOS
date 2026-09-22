# Blade styles configuration guide

This guide explains **`config/blade_styles.ini`** — layer recipes, how they connect to
**`presets.ini`**, and copy-paste examples you can build from. The SD Config Editor **Blade
styles** page (`#/styles`) edits the same data and exports this file.

Firmware reference: [`doc/blade_styles_config.md`](../doc/blade_styles_config.md)  
Annotated examples: [`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini)  
Accent styles (PWM blades): [`examples/README.md`](../examples/README.md)

---

## Quick start — what do I want to build?

| Goal | Start with example | Preset line |
|------|-------------------|-------------|
| Simple rainbow blade | [§1 Plain rainbow](#1-plain-rainbow-one-layer) | `style = config plain_rainbow` |
| Fire with blast flash | [§2 Fire + blast](#2-fire--blast-two-layers) | `style = config fire_blast` |
| Recolor without editing INI | [§3 Variables](#3-section-variables-recolor-from-presets) | `style = config with_vars base=magenta` |
| Smoke / texture blade (SD-only) | [§8 Smoke blade](#8-smoke-blade-texture-stack) | `style = config smoke_blade` |
| Composable gradient / audio / pulse | [§12 Composable textures](#12-composable-texture-recipes) | `style = config composable_gradient` |
| Full composable layer inventory | [§12 Composable textures](#12-composable-texture-recipes) | `style = config composable_checklist` |
| Fett263 OS7 water look | [§9 Water blade](#9-water-blade-firmware-base--overlays) | `style = config water_blade` |
| Preon glow + postoff wipe | [§13 Preon / postoff](#13-preon--postoff-transitions) | `style = config mystic_awakening` |
| PWM accent (motor, bar graph) | [§16 Accent on simple blade](#16-accent-recipes-on-pwm-blades) | `style = accent_pulse 1500` (in presets, not this file) |
| Reuse a sub-recipe | [§7 Nested config](#7-nested-config-reusable-sub-recipes) | `style = config nested_config_demo` |

**Rule of thumb:** **`blade_styles.ini`** = reusable **recipes** (layer stacks).
**`presets.ini`** = which recipe (or direct named style) each blade uses, plus font/track/name.

---

## What is `blade_styles.ini` for?

| Question | Answered here | Answered elsewhere |
|----------|---------------|-------------------|
| What colors/effects does this blade show? | `[section]` + `layer =` lines | — |
| Which recipe does preset 3 use? | — | `style = config section` in `presets.ini` |
| How is the strip wired? | — | `config/blades.ini` ([BLADES.md](./BLADES.md)) |
| New firmware effect name (e.g. `water_flow`) | Needs one reflash | Colors/overlays still SD-editable after |

Each **`[section_name]`** block is one **recipe**. Presets reference it as:

```ini
style = config section_name
```

Optional **`key=value`** tokens override section variables for that preset only:

```ini
style = config with_vars base=red clash=yellow
```

Layers composite **bottom → top** (first `layer =` is the base; each next line draws on top).

---

## Core concepts

### Base layers vs overlay layers

| Kind | Examples | Behavior |
|------|----------|----------|
| **Base (opaque)** | `standard`, `solid`, `fire`, `rainbow`, `water_flow`, `darksaber`, … | Fills the blade when ignited |
| **Overlay (event-driven)** | `blast`, `clash`, `lockup`, `swing`, `drag`, `melt`, `preon_glow`, … | Mostly transparent until triggered |
| **Texture (mask)** | `fire_mask`, `stripes`, `noise_flicker`, `smoke_flow`, composable `*_layer`, … | Usually stacked with `multiply` / `screen` / `add` + `opacity`; **`smoke_flow` needs `{{ext}}`/`{{ret}}`** |

**Composable base:** Use **`solid`** or **`solid_bend`** when you want extend/retract and color
but **no built-in clash/lockup/blast** — then add `clash`, `blast`, `responsive_lockup`, etc. as
separate overlay layers. This is how advanced SD recipes (smoke, greyscale, energy) are built.

**Monolithic base:** **`standard`**, **`rainbow`**, **`fire`**, Fett263 bases (`water_flow`, …)
include their own combat behavior; you can still stack extra overlays on top.

### Blend modes and opacity

```ini
layer = multiply opacity 20000 fire white white
layer = add opacity 8000 swing white 200
layer = screen opacity 22000 blast white
```

| Blend | Use for |
|-------|---------|
| `normal` (default) | Standard alpha-over; opaque layers cover what's below |
| `multiply` | Darkening masks (smoke, stripes, lava scroll) |
| `screen` | Soft brightening without harsh clip |
| `add` | Flashes, strobe pulses, sparkles on a base |

**Opacity:** `0` = transparent, `32768` = fully opaque. Opaque full blades without blend +
opacity will **hide** layers below — use overlays, textures with blend, or lower opacity.

### Section variables

```ini
[my_blade]
base = cyan
ext = 300
ret = 800
layer = solid {{base}} {{ext}} {{ret}}
layer = clash white
```

Presets override: `style = config my_blade base=magenta`

**Extend/retract auto timing:** Use **`-1`** for `ext` / `ret` (or inline on `solid`, `standard`,
`rainbow`, etc.) to match ignition or retraction soundfont length instead of fixed milliseconds:

```ini
ext = -1
ret = -1
layer = solid {{base}} {{ext}} {{ret}}
```

### Extend/retract: who needs timing on the layer line?

When layers are stacked, **`ConfigLayersStyle`** uses **layer 0** (the base) as the extend/retract
reference for **`normal`** and **`add`** overlays — those textures **do not** need `ext`/`ret` on
their lines and automatically follow the base, including **`-1`** sound sync.

| Layer | Pass `{{ext}}` / `{{ret}}`? |
|-------|----------------------------|
| Base (`solid`, `solid_bend`, …) | **Yes** |
| `gradient_layer`, `stripes` (add), … | **No** — auto-clipped to base |
| Composable `*_layer` textures (`audio_layer`, `pulse_layer`, `swing_layer`, `fire_mask`, …) | **No** |
| **`smoke_flow`** (each multiply/screen line) | **Yes — same values as base** |
| Full styles with InOut stacked as a layer (`audio`, `flicker`, …) | **Yes** — pass matching ext/ret in that style's args |

**`smoke_flow`** has its own InOut wrapper. You **must** pass matching extend/retract on every
`smoke_flow` line. Use section variables so preset overrides stay in sync:

```ini
style = config smoke_blade ext=-1 ret=-1
```

Composable example (gradient follows base; no extra timing on textures):

```ini
ext = -1
ret = -1
layer = solid_bend {{base}} {{ext}} {{ret}}
layer = normal opacity 32768 gradient_layer {{hilt}} {{tip}}
layer = multiply opacity 32768 audio_layer
```

See also [`doc/blade_styles_config.md`](../doc/blade_styles_config.md).

### Palettes and includes

**Shared colors across sections:**

```ini
[palette_default]
base = cyan
clash = white

[uses_palette]
palette = default
layer = solid {{base}} 300 800
```

**Merge a fragment file into one section:**

```ini
[rainbow_strobe_included]
layer = rainbow 300 800
include = blade_styles/strobe_overlay.ini
```

See [`examples/config/blade_styles/`](../examples/config/blade_styles/) for fragment examples.

---

## Complete examples

### 1. Plain rainbow (one layer)

**Use for:** Simplest config-driven style; same as `style = rainbow 300 800` in presets but named.

```ini
[plain_rainbow]
layer = rainbow 300 800
```

```ini
style = config plain_rainbow
```

---

### 2. Fire + blast (two layers)

**Use for:** Rolling flame with white flash on blast. Blast is transparent until triggered — no
blend mode needed.

```ini
[fire_blast]
layer = fire red yellow
layer = blast white
```

---

### 3. Section variables (recolor from presets)

**Use for:** One recipe, many color variants without duplicating sections.

```ini
[with_vars]
base = cyan
clash = white
ext = 300
ret = 800
layer = solid {{base}} {{ext}} {{ret}}
layer = clash {{clash}}
layer = blast white
```

```ini
style = config with_vars base=magenta
style = config with_vars base=blue clash=yellow
```

---

### 4. Rainbow + strobe pulse (blend required)

**Use for:** Keep rainbow visible while strobe flashes. Strobe is opaque — use **`add opacity`**
so black standby adds nothing and white flash brightens the base.

```ini
[rainbow_strobe]
layer = rainbow 300 800
layer = add opacity 16000 strobe black white 15 1 300 800
```

---

### 5. Three-layer stack (rainbow + blast + strobe)

**Use for:** Full combat plus periodic cyan pulses.

```ini
[complex]
layer = rainbow 300 800
layer = blast white
layer = add opacity 16000 strobe black cyan 20 1 300 800
```

---

### 6. Structured layer keys (readable args)

**Use for:** Long argument lists; same result as one `layer =` line. Supported for `standard`,
`fire`, `rainbow`, `strobe`, `cycle`, `unstable`, `advanced`.

```ini
[structured_standard]
layer.standard.base = cyan
layer.standard.clash = white
layer.standard.ext = 300
layer.standard.ret = 800
```

Preon/postoff: use single-line `layer = preon_glow blue` (not structured keys yet).

---

### 7. Nested config (reusable sub-recipes)

**Use for:** Build complex stacks from shared building blocks.

```ini
[base_rainbow_blast]
layer = rainbow 300 800
layer = blast white

[nested_config_demo]
layer = config base_rainbow_blast
layer = add opacity 16000 strobe black white 15 1 300 800
```

---

### 8. Smoke blade (texture stack)

**Use for:** Fett263 SmokeBlade-style look — **`solid`** composable base + **`smoke_flow`**
(offset dual-band sine smoke) + separate **`clash`** / **`blast`** / lockup overlay layers.

**Important:** **`smoke_flow`** has its own extend/retract. Pass **`{{ext}} {{ret}}` on every
`smoke_flow` line** — same values as the base (including **`-1`** for soundfont length).

```ini
[smoke_blade]
base = blue
ext = 300
ret = 800
layer = solid {{base}} {{ext}} {{ret}}
layer = multiply opacity 24000 smoke_flow black white {{ext}} {{ret}}
layer = screen opacity 4000 smoke_flow black {{base}} {{ext}} {{ret}}
layer = add opacity 6000 swing white 200
layer = real_clash white 16000
layer = blast white
layer = responsive_lockup white
layer = drag white
layer = melt orange
layer = lb white
```

**multiply** uses **`black white`** (dim smoke). **screen** wisps use **`black {{base}}`** so
highlights stay the base hue.

```ini
style = config smoke_blade
style = config smoke_blade base=purple
style = config smoke_blade ext=-1 ret=-1
```

Also in the editor **recipe library** as a starter template.

---

### 9. Water blade (firmware base + overlays)

**Use for:** Flowing water idle (needs **`water_flow`** in firmware after one reflash), plus
audio shimmer and tip pulse.

```ini
[water_blade]
base = blue
tip = cyan
clash = white
ext = 300
ret = 800
pulse_ms = 5000
layer = water_flow {{base}} {{clash}} {{ext}} {{ret}}
layer = screen opacity 8000 audio {{base}} {{tip}} {{clash}} {{ext}} {{ret}}
layer = multiply opacity 12000 pulse {{tip}} {{pulse_ms}}
layer = add opacity 3000 sparkle white
layer = drag white
layer = melt orange
layer = lb white
```

**Note:** The **`audio`** line uses the full blade style (with its own InOut), not composable
**`audio_layer`** — so it takes **`{{ext}}`/`{{ret}}`**. **`water_flow`** already includes
lockup/clash; this recipe adds drag/melt/LB overlays only.

Direct preset alternative: `style = water_flow blue white 300 800`

---

### 10. DarkSaber / Static / Fallen Order (Fett263 bases)

**Use for:** OS7-style idle animations. Reflash once for the named style; keep colors on SD.

```ini
[darksaber_blade]
base = silver
clash = white
ext = 300
ret = 800
layer = darksaber {{base}} {{clash}} {{ext}} {{ret}}
layer = responsive_lockup white
layer = drag white
layer = melt orange
layer = lb white
```

Similar sections in the repo: `static_electricity_blade`, `fallen_order_blade`, `power_wave_blade`,
`unstable_blades`, `shimmer_blade_sd`, `rotoscope_sd`, `kinetic_charge_sd`, `thunder_storm_sd`.

---

### 11. Energy / rolling surge (pure SD stripes)

**Use for:** Striped energy core or slow rolling bands without new firmware.

```ini
[energy_blade]
base = blue
ext = 300
ret = 800
layer = solid_bend {{base}} {{ext}} {{ret}}
layer = multiply opacity 16000 stripes 6000 -3000 {{base}} black
layer = real_clash white 16000
layer = blast_wave_random white
layer = responsive_lockup white
```

```ini
[rolling_surge]
base = blue
ext = 300
ret = 800
layer = solid_bend {{base}} {{ext}} {{ret}}
layer = multiply opacity 16000 stripes 22000 -1400 {{base}} black
layer = screen opacity 10000 audio {{base}} {{base}} white {{ext}} {{ret}}
layer = real_clash white 16000
```

---

### 12. Composable texture recipes

**Use for:** Build **`gradient`**, **`audio`**, or **`pulse`** looks from a **`solid_bend`**
composable base plus **`gradient_layer`**, **`audio_layer`**, **`pulse_layer`**, etc. — without
monolithic base styles.

**Extend/retract:** Only the base line needs **`{{ext}}`/`{{ret}}`**. Composable **`*_layer`**
textures do not. Exception: if you stack a **full** InOut style (e.g. **`audio`**) as a layer,
pass matching ext/ret in that style's args (see [water blade §9](#9-water-blade-firmware-base--overlays)).

```ini
[composable_gradient]
base = red
hilt = red
tip = orange
ext = 300
ret = 800
layer = solid_bend {{base}} {{ext}} {{ret}}
layer = normal opacity 32768 gradient_layer {{hilt}} {{tip}}
layer = real_clash white 16000
layer = blast white

[composable_audio]
base = blue
ext = 300
ret = 800
layer = solid_bend {{base}} {{ext}} {{ret}}
layer = multiply opacity 32768 audio_layer
layer = real_clash white 16000
layer = blast white
```

Shipped sections: **`[composable_gradient]`**, **`[composable_gradient_tint]`**,
**`[composable_rainbow]`**, **`[composable_audio]`**, **`[composable_breathe]`**,
**`[composable_crackle]`**, **`[composable_shimmer]`**, OS7 approximations
(`[composable_water_flow]`, `[composable_cylon]`, …), and capstone demos
**`[composable_checklist]`** / **`[composable_checklist_responsive]`** in
**`examples/config/blade_styles.ini`**.

**Composable alternatives to monoliths:**

| Monolithic | Composable replacement |
|------------|------------------------|
| `rainbow` | `solid_bend black …` + `normal opacity 32768 rainbow_layer` |
| `gradient` | `solid_bend` + `normal opacity 32768 gradient_layer hilt tip` |
| `audio` | `solid_bend` + `multiply opacity 32768 audio_layer` |
| `pulse_blade` | `solid_bend` + `multiply opacity 32768 pulse_layer 3000` |
| `sparktip` (full InOut) | `solid_bend` + `add sparktip_layer white {{ext}} {{ret}}` during extend |

**Clash / blast paths:** OS7 stack uses **`real_clash`** + **`blast_wave_random`**;
Fett263 responsive stack uses **`responsive_clash`** + **`responsive_blast`**. Pick one
pair — do not stack multiple clash or blast types.

**Other composable overlays:** `force_glow` (audio-reactive on `EFFECT_FORCE`),
`localized_clash`, `responsive_lockup`, `drag`, `melt`, `lb`, `sparkle`, `pulse`,
`preon_*` / `postoff_*`, `ignition_flash`.

Canonical layer inventory: comment block above **`[composable_checklist]`** in
[`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini) and
[`examples/README.md`](../examples/README.md).

---

### 13. Preon / postoff transitions

**Use for:** Glow or wipe during preon sound (before extension) and postoff sound (after
retraction). Needs matching **`preon/`** and **`pstoff/`** folders in the font.

```ini
[mystic_awakening]
layer = solid cyan 300 800
layer = clash white
layer = blast white
layer = preon_glow blue
layer = postoff_wipe red
```

| Layer | When it runs |
|-------|----------------|
| `preon_glow` / `preon_wipe` / `preon_sputter` | During preon audio (blade still off) |
| `postoff_glow` / `postoff_wipe` / `postoff_sputter` | After full retraction, during pstoff audio |

More examples: `spectral_gate`, `inferno_ritual`, `sputter_gate` in
[`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini).

---

### 14. Ignition flash overlay

**Use for:** Full-blade flash during extension (SeismicCharge-style).

```ini
[ignition_flash_demo]
layer = solid cyan 300 800
layer = clash white
layer = ignition_flash white 300 600
```

---

### 15. Chaos inferno (aggressive multi-layer)

**Use for:** Unstable crackling base + fire warmth + rainbow tint + strobe + audio shimmer.

```ini
[chaos_inferno]
layer = unstable red red orange yellow 300 800
layer = screen opacity 10000 fire red yellow
layer = screen opacity 6000 rainbow 300 800
layer = blast white
layer = add opacity 5000 strobe black cyan 18 1 300 800
layer = add opacity 4000 solid blue 300 800
```

---

### 16. Accent recipes on PWM blades

**Simple PWM outputs** (`type = simple` in `blades.ini`) do **not** use layer recipes in this
file for basic accents. Set styles **directly in presets**:

```ini
style = accent_pulse 1500
style = accent_sound_on white 4096
style = accent_glow white
```

**Layered accents** can use config recipes — stack `accent_*` bases with overlay and
**composable texture** layers in `blade_styles.ini`, then `style = config accent_reactive`
in presets. On a single PWM LED, texture layers (`audio_layer`, `pulse_layer`, `fire_mask`,
`hard_stripes`, …) modulate **uniform brightness** the same way they do on a pixel blade.

| Recipe | Stack |
|--------|--------|
| `accent_reactive` / `accent_combat` | `accent_glow` + clash / lockup / swing / blast |
| `accent_os7_combat` | glow + `real_clash`, `blast_wave_random`, drag/melt/lb |
| `accent_solid_reactive` | `accent_color` + combat overlays |
| `accent_motor_clash` | `accent_sound_on` + clash |
| `accent_glow_sparkle` | glow + add `sparkle` |
| `accent_ignite_flash` | glow + `ignition_flash` |
| `accent_composable_audio` | `accent_color` + multiply `audio_layer` |
| `accent_composable_breathe` | `accent_color` + multiply `pulse_layer` |
| `accent_composable_crackle` | `accent_color` + per_led / noise / base_flicker |
| `accent_composable_heat` | `accent_color` + `fire_mask` (solid_lava pattern) |
| `accent_composable_stripes` | `accent_color` + `hard_stripes` |
| `accent_composable_flame` / `accent_composable_thunder` | `accent_color` + Fett263 texture layers |

Full list: [`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini) — GPIO ACCENT RECIPES section.

---

## Layer style catalog (summary)

Full tables: [`examples/README.md`](../examples/README.md) and the header of
[`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini).

| Group | Styles | Typical role |
|-------|--------|--------------|
| Composable base | `solid`, `solid_bend` | Extend/retract + color only; stack overlays below |
| Monolithic base | `standard`, `fire`, `rainbow`, `water_flow`, `fallen_order`, … | Full blade with built-in combat |
| Overlays | `blast`, `clash`, `real_clash`, `responsive_clash`, `blast_wave_random`, `responsive_blast`, `lockup`, `responsive_lockup`, `swing`, `drag`, `melt`, `lb`, `force_glow`, … | Combat and motion reactions |
| Composable textures | `gradient_layer`, `rainbow_layer`, `audio_layer`, `pulse_layer`, `swing_layer`, `fire_mask`, `stripes`, `pixel_sequence`, OS7 `*_layer` (`water_flow_layer`, `cylon_layer`, `sparktip_layer`, …) | Masks and idle motion stacked over base |
| Smoke (matched ext/ret) | `smoke_flow` | Multiply/screen bands — pass **`{{ext}}`/`{{ret}}`** on each line |
| Preon/postoff | `preon_glow`, `preon_wipe`, `postoff_wipe`, `ignition_flash`, … | Startup/shutdown tied to font sounds |
| Accents | `accent_pulse`, `accent_glow`, … | PWM blades in presets (usually not layered here) |

The editor **Add layer** dropdown groups styles the same way (`catalog/named-styles.json`).

---

## How presets connect

One preset, main blade uses a config recipe:

```ini
new_preset
font = MyFont
track = tracks/hum.wav
style = config smoke_blade base=purple
style = accent_pulse 1500
name = Smoke + pulse accent
variation = 0
end
```

| Line | Blade index | Source |
|------|-------------|--------|
| 1st `style =` | 0 (main NeoPixel) | `[smoke_blade]` in `blade_styles.ini` |
| 2nd `style =` | 1 (accent) | Direct `accent_*` named style |

Multi-blade presets need one `style =` per logical blade (see [BLADES.md](./BLADES.md)).

---

## Editor workflow (`#/styles`)

1. Pick a **Blade style (recipe)** from your file or add **New recipe**.
2. Set **section variables** (`base`, `ext`, `ret`, …) when layers use `{{name}}`.
3. Build the **recipe stack** bottom → top: base blade, textures, overlays.
4. Use **blend** + **opacity** on texture layers; keep combat as normal overlays when possible.
5. Watch the **preview** (approximate — not firmware-accurate).
6. **Export** → copy or download `blade_styles.ini` to SD `config/`.
7. Reference sections in `presets.ini`: `style = config your_section`.

**Recipe library:** The picker includes bundled starters (`smoke_blade`, `water_blade`, … from
`catalog/config-styles.json`) you can insert as new sections.

---

## Common mistakes

| Symptom | Likely cause |
|---------|----------------|
| Strobe hides rainbow completely | Opaque layer without `add`/`screen` + `opacity` |
| No clash flash | Base is `solid` but `clash` layer missing |
| Preon never shows | No `preon/` sounds in font, or layer omitted |
| `config foo` fails to parse | Section `[foo]` missing from SD file |
| Colors wrong after SD edit | Preset override or old SD file — re-export both INIs |
| `water_flow` unknown | Firmware not reflashed with named style |
| Preview ≠ saber | Preview is approximate; verify on hardware |

---

## Limits (firmware)

| Limit | Value | Applies to |
|-------|-------|------------|
| Layers per section | 16 | `blade_styles.ini` |
| Characters per `layer =` line | 384 | `blade_styles.ini` |
| Section variables | 16 keys per section | `blade_styles.ini` |
| Preset `config` overrides | 16 `key=value` pairs | `presets.ini` |
| Palette sections | 8 cached | `blade_styles.ini` |
| Include nesting depth | Fixed (cycle-safe) | `blade_styles.ini` |
| Parser line cap | **4096** lines | **`blade_styles.ini`** (`SD_STYLE_CONFIG_MAX_LINES`) |
| Parser line cap | 512 lines | `blades.ini`, `board.ini` (different files) |
| Style string per preset | 512 characters max | `presets.ini` |

---

## Related docs

- [BLADES.md](./BLADES.md) — wiring (`blades.ini`)
- [`doc/blade_styles_config.md`](../doc/blade_styles_config.md) — parser grammar
- [`doc/README_blade_styles_config.md`](../doc/README_blade_styles_config.md) — shorter reference
- [`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini) — every feature demonstrated
