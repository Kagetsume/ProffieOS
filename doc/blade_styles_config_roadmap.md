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
