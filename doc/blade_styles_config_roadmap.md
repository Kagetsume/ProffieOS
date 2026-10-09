# Blade styles config — roadmap

This document tracks planned work to make **`config/blade_styles.ini`** support richer, more maintainable blade effects (layered styles, shared colors, and effects) without losing the current model: each layer is still a normal ProffieOS style string composed by **`ConfigLayersStyle`**.

**Related docs:** [README_blade_styles_config.md](README_blade_styles_config.md), [blade_styles_config.md](blade_styles_config.md).

---

## Current behavior (baseline)

- **Sections:** `[effect_name]` define one named effect; presets use **`config effect_name`**.
- **Layers:** `layer = <style string>` — bottom to top; same strings as **`style=`** in presets.
- **Composition:** Fixed alpha-over stacking in **`ConfigLayersStyle`** (like compile-time `Layers<>`).
- **Limits:** `STYLE_CONFIG_MAX_LAYERS` (16), `STYLE_CONFIG_LAYER_STR_LEN` (384), single file, hardened parser.

---

## Phase A — Expressiveness (INI + preprocessor; minimal engine change)

**Goal:** DRY configs, shared colors, shorter layer lines — still expanding to the **same style strings** the parser already understands.

### A.1 — Same-section variables and `{{name}}` (done)

- Inside a `[section]`, lines **`name = value`** (before or between `layer` lines) define local variables.
- **`layer = standard {{base}} {{clash}} 300 800`** expands using those names.
- **Bounds:** Limited number of keys/values and substitution length (see `style_config_file.h`).

### A.2 — Named palette sections (done)

- Sections like **`[palette_default]`** with **`base = cyan`**, **`clash = white`**, etc. (section id is the part after **`palette_`**).
- In an effect section, **`palette = default`** merges that palette into local names for **`{{name}}`** substitution (keys already set in the section are not overwritten).
- **Implementation:** On load, the file is scanned once to fill a bounded palette cache, then the section is parsed (`StyleConfigScanPalettes` / merge in **`style_config_file.h`**).

### A.3 — Includes (done)

- **`include = path`** at **top level** (outside `[sections]`) loads **`[palette_…]`** blocks from another file into the palette cache (same scan pass).
- **`include = path`** **inside** a style section merges **`layer` / `palette` / `name = value`** lines from a **fragment** file into that section (order: lines before `include`, then included lines).
- **Paths:** must be under SD root — use **`config/…`**, or **`blade_styles/…`** (becomes **`config/blade_styles/…`**), or a **bare filename** (resolved as **`config/blade_styles/filename`**). **`..`** and backslashes are rejected.
- **Limits:** include depth **4**, cycle detection via path stack (`style_config_file.h`).

### A.4 — Optional limits tuning (done)

- **`STYLE_CONFIG_LAYER_STR_LEN`** raised to **384** (loader buffer ≈ **16×384** bytes); RAM note in `style_config_file.h`.

---

## Phase B — Structured layer rows (done)

- **`layer.<style>.<slot> = value`** lines (e.g. **`layer.standard.base = cyan`**) build one canonical **`layer = …`** string using **defaults** for unset slots.
- **Supported styles:** `standard`, `fire`, `rainbow`, `strobe`, `cycle`, `unstable`, `advanced` — slot names match each style’s argument order in **`style_parser.h`**.
- **Flush** emits a layer when the style changes, before **`layer =`**, **`palette`**, **`include`**, end of section, or next section.

---

## Phase C — Composition semantics (done)

- Per-layer **opacity** for SD config layers: a **`layer =`** line may start with **`opacity <alpha> `** before the nested style string. **alpha** is **0–32768** (same fixed scale as compile-time **AlphaL**; **32768** = full contribution).
- Implemented in **`ConfigLayersStyle`** (per-layer alpha + optional **`multiply` / `screen` / `add`** blend; see **`CompositeConfigLayer`**) and **`ConfigStyleFactory`** (parse **`opacity`** and blend keywords on each **`layer =`** line).

---

## Phase D — Cross-cutting (done)

- **Preset overrides:** optional **`key=value`** tokens after **`config <section>`** on the preset style line (e.g. **`config with_vars base=magenta`**). They win over same-name locals from the INI file and palette for **`{{name}}`** expansion (`StyleConfigExpandLocalVars`, `ConfigStyleFactory` in `style_parser.h`).
- **Version field:** **`version = N`** in **`[section]`** / palette / fragment lines is reserved (metadata for future migrations); it is not stored as a **`{{name}}`** variable.
- **Tooling:** offline expander (includes + vars → single flat INI) is optional documentation / external script territory — not part of firmware.

---

## Explore — pluggable wipe shape (started)

`transition = <behavior> <extend_ms> <retract_ms> [option] [option]` sets both phases. **`transition_in`** and **`transition_out`** override one phase (`behavior ms`, then the same two optional words). Each option is **`spark`**, a color, or **`hilt`** / **`tip`** (also **`hilt_to_tip`** / **`tip_to_hilt`**). Behaviors: **`bend`** (default, same curve solid_bend used; unknown names are bend), **`linear`** (`in_out`, `inout`), **`spark`**, **`sparktip`**, **`split`** (`middle`, `split_spark`, `middle_spark`), **`explode`** (`inverse`, `explode_spark`, `inverse_spark`), **`sputter`**, **`flame`** (`fire`), **`bmp`** (`bitmap`). **`hilt`** mirrors a one-direction wipe. **`split`** on the way out opens at the middle and both edges run outward. **`explode`** grows a lit band from the middle out to both ends, then those edges draw back to the middle until the blade is dark. **`sputter`** fades random pixels in over the extend and hides them in reverse on the retract. Add **`spark`** on a split or explode line for the moving edges. **`bmp`** does not take spark, color, or direction. **`solid`** and **`solid_bend`** are color only. Inside a config section the transition mask is the wipe and the power-off signal. Top-level `style = solid` wraps a one-layer stack plus that mask. A solid line already inside a section stays a plain color. When no transition line is set, times on the solid line (or 300 / 800) still feed a bend mask so existing recipes keep their timing. The parameter table is in **blade_styles_config.md**.

A drawn BMP column is the **`bmp`** transition: row 0 through the last row on extend, and those rows backward on retract. The shared column reader (`strip_column` / `strip_column_mask`) plays in that same direction. Math shapes stay a few operations per LED.

- **Direction** is `hilt` / `hilt_to_tip` or `tip` / `tip_to_hilt` (default). It mirrors bend, linear, spark, sparktip, sputter, and flame. Split and explode stay centered. `bmp` ignores direction. Bend and **`-1`** sound length stay the timing.
- **Textures follow for free.** Smoke, stripes, clash, and blast only paint color.
- **Edge effects belong to the wipe that has that edge.** **`sparktip_layer`** is only the spark on a hilt-to-tip leading edge. A middle-split that should flare does that inside the mask. Preon, postoff, and ignition flash stay after the mask and still hold power while they run.
- **`split`:** `transition_in = split` grows from the middle toward both ends. `transition_out = split` opens a dark gap at the middle and both edges run out to the hilt and the tip. **`spark`** on that line lights the edges.
- **`explode`:** the center band both ways. Extend grows out to the hilt and the tip. Retract starts at those ends and both edges draw into the center until the blade is dark. **`inverse`** is the same behavior. **`spark`** lights both edges.
- **`sputter`:** each pixel has a fixed random time. Extend fades those points in. Retract is that pattern reversed, so the points that lit last go dark first.
- **`flame`:** bend base from the hilt, plus motes that always run toward the tip. Extend catches them. Retract tears them off the shrinking edge and they fade on the way to the tip. `fire` is the same word. A color tints the motes.
- **`bmp`:** `transition = bmp masks/wipe.bmp 144 {{ext}} {{ret}}`. The column file is the opacity mask. Extend scrubs row 0 to the last row. Retract scrubs back to row 0. White is lit, black is covered.
- **Drawn BMP mask:** implemented as **`transition = bmp`**. The shared column cache steps forward while the blade is on and backward during retract.

---

## Checklist

| Item | Status |
|------|--------|
| Roadmap doc | Done |
| A.1 Local vars + `{{name}}` in layers | Done — same-section `name = value`; see `StyleConfigExpandLocalVars` in `style_config_file.h` |
| A.2 Palette sections + `palette =` | Done — `[palette_<id>]` + `palette = <id>` merge; see `style_config_file.h` |
| A.3 Includes | Done — `include = path`; depth/cycle/path rules in `style_config_file.h` |
| A.4 Limits tuning | Done — `STYLE_CONFIG_LAYER_STR_LEN` 384; RAM note in header |
| B Structured layer keys | Done — `layer.<style>.<slot>`; see `StyleConfigStructured*` in `style_config_file.h` |
| C Opacity + blend modes | Done — `opacity <0-32768>`; optional `multiply` / `screen` / `add` / `normal` before opacity; see `CompositeConfigLayer` |
| D Preset overrides, version, tooling | Done — preset `k=v` tokens; reserved `version`; tooling note in `blade_styles_config.md` |
| Pluggable wipe shape | Started — `transition` sets both phases; `transition_in` / `transition_out` override one. `bend`, `linear`, `spark`, `sparktip`, `split`, `explode`, `sputter`, `flame`, `bmp`, aliases, and up to two of `spark` / color / `hilt` / `tip`. See **Explore — pluggable wipe shape** and **blade_styles_config.md** |

---

## Examples (repository)

- **`examples/config/blade_styles.ini`** — Annotated sections for locals, palettes, includes, structured `layer.<style>.<slot>`, opacity, multiply/screen/add, and **`layer = config other_section`**.
- **`examples/config/blade_styles/`** — **`palettes_extra.ini`**, **`strobe_overlay.ini`** (included from the main file).
- **`examples/config/presets.ini`** — **`config <section>`**, single and multiple **`key=value`** overrides, nested style preset.

---

## Design rules

1. **Prefer expanding to existing style strings** before changing **`BladeStyle`** composition.
2. **Bound everything:** substitution length, include depth, palette count, file size.
3. **Keep `config/blade_styles.ini` optional:** missing file → compiled behavior unchanged.
