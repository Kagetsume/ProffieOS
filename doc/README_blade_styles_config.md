# Blade style config — README and examples

Build blade effects from **layers** of styles (rainbow, fire, strobe, blast, etc.) using **`config/blade_styles.ini`** on the SD card. No recompile needed—edit the file to change colors, patterns, and layering.

**Use in presets:** set the style to **`config <effect_name>`** where `effect_name` is a section name in the config file. Optional **`key=value`** tokens after the section name override **`{{name}}`** for that preset only (up to 16 pairs).

**Local variables:** In a section, lines like **`base = cyan`** define names; use **`{{base}}`** inside **`layer = ...`** lines. **Named palettes:** **`[palette_<id>]`** blocks and **`palette = <id>`** in an effect section merge shared colors. **`include = path`** loads palette sections (top-level) or merges **`layer` / palette / vars** from a fragment file into a section — see **blade_styles_config.md**.

**Structured rows:** **`layer.<style>.<slot> = value`** (e.g. **`layer.standard.base = cyan`**) build one layer from named arguments. **Opacity / blends:** a **`layer =`** line may use **`multiply`**, **`screen`**, **`add`**, optional **`normal`**, optional **`opacity <0-32768>`**, then the nested style string — see **blade_styles_config.md**.

**Worked examples on disk:** **`examples/config/blade_styles.ini`** (one section per feature), **`examples/config/blade_styles/*.ini`** (included fragments), **`examples/config/presets.ini`** (**`config <section>`** and overrides). Implementation checklist: **blade_styles_config_roadmap.md**.

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
| **standard** | base color, clash color, extension ms, retraction ms | `standard cyan white 300 800` |
| **rainbow** | extension ms, retraction ms | `rainbow 300 800` |
| **fire** | warm color, hot color | `fire red yellow` |
| **strobe** | standby color, flash color, frequency, flash ms, extension ms, retraction ms | `strobe black white 15 1 300 800` |
| **cycle** | start color, base color, flicker color, blast color, lockup color | `cycle blue blue cyan red cyan` |
| **advanced** | hilt color, middle color, tip color, onspark color, onspark time, blast color, lockup color, clash color, extension ms, retraction ms, spark tip color | `advanced red blue green white 10 white magenta white 300 800 white` |
| **unstable** | warm, warmer, hot, sparks, extension ms, retraction ms | `unstable red orange yellow 100 200` |
| **charging** | (no args) | `charging` |
| **blast** | (use inside styles that support it, or via **standard**/ **advanced**; **standard** includes blast) | — |
| **config** | section name (nested) | `config other_effect` |
| **builtin** | preset index, blade index, … | `builtin 0 1` |

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

**In preset:** `style1 = config plain_rainbow`

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

**In preset:** `style1 = config rainbow_strobe`

---

### Medium — base + blast

Blast layer on top of a base (rainbow, fire, or standard). Blast shows when a blast is triggered.

```ini
[rainbow_blast]
layer = rainbow 300 800
layer = blast white 200 100 400

[fire_blast]
layer = fire red yellow
layer = blast white 200 100 400

[cyan_blast]
layer = standard cyan white 300 800
layer = blast white 200 100 400
```

**In preset:** `style1 = config fire_blast`

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
layer = blast white 200 100 400
layer = strobe black cyan 20 1 300 800

[fire_blast_strobe]
layer = fire red yellow
layer = blast white 200 100 400
layer = strobe black white 15 1 300 800

[full_effects]
layer = standard cyan white 300 800
layer = blast white 200 100 400
layer = strobe black white 20 1 300 800
```

---

### Complex — rainbow + blast + strobe + cycle-style colors

Many layers; cycle adds color-cycling with its own blast/lockup. Composites can mix “full” styles (each with their own clash/blast/lockup) and simpler layers.

```ini
[rainbow_blast_strobe_cycle]
layer = rainbow 300 800
layer = blast white 200 100 400
layer = strobe black magenta 18 1 300 800
layer = cycle blue blue cyan red cyan
```

---

### Complex — advanced gradient + blast overlay

Use **advanced** for gradient (hilt → middle → tip) and onspark/blast/lockup/clash, then add an extra blast layer for a stronger or different blast look.

```ini
[advanced_white_blast]
layer = advanced red blue green white 10 white magenta white 300 800 white
layer = blast white 200 100 400
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
layer = blast white 200 100 400
```

---

### Complex — nested config (config calling another section)

One section can reuse another by using **config other_section** as a layer. Keeps definitions DRY and builds a library of building blocks.

```ini
[base_rainbow_blast]
layer = rainbow 300 800
layer = blast white 200 100 400

[base_rainbow_blast_strobe]
layer = config base_rainbow_blast
layer = strobe black white 15 1 300 800

[base_rainbow_blast_strobe_fast]
layer = config base_rainbow_blast_strobe
layer = strobe black cyan 30 2 300 800
```

**In preset:** `style1 = config base_rainbow_blast_strobe_fast`

---

### Complex — many layers (up to 16)

You can use up to 16 layers per section. Example with a clear base, multiple effect layers, and a final subtle strobe.

```ini
[max_layers_demo]
layer = rainbow 300 800
layer = blast white 200 100 400
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
layer = blast white 200 100 400
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
layer = blast white 200 100 400
# Top: subtle strobe
layer = strobe black white 15 1 300 800

; === Sith-style red with white flash ===
[sith]
layer = fire red yellow
layer = blast white 200 100 400
layer = strobe black white 20 1 300 800
```

**In presets:**

```ini
style1 = config main
style2 = config sith
```

---

## Using in presets

In **`config/presets.ini`** (or wherever presets are defined), set the style field to **`config <effect_name>`**:

```ini
style1 = config rainbow_strobe
style2 = config fire_blast
style3 = config base_rainbow_blast_strobe
```

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
- **Invalid input:** Malformed lines (e.g. missing `=`, unknown variable names) are skipped. Empty `layer =` values are skipped. Invalid style strings in a layer cause only that layer to be skipped.
- **No crash:** Bad or missing file/section returns 0 layers; buffers are not overrun.

---

## See also

- **blade_styles_config.md** — Format, “what you can layer”, opacity/blend/structured syntax, limits, and pointers to **`examples/config/`**.
- **blade_config.md** — Blade hardware config (pins, blades) on the SD card.
- **examples/config/** — Copy-ready SD layout; **`blade_styles.ini`** documents each feature inline.
