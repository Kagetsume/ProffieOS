# ProffieOS config file examples

These are **example config files** for the SD card. Copy the entire **`config`** folder (or individual files) to the **root of your SD card** so the paths match what the firmware expects:

- SD root: `Fonts/`, `tracks/`, **`config/`**
- Config files: `config/board.ini`, `config/features.ini`, `config/blades.ini`, `config/blade_styles.ini`, `config/presets.ini`

You do **not** need to use every file. Only the files you put on the SD card are read. Omitted files are ignored and compile-time or default behavior is used.

The examples assume **`NUM_BLADES` 2** (see `config/config-files-config.h`): `blades.ini` defines blade 0 and 1, and `presets.ini` has **two** `style =` lines per preset. If you only have **one** physical strip, either set **`NUM_BLADES` 1** in your firmware config and use a **single-blade** `blades.ini` (blade 0 only) plus **one** `style =` per preset, or keep `NUM_BLADES` 2 and duplicate the same `style =` twice (the firmware maps the first working SD blade driver to the primary if blade 0 fails to init).

| File | Purpose |
|------|---------|
| **board.ini** | Board hardware: button count, OLED on/off, Bluetooth serial on/off. Optionally gesture/twist (overridden by features.ini if present). |
| **features.ini** | Feature toggles: gesture, twist-on, twist-off. Loaded after board.ini; use for contest-specific overrides without changing hardware. |
| **blades.ini** | Blade wiring: data pin, pixel count, power pins per blade. Replaces compiled blade config when present (platform-dependent). |
| **blade_styles.ini** | Named style "recipes" as layers. See table below for full feature list. |
| **blade_styles/palettes_extra.ini** | Example **`[palette_alt]`** pulled in by **`include =`** from **`blade_styles.ini`**. |
| **blade_styles/strobe_overlay.ini** | Example fragment merged by **`include =`** inside a **`[section]`**. |
| **presets.ini** | Preset list: font, track, style, name. Includes examples of **`config <section>`**, variable overrides, nested configs, preon/postoff, and direct named styles. |

## blade_styles.ini features

| Feature | Description |
|---------|-------------|
| **Layer styles** | `standard`, `fire`, `rainbow`, `unstable`, `strobe`, `blast`, `cycle`, `advanced` -- opaque blade styles composited as layers. |
| **Preon/postoff** | `preon_glow`, `preon_wipe`, `postoff_glow`, `postoff_wipe` -- transparent transition layers that play before ignition or after retraction. See section below. |
| **Blend modes** | `normal`, `multiply`, `screen`, `add` -- control how layers combine. |
| **Opacity** | `opacity <0-32768>` -- per-layer transparency control. |
| **Variables** | `name = value` + `{{name}}` -- section-local variables with preset overrides (`config section key=value`). |
| **Palettes** | `[palette_<id>]` sections with `palette = <id>` -- shared variable sets across sections. |
| **Includes** | `include = path/file.ini` -- merge layers or palettes from external files. |
| **Structured layers** | `layer.<style>.<slot> = value` -- key-per-argument alternative to single-line format. |
| **Nesting** | `layer = config <other_section>` -- compose sections from other sections. |

## Preon and postoff effects

Preon and postoff styles add visual effects to the blade **before ignition** and **after retraction**. They are transparent layers that produce no output during normal blade operation -- they only activate when their trigger event fires.

### Available styles

| Style | Trigger | Effect | Arguments |
|-------|---------|--------|-----------|
| `preon_glow` | EFFECT_PREON | Fade in color, then fade out | `<color> <fade_in_ms> <fade_out_ms>` |
| `preon_wipe` | EFFECT_PREON | Wipe color hilt-to-tip, then fade | `<color> <wipe_ms> <fade_out_ms>` |
| `postoff_glow` | EFFECT_POSTOFF | Fade in color, then slowly fade out | `<color> <fade_in_ms> <fade_out_ms>` |
| `postoff_wipe` | EFFECT_POSTOFF | Fade in color, then wipe tip-to-hilt | `<color> <fade_in_ms> <wipe_ms>` |

### Timeline

```
Button press
  |-> EFFECT_PREON fires -> preon animation plays on dark blade
  |-> Preon sound plays (if font has preon/ folder)
  |-> Preon finishes -> main blade ignites (extension animation)
  |-> Normal blade operation (clash, lockup, blast all work)
  |
Button off
  |-> Blade retracts (retraction animation)
  |-> Blade fully retracted -> EFFECT_POSTOFF fires
  |-> Postoff animation plays on dark blade
  |-> Postoff sound plays (if font has postoff/ folder)
  |-> Postoff finishes -> blade LEDs power off
```

### Usage in blade_styles.ini

Add preon/postoff as regular layers. No blend mode or opacity needed:

```ini
[my_preset]
layer = standard cyan white 300 800
layer = blast white
layer = preon_glow blue 500 500
layer = postoff_glow red 100 2000
```

### Example presets

- **[mystic_awakening]** -- Blue glow pulse before ignition, red embers after retraction (Preset 10 in presets.ini).
- **[spectral_gate]** -- Green wipe before ignition, white reverse-wipe drain after retraction (Preset 11).
- **[inferno_ritual]** -- Orange pilot-light flash before fire ignition, red embers cooling 3 seconds after shutdown (Preset 12).

### Tips

- Match preon timing to your font's preon sound duration for the best effect.
- Contrasting preon/postoff colors (e.g. blue preon on a red blade) create dramatic visual transitions.
- Longer `fade_out_ms` values (2000-4000ms) on postoff look like cooling embers; shorter values (200-500ms) feel like a quick energy flash.
- You can use preon/postoff with any base style (standard, fire, rainbow, etc.).

See **doc/board_config.md**, **doc/blade_config.md**, **doc/blade_styles_config.md**, **doc/README_blade_styles_config.md**, and **doc/sd_config.md** for full format and options.

Feature checklist and implementation history: **doc/blade_styles_config_roadmap.md**.
