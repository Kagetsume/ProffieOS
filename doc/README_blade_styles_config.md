# Blade style config — README and examples

Build blade effects from **layers** of styles (rainbow, fire, strobe, blast, etc.) using **`config/blade_styles.ini`** on the SD card. **INI recipes** can be edited on the SD card without recompiling. **New firmware named styles** (e.g. **`water_flow`**, **`fallen_order`**) need a one-time reflash; colors and overlays remain SD-editable afterward.

**User guide (examples + use cases):** [`website/BLADE_STYLES.md`](../website/BLADE_STYLES.md).

**Use in presets:** set the style to **`config <effect_name>`** where `effect_name` is a section name in the config file. Optional **`key=value`** tokens after the section name override **`{{name}}`** for that preset only (up to 16 pairs).

**Local variables:** In a section, lines like **`base = cyan`** define names; use **`{{base}}`** inside **`layer = ...`** lines. **Named palettes:** **`[palette_<id>]`** blocks and **`palette = <id>`** in an effect section merge shared colors. **`include = path`** loads palette sections (top-level) or merges **`layer` / palette / vars** from a fragment file into a section — see **blade_styles_config.md**.

**Structured rows:** **`layer.<style>.<slot> = value`** (e.g. **`layer.standard.base = cyan`**) build one layer from named arguments. **Opacity / blends:** a **`layer =`** line may use **`multiply`**, **`screen`**, **`add`**, optional **`normal`**, optional **`opacity`** (percent like **`55%`** or **`55`**, or raw **0–32768** when **>100** without **`%`**; plain **`100`** = full), then the nested style string — see **blade_styles_config.md**.

### Author-facing units (layer args)

| Kind | Write in INI | Firmware notes |
|------|----------------|----------------|
| **Colors** | Name (`cyan`, `red`) or **`r,g,b`** with **0–255** per channel (e.g. **`0,24,0`**) | Scaled to 16-bit internally (×257). Legacy: any channel **>255** is treated as raw 16-bit. |
| **Layer opacity** | **`55%`** or **`55`** ( **`100%`** = full ) | Raw **>100** without **`%`** still accepted (legacy **0–32768** scale). |
| **extend_ms / retract_ms** | Milliseconds; **`-1`** = match ignition/retraction sound | Same as preset styles. |
| **Mask min / max** (waves, noise, moire, …) | Still **0–65535** brightness along the blade | **Gap:** percent (**0–100%**) not implemented yet — use raw or editor percent fields where available. |
| **Mask duty / center** (`pulse_train`, `blade_envelope`) | Prefer **percent** in editor; INI may use **`50%`** or implicit percent **≤100** | Raw **>100** without **`%`** = 0–32768 position/fraction scale. |
| **Scroll speed** (bands, stripes, waves) | Signed integer (same units as preset styles) | Negative = toward hilt. |

**Worked examples on disk:** **`examples/config/blade_styles.ini`** (one section per feature), **`examples/config/blade_styles/*.ini`** (included fragments), **`examples/config/presets.ini`** (**`config <section>`** and overrides). Implementation checklist: **blade_styles_config_roadmap.md**.

---

## Author-facing units (INI) vs firmware internals

Composable **`blade_styles.ini`** recipes use the **same style argument strings** as preset **`style = …`** lines. Most numbers you type are **author units** (milliseconds, percents, scroll rates). Firmware parses them into **fixed-point scales** used by styles at runtime. This table is for recipe authors and tool writers; you do not need to memorize the internals to build effects.

**Implementation references:** color tokens → **`styles/parse_color_arg.h`** (`ParseColorArg`, `ParseColorName`); layer **`opacity`** and any style arg wired through **`OpacityScaleIntArg`** → **`common/opacity_scale.h`** (`ParseOpacityScaleToken`).

**Named colors in INI:** **`ParseColorName`** resolves the merged catalog in **`styles/parse_color_arg_table.generated.h`** (from **`website/src/catalog/colors.json`** plus any Fett263 **`color_list_`** names not already in the catalog). Matching is case-insensitive. After editing **`colors.json`** or the Fett263 color list, run **`node tools/generate-parse-color-names.js`** and commit the updated generated header (Arduino builds do not require Node). Duplicate names keep the catalog entry; **`orange`** and **`indigo`** follow **`colors.json`**, not the slightly different Fett263 picker RGB.

| What you write in INI | Meaning for humans | Internal / notes | Legacy escape |
|----------------------|--------------------|------------------|---------------|
| **Named color** (`cyan`, `deepskyblue`, …) | Catalog sRGB swatch | **`Color16`**: 8-bit table entry × **257** per channel (65535-scale RGB) | Preset strings may use **`Rgb(r,g,b)`** wrapper |
| **`#RRGGBB`**, **`#RGB`** shorthand, or **`rrggbb`** (editor) | 24-bit sRGB hex | **`ParseColorArg`** accepts **`#`** + 6 hex digits (or 3-digit CSS shorthand); same × **257** as **`r,g,b`**. Website / SD Config Editor also accept bare **`rrggbb`**; export often normalizes to **`r,g,b`** | — |
| **`r,g,b`** with all channels **0–255** | 8-bit sRGB | Treated as 8-bit: each channel × **257** → **`Color16`** (same as named colors) | — |
| **`r,g,b`** with any channel **> 255** | Direct wide RGB | Stored as **`Color16(r,g,b)`** without ×257 (Proffie 16-bit color args) | Matches old compiled-style numeric colors |
| **Layer `opacity`** (`multiply opacity 73% …`) | How strongly this layer blends over layers below | Parsed to **0–32768** alpha scale (**32768** = opaque). Trailing **`%`**: percent 0–100. No **`%`**: integer **≤100** = percent (**`100`** = full); **>100** = raw **0–32768** | Compile-time styles use **`AlphaL<…, Int<18000>>`** directly |
| **`pulse_train` … duty**, **`blade_envelope` center**, **`real_clash` position**, **`accent_sound_on` threshold** | Percent along blade or strength | Same rules as **`opacity`** (**`50%`**, **`49%`**, …) | Raw **>100** without **`%`** = legacy **0–32768** |
| **Multiply-mask `min` / `max`** (`sine_waves`, `random_bands`, noise masks, …) | Darkest vs brightest band of the mask along the blade | **0–65535** brightness (**0** = black / full darken, **65535** = white / no change for multiply). Not the 32768 opacity scale | Percent syntax for min/max is reserved for future UX; use integers today |
| **`hue_waves` `min_hue` / `max_hue`** | Hue offset at the trough and crest | **RotateColorsX** units: **0** = no shift, **8192** ≈ 90°, **16384** ≈ 180°, **32768** = 360°. Not brightness. Blend **`hue`** | `layer = hue opacity 100% hue_waves 2400 0 0 8192 -2000` |
| **`extend_ms` / `retract_ms`** (base, **`smoke_flow`**, **`strip_column`**, …) | Blade extension and retraction duration | Milliseconds; **`-1`** = match ignition / retraction **soundfont** length (`InOutFuncAuto`) | Fixed ms in monolithic **`standard`** / **`rainbow`** strings |
| **`speed`** on scrolling textures (`stripes`, `hard_stripes`, `random_bands`, `sine_waves`, `saw_waves`, `hue_waves`, `pulse_train`, `chirp`, `value_noise`, `fbm_noise`, `moire_mask`, …) | How fast the pattern rolls along the blade | **Not milliseconds.** Sign = direction (**negative** ≈ toward tip, **positive** toward hilt, same family as stripes). Phase advances each frame by **`delta_micros * speed / 333`** (see **`styles/stripes.h`**, **`random_bands.h`**, etc.). Typical magnitudes ~**1500–3000** | Compiled templates embed the same integer speeds |
| **`period`** (and band **`scale`** on **`random_bands`**) | Wavelength / band size along the blade | Internal spatial units in the **~2000–3000** range for visible bands (same “stripe width” family). **`period 0`** disables that wave slot or passthroughs the mask | — |
| **`smoke_flow` … speed** (5th arg after ext/ret) | Smoke roll rate relative to default | Unitless multiplier; **`1`** = default roll, **`2`** = twice as fast (not the stripe **`speed`** scale) | Legacy **`smoke_up`** / **`smoke_down`** pairs |
| **`strip_column`** `path`, `source_height`, `fps`, optional axis, ext, ret | SD column animation base | **`source_height`**: blade pixels along the file’s blade axis (**width** for **`frames_y`**, **height** for **`frames_x`**); **`fps`**: target frame rate; **24-bit BMP** (**`strip_column_bmp.h`**). **`-1`** ext/ret = sound sync | Optional **`frames_y`** / **`frames_x`** (default **`frames_y`**) |
| **`real_clash`** `color`, **`blade_position`** (e.g. **`49%`** or **`angle`**) | OS7 Real Clash overlay color and band placement | **0%**–**100%** = fixed center on blade (OS7 tilt-modulated band); **`angle`** = center tracks blade tilt (**ResponsiveClash**-style). Default **49%**. Strength path uses **`GetClashStrength`** | Monolithic OS7 compiled styles |

**Quick examples:** `layer = multiply opacity 73% sine_waves 2400 0 8192 65535 -2000` — opacity is percent; period **2400**; min/max **8192–65535** (mask scale, not percent yet); scroll **-2000**. `layer = real_clash white 49%` — fixed band center ~upper blade; `layer = real_clash white angle` — band follows tilt.

---

## File and format

- **Path:** `config/blade_styles.ini` on the SD card (same level as `Fonts`, `tracks`, `config/presets.ini`).
- **Sections:** Each effect is a section `[effect_name]`. Use it in a preset as **`config effect_name`**.
- **Layers:** Inside a section, each line **`layer = <style string>`** adds one layer. First line = bottom, last = top. Same style strings as in presets.
- **Comments:** Lines starting with `#` or `;` are ignored.
- **Whitespace:** Spaces, tabs, blank lines, and spaces around `=` are fine. Malformed lines are skipped.

See **Limits** and **Parser hardening** at the end for details.

---

## Style reference (for layer strings)

Use these the same way as in a preset. Arguments are space-separated; colors can be names (e.g. `red`, `cyan`) or `Rgb(r,g,b)`.

| Style | Arguments (in order) | Example |
|-------|----------------------|---------|
| **solid** | base color, extension ms, retraction ms | `solid cyan 300 800` — composable base; stack `clash` / `blast` overlays |
| **solid_bend** | base color, extension ms, retraction ms | `solid_bend cyan 300 800` — like **solid** with OS7 BendTimePow in/out |
| **strip_column** | SD path, source height, fps, optional `frames_y`/`frames_x`, extend ms, retract ms | `strip_column anim/foo.bmp 144 30 {{ext}} {{ret}}` — **24-bit BMP** on SD; RGB column resampled with linear interpolation (see **strip_column_bmp.h**). Missing/invalid file: transparent (no effect) |
| **strip_column_mask** | SD path, source height, fps | `multiply opacity 80% strip_column_mask masks/foo.bmp 144 1` — same BMP layout as **strip_column** (always **`frames_y`**); grayscale column = multiply brightness mask. Still mask: **height 1**, **`fps` 1**. Missing/invalid file: transparent (no effect) |

**strip_column — animation file on a PC:** Use a **standard uncompressed `.bmp`** (24-bit BI_RGB — not RLE, not palette). Layout is chosen by **`frames_y`** (default) or **`frames_x`** in the style line (see **`strip_column_bmp.h`**); firmware does **not** guess from width/height alone.

| Axis | Blade pixels | Frame count | One frame in the file |
|------|--------------|-------------|-------------------------|
| **`frames_y`** (default). Aliases: `row`, `rows` | BMP **width** | BMP **height** | One horizontal **row** (hilt = top of image) |
| **`frames_x`**. Aliases: `column`, `columns` | BMP **height** | BMP **width** | One vertical **column** (hilt = top) |

**`source_height`** is the blade span in pixels (the blade axis above), not the frame count. Example (default layout): `144×120` → `144` blade pixels, **120** frames → `strip_column animations/plasma.bmp 144 30 {{ext}} {{ret}}`.

1. **GIMP:** *File → Export As…* → `.bmp` → **24-bit**, **no** run-length compression.
2. **Photoshop:** *Save As* → BMP → **24 Bit**, uncompressed Windows BMP.
3. Copy onto SD (e.g. `animations/plasma.bmp`) and reference that path in the recipe.
4. If **`source_height`** exceeds the file’s blade span, firmware **clamps** and logs a warning (max **170** pixels in RAM per column).

**Runtime (firmware):** Layer strings load with the rest of **`blade_styles.ini`** (boot **index**, preset **heap cache** — **sd_style_boot_order.md**). The **`.bmp` file itself** is opened only while the saber is **on** (not at boot). Pixels are **BGR on disk → RGB in RAM**; paths may be **quoted** if they contain spaces. **`strip_column_mask`** shares open/parse/prefetch via **`strip_column_source.h`** and **`StripColumnColumnCache`** in **`strip_column.h`**.

**Why a ring buffer:** SD reads run under **`LOCK_SD`** while styles tick. Blocking the card on every frame would hitch audio and the main loop. Firmware keeps a small **ring of decoded columns** (default **`STRIP_COLUMN_FRAME_RING_SIZE` 6**, **512 B** per slot ≈ **170** RGB pixels) so the playhead can advance while earlier ticks prefetch upcoming frames.

**Optimized SD reads:** Playback still advances **one BMP frame at a time** (no skipping when SD is slow — motion may lag **`fps`** but should not **jump** frames).

- **`frames_y`:** When buffered-ahead count drops to **`STRIP_COLUMN_Y_AHEAD_WATERMARK`** (default **1**), one seek can load up to **`STRIP_COLUMN_BMP_Y_BULK_ROWS`** (default **4**) upcoming rows via **`StripColumnBmpLoadFramesAlongYBulk`**; non-contiguous rows (loop wrap) fall back to single-frame loads.
- **`frames_x`:** Each tick loads the next vertical column in slices (**`STRIP_COLUMN_BMP_ROWS_PER_RUN`**, default **24** in **`strip_column.h`**).

Multiply textures (**`sine_waves`**, **`pulse_train`**, …) scroll on their own timers and can dominate perceived motion. To isolate the flipbook, comment out multiply layers, set sine **`speed`** to **`0`**, or try a low **`fps`** (e.g. **`2`**) before tuning texture speeds.

**LayerBlade preview:** The browser editor decodes the same 24-bit rules in **`website/src/preview/strip-column-bmp.ts`**; upload a local BMP on **`#/styles`** for **`strip_column`** / **`strip_column_mask`** path fields (approximate timing vs hardware).

| **standard** | base color, clash color, extension ms, retraction ms | `standard cyan white 300 800` |
| **rainbow** | extension ms, retraction ms | `rainbow 300 800` |
| **fire** | warm color, hot color | `fire red yellow` |
| **strobe** | standby color, flash color, frequency, flash ms, extension ms, retraction ms | `strobe black white 15 1 300 800` |
| **cycle** | start color, base color, flicker color, blast color, lockup color | `cycle blue blue cyan red cyan` |
| **advanced** | hilt color, middle color, tip color, onspark color, onspark time, blast color, lockup color, clash color, extension ms, retraction ms, spark tip color | `advanced red blue green white 10 white magenta white 300 800 white` |
| **unstable** | warm, warmer, hot, sparks, extension ms, retraction ms | `unstable red orange yellow 100 200` |
| **water_flow** | base, clash, extend ms, retract ms | `water_flow blue white 300 800` |
| **darksaber** | base, clash, extend ms, retract ms | `darksaber silver white 300 800` |
| **static_electricity** | base, clash, extend ms, retract ms | `static_electricity deepskyblue white 300 800` |
| **power_wave** | base, clash, extend ms, retract ms | `power_wave silver white 300 800` |
| **unstable_blades** | base, clash, extend ms, retract ms | `unstable_blades silver white 300 800` (not **`unstable`**) |
| **fallen_order** | base, clash, extend ms, retract ms | `fallen_order silver white 300 800` |
| **smoke_flow** | dark color, light color, extension ms, retraction ms | `smoke_flow black white {{ext}} {{ret}}` — **ext/ret must match base** (each multiply/screen line) |
| **gradient_layer** | hilt color, tip color | `gradient_layer red blue` — no ext/ret (compositor follows base) |
| **rainbow_layer** | (no args) | `rainbow_layer` — animated rainbow tint; use **`normal`** blend + opacity |
| **audio_layer** | (no args) | `audio_layer` — hum-reactive multiply mask; no ext/ret |
| **pulse_layer** | pulse ms (optional) | `pulse_layer 3000` — breathing brightness mask |
| **swing_layer** | speed threshold, delta % (optional) | `swing_layer 10 200` — swing brightening |
| **per_led_flicker** / **base_flicker** / **noise_flicker** | varies | Crackle / flicker masks — see **blade_styles_config.md** |
| **fire_mask** | warm, hot colors | `fire_mask white white` — scrolling fire multiply |
| **stripes** / **hard_stripes** | width, speed, colors… | Scroll patterns — often **`add`** or **`multiply`** |
| **random_bands** | speed, band color, gap color, scale | `random_bands -600 green black 3000` — irregular rolling bands (multiply) |
| **sine_waves** / **saw_waves** | period, phase, min, max, speed, … | Up to 4 wave slots; **`saw_waves`** = triangle ramps. See **`[sine_waves_cyan]`** |
| **hue_waves** | period, phase, min_hue, max_hue, speed, … | Same slots, but min/max are **hue offsets** (RotateColorsX: **0** none, **16384** ≈ 180°, **32768** = 360°). Stack with **`hue`**, not multiply. See **`[demo_hue_waves]`** |
| **pulse_train** | period, speed, min, max, duty | Hard square bands along the blade |
| **chirp** | period, speed, min, max, chirp_rate | Sine mask with spatial frequency sweep |
| **smoothstep_bands** | period, speed, min, max, edge_width | Soft rolling bands |
| **value_noise** / **fbm_noise** | scale, speed, min, max, … | 1D hash noise / cheap FBM multiply masks |
| **moire_mask** | period1, period2, speed1, speed2, min, max | Beating linear ramps |
| **blade_envelope** | center, width, min, max, speed | Bump along blade (**center**: **0%** hilt, **100%** tip, e.g. **`50%`**) |
| **sine_waves_swing** | sine_waves args + swing/twist scale | Motion shortens wavelength |
| **pixel_sequence** | step config string | `pixel_sequence 0,255,0,0,100,200\|1,0,255,0,100,200` — see **pixel_sequencer.md** |
| **sparktip_layer** | spark color, ext ms, ret ms | `sparktip_layer white {{ext}} {{ret}}` — spark band during extend only; stack with **`add`** |
| **charging** | (no args) | `charging` |
| **blast** | blast color only (overlay; timing fixed in template) | `blast white` |
| **blast_wave_random** | blast color (optional) | OS7 random wave on blast |
| **responsive_blast** | blast color (optional) | Blade-angle wave on blast |
| **clash** / **localized_clash** | clash color | Standard clash overlays |
| **responsive_clash** | clash color (optional) | Blade-angle bump on clash |
| **real_clash** | clash color, blade position (optional) | OS7 Real Clash V1 — **`49%`** or **`angle`** |
| **lockup** / **responsive_lockup** | lockup colors… | Held lockup overlays |
| **drag** / **melt** / **lb** | colors… | Lockup suite overlays |
| **swing** | swing color | Swing brightening overlay |
| **force_glow** | glow color (optional) | Audio-reactive glow on **`EFFECT_FORCE`** while blade is on |
| **sparkle** / **pulse** | color, … | Idle/event overlays |
| **preon_glow** / **preon_wipe** / **preon_sputter** | color… | Preon transition (blade off) |
| **postoff_glow** / **postoff_wipe** / **postoff_sputter** | color… | Postoff transition (after retract) |
| **ignition_flash** | flash color, ext ms, flash ms | Full-blade flash during extension |
| **config** | section name (nested) | `config other_effect` |
| **builtin** | preset index, blade index, … | `builtin 0 1` |

**OS7 composable texture layers** (no ext/ret on layer line; need matching firmware):
`water_flow_layer`, `darksaber_layer`, `static_electricity_layer`, `power_wave_layer`,
`fallen_order_layer`, `shimmer_blade_layer`, `rotoscope_layer`, `pulse_stripes_layer`,
`kinetic_charge_layer`, `rotating_pulse_layer`, `trickle_blade_layer`, `cylon_layer`,
`thunder_loop_layer`, `responsive_flame_layer`.

**Full layer inventory:** comment block above **`[composable_checklist]`** in
**`examples/config/blade_styles.ini`**, or preset **`style = config composable_checklist`**.
See **`examples/README.md`** for composable vs monolithic guidance.

**Extend/retract auto timing:** On styles with extension/retraction ms args, use **`-1`** to match ignition or retraction soundfont length (e.g. `ext = -1`, `layer = solid {{base}} -1 -1`).

### Extend/retract in layered recipes

| Layer kind | `ext` / `ret` on texture line? | Why |
|------------|-------------------------------|-----|
| **Base** (`solid`, `solid_bend`, …) | **Yes** — `layer = solid {{base}} {{ext}} {{ret}}` | Drives extend/retract for the stack |
| **normal/add textures** (`gradient_layer`, `stripes` with add, …) | **No** | `ConfigLayersStyle` auto-clips to base lit pixels (follows base timing, including **`-1`**) |
| **multiply/screen textures** (`audio_layer`, `pulse_layer`, `fire_mask`, …) | **No** | No internal InOut; compositor does not clip multiply (safe over black) |
| **`smoke_flow`** (multiply + screen) | **Yes — must match base** | Own InOut alpha; pass **`{{ext}} {{ret}}`** on **each** `smoke_flow` line |
| Full InOut styles as layers (`audio`, `flicker`, …) | **Yes — when args include ext/ret** | Not the same as composable **`audio_layer`** (no ext/ret) |

**Smoke recipe rule:** use **`smoke_flow` only** (not `smoke_up`/`smoke_down`). Example with sound sync:

```ini
ext = -1
ret = -1
layer = solid {{base}} {{ext}} {{ret}}
layer = multiply opacity 73% smoke_flow black white {{ext}} {{ret}}
layer = screen opacity 12% smoke_flow black {{base}} {{ext}} {{ret}}
```

Full details: **blade_styles_config.md** (section *Extend/retract in layered recipes*).

---

## Examples

### Simple — single layer

One style only; same as using that style directly in a preset, but named in the config file.

```ini
[plain_rainbow]
layer = rainbow 300 800

[plain_fire]
layer = fire red yellow

[plain_standard]
layer = standard cyan white 300 800
```

**In preset:** `style = config plain_rainbow`

---

### Simple — two layers

Base + one overlay.

```ini
[rainbow_strobe]
layer = rainbow 300 800
layer = strobe black white 15 1 300 800

[fire_white_clash]
layer = fire red yellow
layer = standard cyan white 300 800
```

**In preset:** `style = config rainbow_strobe`

---

### Medium — base + blast

Blast layer on top of a base (rainbow, fire, or standard). Blast shows when a blast is triggered.

```ini
[rainbow_blast]
layer = rainbow 300 800
layer = blast white

[fire_blast]
layer = fire red yellow
layer = blast white

[cyan_blast]
layer = standard cyan white 300 800
layer = blast white
```

**In preset:** `style = config fire_blast`

---

### Medium — base + strobe overlay

Strobe flashes on top of a smooth base. Adjust strobe frequency (3rd number) and flash duration (4th number) to taste.

```ini
[rainbow_strobe_fast]
layer = rainbow 300 800
layer = strobe black white 25 2 300 800

[fire_strobe]
layer = fire red yellow
layer = strobe black cyan 20 1 300 800

[standard_strobe]
layer = standard blue white 300 800
layer = strobe black white 15 1 300 800
```

---

### Medium — multiple effects (3–4 layers)

Base, then blast, then strobe. Order matters: later layers draw on top.

```ini
[rainbow_blast_strobe]
layer = rainbow 300 800
layer = blast white
layer = strobe black cyan 20 1 300 800

[fire_blast_strobe]
layer = fire red yellow
layer = blast white
layer = strobe black white 15 1 300 800

[full_effects]
layer = standard cyan white 300 800
layer = blast white
layer = strobe black white 20 1 300 800
```

---

### Complex — rainbow + blast + strobe + cycle-style colors

Many layers; cycle adds color-cycling with its own blast/lockup. Composites can mix “full” styles (each with their own clash/blast/lockup) and simpler layers.

```ini
[rainbow_blast_strobe_cycle]
layer = rainbow 300 800
layer = blast white
layer = strobe black magenta 18 1 300 800
layer = cycle blue blue cyan red cyan
```

---

### Complex — advanced gradient + blast overlay

Use **advanced** for gradient (hilt → middle → tip) and onspark/blast/lockup/clash, then add an extra blast layer for a stronger or different blast look.

```ini
[advanced_white_blast]
layer = advanced red blue green white 10 white magenta white 300 800 white
layer = blast white
```

---

### Complex — fire + unstable-style flicker feel (two fire-like layers)

Fire base with a second layer for more variation. You can also use **unstable** as a single layer for a more chaotic look.

```ini
[fire_double]
layer = fire red yellow
layer = fire orange red

[unstable_blast]
layer = unstable red orange yellow 100 200
layer = blast white
```

---

### Complex — nested config (config calling another section)

One section can reuse another by using **config other_section** as a layer. Keeps definitions DRY and builds a library of building blocks.

```ini
[base_rainbow_blast]
layer = rainbow 300 800
layer = blast white

[base_rainbow_blast_strobe]
layer = config base_rainbow_blast
layer = strobe black white 15 1 300 800

[base_rainbow_blast_strobe_fast]
layer = config base_rainbow_blast_strobe
layer = strobe black cyan 30 2 300 800
```

**In preset:** `style = config base_rainbow_blast_strobe_fast`

---

### Complex — many layers (up to 16)

You can use up to 16 layers per section. Example with a clear base, multiple effect layers, and a final subtle strobe.

```ini
[max_layers_demo]
layer = rainbow 300 800
layer = blast white
layer = strobe black white 15 1 300 800
layer = standard blue cyan 300 800
layer = strobe black yellow 25 2 300 800
```

(Add more `layer = ...` lines as needed; max 16 per section.)

---

### Complex — pixel_sequence as a layer

If **pixel_sequence** is available, you can use it as a layer. Syntax: **pixel_sequence** with **config** = steps separated by `|`; each step is `pixel,r,g,b,brightness,ms` (pixel 0..N-1 or 255 for all).

```ini
[rainbow_with_sequence]
layer = rainbow 300 800
layer = pixel_sequence config 0,255,0,0,255,100|255,0,255,0,255,100|0,0,255,255,100
```

(Adjust the config string to match your blade length and desired pattern.)

---

### Complex — builtin as a layer

You can layer a builtin preset style with other styles. **builtin** takes preset index and blade index, then optional builtin arguments.

```ini
[builtin_plus_blast]
layer = builtin 0 1
layer = blast white
```

---

### Commented / real-world style

Whitespace and comments are ignored; you can document sections and tweak values easily.

```ini
; === My daily driver ===
[main]
# Base: smooth rainbow
layer = rainbow 300 800
# Blast: white pulse on hit
layer = blast white
# Top: subtle strobe
layer = strobe black white 15 1 300 800

; === Sith-style red with white flash ===
[sith]
layer = fire red yellow
layer = blast white
layer = strobe black white 20 1 300 800
```

**In presets:**

```ini
style = config main
style = config sith
```

---

## Using in presets

In **`config/presets.ini`** (or wherever presets are defined), set the style field to **`config <effect_name>`**:

```ini
style = config rainbow_strobe
style = config fire_blast
style = config base_rainbow_blast_strobe
```

Use one **`style =`** line per blade (same section name repeated if all blades should match).

If the file or section is missing, **config &lt;name&gt;** will not create a style (the preset may fall back or show nothing for that blade). SD must be enabled and the file present.

---

## Effects (clash, lockup, blast, etc.)

All effects are handled by the underlying layers. If any layer handles a feature (clash, lockup, blast, stab, drag), the composite handles it too. Use the same style strings as in presets (e.g. **standard** for clash, **blast** for blast). No extra config is needed.

---

## Limits

- **Layers per effect:** Up to **16** `layer =` lines per section.
- **Layer string length:** Up to **384** characters per line.
- **File:** Only **`config/blade_styles.ini`** is read.

### Why 16 layers and 384 characters?

ProffieOS runs on microcontrollers (e.g. STM32) with limited RAM. The limits are fixed at compile time to keep memory use predictable and avoid dynamic allocation:

- **16 layers:** Each config-driven style holds a fixed array of 16 `BladeStyle*` pointers. When loading from the file, the parser uses a temporary buffer of **16×384** bytes (about **6.1 KB**) for the layer strings. Raising the cap would increase the size of every `ConfigLayersStyle` instance and the loading buffer.
- **384 characters per line:** Each `layer = ...` value is stored in a fixed slot so long **advanced** / structured lines fit. The cap prevents buffer overrun.

So the limits are a tradeoff: enough for complex, multi-layer effects while bounding RAM on embedded. If you need more layers or longer lines, the constants `STYLE_CONFIG_MAX_LAYERS` / `STYLE_CONFIG_LAYER_STR_LEN` in `common/style_config_file.h` and `CONFIG_LAYERS_MAX` in `styles/config_layers_style.h` can be increased at the cost of more memory.

---

## Parser hardening

The parser is tolerant and safe:

- **Whitespace:** Leading/trailing space and blank lines are ignored; spaces around `=` are allowed.
- **Comments:** Lines starting with `#` or `;` are ignored.
- **Invalid input:** Malformed lines (e.g. missing `=`, unknown variable names) are skipped. Empty `layer =` values are skipped. Invalid style strings in a layer cause only that layer to be skipped. If every layer is skipped (INI or runtime parse), `config <section>` fails like any other unparseable preset style (blade falls back to `builtin 0 <blade>` when allocation runs).
- **No crash:** Bad or missing file/section returns 0 layers; buffers are not overrun.
- **Remaining limits:** `{{var}}` is one pass (no nested expansion); long expansions truncate at 384 chars per layer. Malformed preset `k=v` tokens are skipped for overrides but still counted when advancing the preset style parser.

---

## Fett263 OS7 approximations

Shipped recipes in **`examples/config/blade_styles.ini`** approximate [Fett263 OS7](https://www.fett263.com/fett263-proffieOS7-style-library.html) compiled styles:

| Section | Preset example | Notes |
|---------|----------------|-------|
| `[smoke_blade]` | Smoke Blade (preset 11) | **`solid`** base + **`smoke_flow`** + **`stripes`** multiply + **`swing`** add + OS7 combat overlays |
| `[smoke_laser]` | Smoke Laser (preset 1) | Same smoke stack; green **`{{base}}`** + **`random_bands`** (not **`stripes`**) + classic **`clash`** / **`blast`** |
| `[sine_waves_cyan]` / `[smoke_sine_cyan]` | Sine Waves Cyan / Smoke Sine Cyan (presets 0 / 2) | **`sine_waves`** multiply masks + OS7 combat; **`[smoke_sine_cyan]`** adds **`smoke_flow`** on **`solid_bend`** |
| Texture demos | Presets 12–22 | **`[demo_saw_waves]`** … **`[demo_chirp]`** — one composable mask each (see **`examples/config/presets.ini`**) |
| `[water_blade]` | Water Blade | Needs **`water_flow`** in firmware |
| `[darksaber_blade]` | Dark Saber | Needs **`darksaber`** in firmware |
| `[static_electricity_blade]` | Static Electricity | Needs **`static_electricity`** in firmware |
| `[power_wave_blade]` | Power Wave | Needs **`power_wave`** in firmware |
| `[unstable_blades]` | Unstable Blades | Needs **`unstable_blades`** (not **`unstable`**) |
| `[fallen_order_blade]` | Fallen Order | Needs **`fallen_order`** in firmware |

Use **`style = config <section>`** or direct named styles. Override base color with **`base=`** tokens or section variables. Full fidelity notes: **blade_styles_config.md** (Fett263 section).

---

## Composable capstone demo

**`[composable_checklist]`** in **`examples/config/blade_styles.ini`** is a working
full stack (base + textures + transitions + OS7 clash/blast + lockup suite). Use
**`style = config composable_checklist`** in presets, or
**`style = config composable_checklist_responsive`** for Fett263 **`responsive_clash`** /
**`responsive_blast`**. Prefer composable **`solid_bend`** + overlay layers over
monolithic **`standard`** / **`rainbow`** when you need independent control of clash,
blast, and idle textures.

---

## Edit Mode and on-saber menus vs layer stacks

Saber builders often mix **Fett263 Edit Mode** (or the OS8 **`MENU_SPEC_TEMPLATE`** menu) with **`config/blade_styles.ini`** recipes. They solve different problems. This section is the honest “what works today” guide.

### How preset layers work

There are **two places** style data can live:

| Source | What you edit | What the preset stores |
|--------|----------------|-------------------------|
| **Direct named style** | Nothing extra | One line per blade, e.g. `style = standard cyan white 300 800` — the whole effect is in that string. |
| **Config recipe** | `[section]` in **`blade_styles.ini`** (`layer = …`, `base = …`, palettes) | One line per blade: `style = config <section>` plus optional **`key=value`** overrides (e.g. `style = config with_vars base=magenta`). |

At runtime, **`ConfigStyleFactory`** loads the section, parses each **`layer =`** into sub-styles, and **`ConfigLayersStyle`** composites them bottom → top. Overrides on the preset line replace section **`{{name}}`** values for that preset only (see **`[with_vars]`** in **`examples/config/blade_styles.ini`**). The INI file is **not** rewritten when you change presets — only **`presets.ini`** (or save-dir copy) holds per-preset overrides.

### How Edit Mode works

With **Fett263 Edit Mode** (`FETT263_EDIT_MODE_MENU`) or **Edit Settings**, or the newer **OS8 menu** (`MENU_SPEC_TEMPLATE`, e.g. **`FETT263_MENU_SPEC`**), color and style-option changes go through **`GetArg` / `SetArg`** in **`modes/style_argument_helpers.h`**. Those helpers read and write **only the preset’s style string** for the current blade (`current_preset_.GetStyle` → **`style_parser.SetArgument`** → save **`presets.ini`**).

Edit Mode does **not** open **`blade_styles.ini`**, does not pick a layer index, and does not edit individual **`layer =`** lines inside a section.

**Mutually exclusive menus:** firmware **`#error`s** if **`MENU_SPEC_TEMPLATE`** is combined with **`FETT263_EDIT_MODE_MENU`** or **`FETT263_EDIT_SETTINGS_MENU`**. Pick one on-saber menu system in your config.

### What works together today

- **`style = config <section>`** with **no color overrides** — blade looks correct; Edit Mode may offer **little or nothing** useful (the preset string may only contain the section name).
- **`style = config <section> base=red clash=white …`** — overrides are **words on the preset line**. You can change those values on the SD card or, in principle, via **`SetArgument`** on argument indices **after** `config` and the section name (same mechanism as **`base=magenta`** in **`examples/config/presets.ini`**).
- **Direct named styles** on the preset (`standard`, `fire`, `fallen_order`, …) — Edit Mode color menus match **positional args** in that string (Fett263 “Edit Mode color editing” styles). Saving updates **`presets.ini`** as builders expect.
- **Twist / color-change** — if the **composed** blade style reports handled color change (or smooth/stepped variation applies), twist can still shift hue on some stacks; that is **not** the same as editing each layer’s colors in the INI.
- **Website SD Config Editor** — the **Blade styles** page (`website/BLADE_STYLES.md`, `#/styles`) is the **layer-aware** path: edit **`blade_styles.ini`**, export, copy to SD. Preset lines still choose **`config <section>`** and optional overrides.

### What does not work today

- **Per-layer color editing in the INI via Edit Mode** — inner colors live in **`layer = standard {{base}} …`** (or nested styles). Menus never traverse into **`ConfigLayersStyle`** sub-layers.
- **Saving recipe structure from the saber** — adding/removing **`layer =`** lines, opacity, or blend keywords requires editing **`blade_styles.ini`** (or the website editor), not Edit Mode.
- **Assuming Edit Mode “sees” the same args as the website layer editor** — the parser’s **`config`** style exposes the **preset-line** tokens (section name + override pairs), not a flat list of every color in the stack.

### Could deeper integration work?

| Approach | Idea | Effort / risk (brief) |
|----------|------|-------------------------|
| **(a) Preset `key=value` overrides only** | Document and standardize names (`base`, `clash`, `ext`, …) in recipes; builders recolor via preset line or SD edit. **Already supported.** | Low risk; limited to vars you expose as **`{{name}}`**. |
| **(b) Expose selected args on the config wrapper** | Firmware maps Edit Mode arg slots to specific overrides or layer args when building **`config`**. | Medium–high; must stay in sync with INI templates and **`get_max_arg`**; easy to break mixed presets. |
| **(c) Menu picks layer index** | Edit Mode chooses layer 0…N−1, then edits that sub-style’s args (still saved into preset string or a new encoding). | High; UX, save format, and parser changes; backward compatibility hard. |
| **(d) Website-only layer editing** | Keep on-saber menus for **flat** preset strings; treat **`blade_styles.ini`** as author-time config. **Matches today’s architecture.** | Lowest risk; builders use PC/phone for recipes, saber for preset tweaks and ignition settings. |

**Practical recommendation:** use **`style = config … base=… clash=…`** (or duplicate presets with different override lines) for on-saber-friendly recoloring; use **Edit Mode** fully with **direct** named styles; use the **website editor** when you need to change **which layers** exist or how they blend.

---

## See also

- **blade_styles_config.md** — Format, “what you can layer”, opacity/blend/structured syntax, Fett263 approximations, limits, and pointers to **`examples/config/`**.
- **pixel_sequencer.md** — **`pixel_sequence`** step format (usable as a composable layer).
- **blade_config.md** — Blade hardware config (pins, blades) on the SD card.
- **examples/README.md** — Full composable layer catalog and Fett263 approximation table.
- **examples/config/** — Copy-ready SD layout; **`blade_styles.ini`** documents each feature inline.
- **website/BLADE_STYLES.md** — User guide with functional examples and editor workflow.
