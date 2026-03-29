# Blade style config file

A **blade style config file** on the SD card lets you build blade effects from **layers** of existing styles (rainbow, fire, strobe, blast, etc.) using a simple INI file. No recompile needed—edit the file to change colors, patterns, and layering.

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
layer = blast white 200 100 400

# Multiple layers: base, then effects
[complex]
layer = rainbow 300 800
layer = blast white 200 100 400
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
layer = blast white 200 100 400

[stacked]
layer = config base_only
layer = strobe black white 15 1 300 800
```

## Using in presets

In **`config/presets.ini`** (or in a preset’s style field), set the style to **`config <effect_name>`** where `effect_name` is the section name in `config/blade_styles.ini`.

Example preset style string:

```ini
style1 = config rainbow_strobe
```

So the blade will use the **rainbow_strobe** effect (rainbow base + strobe layer) from the config file.

### Preset overrides (optional)

After **`config <effect_name>`**, you may add **`key=value`** tokens (each token must contain **`=`**, e.g. **`base=magenta`**). Up to **16** pairs; parsing stops at the first token without **`=`**. These values apply only to **`{{name}}`** substitution for that preset: for any name, the preset token wins over a same-name line from the INI section or merged palette. They do not add new **`layer =`** lines.

Example (section **`[with_vars]`** defines **`base`**, **`clash`**, etc.; preset overrides **`base`** for this preset only):

```ini
style = config with_vars base=magenta
```

### Tooling note

An **offline expander** (resolve **`include`**, **`palette`**, and **`{{name}}`** into one flat INI) is useful for debugging on a PC; it is **not** built into ProffieOS. You can maintain a flattened copy by hand or use a small script if you need it.

## What you can layer

The config can compose **all** available blade styles. Any **named style** that the parser knows can be used in a `layer = ...` line:

- **standard**, **rainbow**, **fire**, **strobe**, **cycle**, **advanced**, **unstable**
- **charging**, **pixel_sequence**
- **builtin** (preset styles)
- **config** (another section name)—e.g. `layer = config other_effect` nests that section’s layers

Use the same syntax as in a preset: style name followed by arguments (colors, times, etc.). For example:

- `layer = rainbow 300 800` — extension/retraction times
- `layer = fire red yellow` — warm and hot colors
- `layer = strobe black white 15 1` — standby, flash, frequency, width
- `layer = blast white 200 100 400` — blast color and timing
- `layer = standard cyan white 300 800` — base, clash, times

Layers are composited in order (first = bottom, last = top), like the compile-time `Layers<>` template.

## Effects (clash, lockup, blast, etc.)

All effects are handled by the underlying layers. If any layer handles a feature (clash, lockup, blast, stab, drag, etc.), the composite style reports that it handles it and that layer’s effect runs. You do not need special config for effects—use the same style strings as in presets (e.g. `blast white 200 100 400`, clash colors in **standard**, etc.).

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
layer = screen opacity 24000 blast white 200 100 400
```

If the first word of a sub-style could be confused with a blend keyword (rare), put **`normal`** first or reorder so the nested style does not start with **`multiply`**, **`screen`**, **`add`**, or **`normal`**.

### Structured layer keys (optional)

Instead of a single **`layer = standard cyan white 300 800`** line, you can set arguments by name (one line per argument). Unspecified arguments use the same **defaults** as the built-in style template.

- **Pattern:** **`layer.<style_name>.<slot> = value`** (e.g. **`layer.standard.base = cyan`**, **`layer.strobe.freq = 20`**).
- **Supported styles:** **`standard`**, **`fire`**, **`rainbow`**, **`strobe`**, **`cycle`**, **`unstable`**, **`advanced`**. Slot names match the style’s preset argument order (see **`style_parser.h`** descriptions). Aliases include **`ext`** / **`extension`**, **`ret`** / **`retraction`** where applicable.
- **Order:** Lines can appear in any order; they merge into **one** layer string for that style. Starting a **different** style’s **`layer.<other>.*`** line, a plain **`layer = …`**, **`palette`**, **`include`**, or leaving the section **flushes** the pending structured layer.

## Notes

- **SD required:** The file is only read when SD is enabled and the file is present. If the file or section is missing, **`config &lt;name&gt;`** will not create a style (preset may fall back or show nothing for that blade).
- **Errors:** Invalid or unknown style names in a `layer =` line are skipped (that layer is not added). The rest of the effect still works.
- **Easy to read:** One section per effect, one line per layer; you can copy style strings from presets or examples and paste them as `layer = ...`.
