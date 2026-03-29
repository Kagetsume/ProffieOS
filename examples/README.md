# ProffieOS config file examples

These are **example config files** for the SD card. Copy the entire **`config`** folder (or individual files) to the **root of your SD card** so the paths match what the firmware expects:

- SD root: `Fonts/`, `tracks/`, **`config/`**
- Config files: `config/board.ini`, `config/features.ini`, `config/blades.ini`, `config/blade_styles.ini`, `config/presets.ini`

You do **not** need to use every file. Only the files you put on the SD card are read. Omitted files are ignored and compile-time or default behavior is used.

| File | Purpose |
|------|---------|
| **board.ini** | Board hardware: button count, OLED on/off, Bluetooth serial on/off. Optionally gesture/twist (overridden by features.ini if present). |
| **features.ini** | Feature toggles: gesture, twist-on, twist-off. Loaded after board.ini; use for contest-specific overrides without changing hardware. |
| **blades.ini** | Blade wiring: data pin, pixel count, power pins per blade. Replaces compiled blade config when present (platform-dependent). |
| **blade_styles.ini** | Named style “recipes” as layers (e.g. rainbow + strobe). Covers **locals `{{name}}`**, **palettes**, **top-level and section `include`**, **structured `layer.<style>.<slot>`**, **opacity**, **multiply / screen / add** blends, and **`layer = config other_section`** nesting. Optional **`config/blade_styles/*.ini`** fragments. Use in presets as **`config <section_name>`** (optional **`key=value`** overrides). |
| **blade_styles/palettes_extra.ini** | Example **`[palette_alt]`** pulled in by **`include =`** from **`blade_styles.ini`**. |
| **blade_styles/strobe_overlay.ini** | Example fragment merged by **`include =`** inside a **`[section]`**. |
| **presets.ini** | Preset list: font, track, style, name. Includes examples of **`config <section>`**, **`config <section> base=magenta`**, **`base=blue clash=yellow`**, and **`config nested_config_demo`**. |

See **doc/board_config.md**, **doc/blade_config.md**, **doc/blade_styles_config.md**, **doc/README_blade_styles_config.md**, and **doc/sd_config.md** for full format and options.

Feature checklist and implementation history: **doc/blade_styles_config_roadmap.md**.
