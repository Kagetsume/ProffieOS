# SD Card Configuration

ProffieOS can load the **preset list** from a config file on the SD card instead of using the presets compiled into the firmware. This lets you change fonts, styles, and preset names without recompiling.

## Fork vs upstream (contributors / agents)

SD **`config/`** work must stay in the **fork allowlist**. **If you need a core file, ask first** — do not edit upstream paths (e.g. `common/serial.h`, `common/errors.h`, `props/`) until the user approves that file and change. See **`.cursor/rules/sd-config-fork-boundary.mdc`**. Before commit: **`scripts/check-fork-boundary.ps1`** and **`scripts/check-blades-ini-pins.ps1`** (examples **`blades.ini`** must use **`bladePin`** / **`bladePowerPin*`**, not numeric GPIO — **`.cursor/rules/blades-ini-pin-names.mdc`**).

## Opt-in firmware support

SD **`config/`** INI loading is **not** always compiled in. Enable it in your **`CONFIG_FILE`** ( **`CONFIG_TOP`** section):

```c
#define ENABLE_SD_CONFIG_FILES
```

The profile **`config/config-files-config.h`** defines this for the SD-config examples. Without it, firmware uses only compiled **`CONFIG_PRESETS`** / **`blades[]`**; files on SD under **`config/`** are ignored and the **`config`** named style is unavailable.

See **`common/sd_config_files.h`**.

## When it applies

- **Hardware config** (board, pins, number of blades, blade drivers) still comes from the compiled `CONFIG_FILE` (unless overridden by SD when **`ENABLE_SD_CONFIG_FILES`** is on).
- **Presets** (font, track, style strings, names) are taken from the SD config file when present and support is enabled.

## Config file location and format

1. Create a folder named **`config`** in the **root** of your SD card (same level as `Fonts`, `tracks`, etc.).
2. Inside `config`, create a file named **`presets.ini`**.

The format is the same as the save-dir `presets.ini` used for saving state. Parsing is **whitespace-tolerant** (spaces, tabs, blank lines are ignored). **Malformed lines or parts are ignored** and do not cause a crash. String values (font, track, style, name) are capped at 512 characters per value to avoid unbounded allocation. At boot the firmware records a file offset for each `new_preset` and stops at `end` or the end of the file. The preset you are on is the only one whose strings are loaded. Each preset is a block:

```
new_preset
font=YourFontName
font_overlay=names/YourPresetName
track=tracks/your_track.wav
style=standard cyan white 300 800
style=standard red white 300 800
name=My Preset Name
variation=0
new_preset
font=OtherFont
...
end
```

- **`new_preset`** – starts a new preset (first line of the file can be `new_preset` for preset 0).
- **`font=`** – primary font directory (e.g. `LiquidStatic` → `/LiquidStatic` on SD, usually `Fonts/LiquidStatic/`).
- **`font_overlay=`** – optional SD path(s), scanned **before** **`font=`** (same **`;`-separated** rules as **`font=`**). Use for per-preset WAV overrides (e.g. `font.wav` in `/names/Luke/`) while **`font=`** supplies the shared hum/clash pack. Missing overlay directories are ignored (no error).
- **`voice=`** – optional **full SD path** to the voice pack search directory (after **`font=`**). **If omitted, `/common` is always used** — install prompts at **`SD:/common/`** (same level as **`Fonts/`** and **`config/`**). Override only for a non-default pack, e.g. **`voice=/common/AltPack`**. Do not use shorthand names; path must be complete. Do not append **`;common`** to **`font=`**.
- **`track=`** – path to the track WAV (e.g. `tracks/hum.wav`).
- **`style=`** – one line per blade; use named styles and arguments (e.g. `standard cyan white 300 800`, `fire red yellow`, `rainbow 300 800`). For multiple blades, list one `style=` per blade in order.
- **`name=`** – display name for the preset.
- **`variation=`** – numeric variation (default 0).
- **`end`** – ends the preset list (required).

Optional first line (can be skipped):

```
installed=Dec 25 2024 12:00:00
```

## Style strings

Use the same style names and arguments as in the serial/editor:

- **solid** – e.g. `solid cyan 300 800` (base, extension ms, retraction ms) — composable; stack `clash` / `blast` in layered recipes.
- **standard** – e.g. `standard cyan white 300 800` (base, clash, extension ms, retraction ms).
- **Extend/retract `-1`** – on styles with ms args, `-1` matches ignition/retraction soundfont length.
- **Layered extend/retract** – `transition = <behavior> <extend_ms> <retract_ms> [spark|color|hilt|tip] [spark|color|hilt|tip]` sets both phases. `transition_in` and `transition_out` override one phase (`<behavior> <ms>` plus the same two optional words). Behaviors: **`bend`**, **`linear`** (also `in_out` / `inout`), **`spark`**, **`sparktip`**, **`split`** (also `middle`; `split_spark` / `middle_spark`), **`explode`** (also `inverse`; `explode_spark` / `inverse_spark`), **`sputter`**, **`flame`** (also `fire`; jagged lip, streaks toward the tip with a hot head and a dim tail), **`bmp`** (also `bitmap`). **`bmp <path> [source_height] <extend_ms> <retract_ms>`** scrubs a column file forward on extend and backward on retract (white lit, black covered). **`hilt`** / **`hilt_to_tip`** mirrors the wipe; **`tip`** / **`tip_to_hilt`** is the default. **`strip_column`** and **`strip_column_mask`** use that same reader and play backward during retract. **`solid`** / **`solid_bend`** are color only. When no transition line is set, those lines still supply times and the default curve is bend. **`smoke_flow`** and other textures do not take `ext`/`ret`. **`preon_*`**, **`postoff_*`**, **`ignition_flash`**, and **`sparktip_layer`** draw after that wipe. Parameter table: **blade_styles_config.md**.
- **fire** – e.g. `fire red yellow`.
- **rainbow** – e.g. `rainbow 300 800`.
- **gradient**, **audio**, **flicker**, **sparkle_blade**, **cylon**, **pulse_blade**.
- **strobe**, **cycle**, **unstable**, **advanced**.
- **Fett263 OS7** (firmware): monolith names **`water_flow`**, **`static_electricity`**, **`power_wave`**, **`unstable_blades`**, **`fallen_order`**, … take **`base clash extend retract`**. Inside a config section the **`transition`** mask does the wipe (default bend). **DarkSaber:** use **`darksaber_layer`** + **`config composable_darksaber`** (monolith **`darksaber`** removed). Distinct from built-in **`unstable`**.
- **GPIO accents** (simple PWM blades): **`accent_glow`**, **`accent_blast`**, **`accent_clash`**, **`accent_preon`**, **`accent_postoff`**, **`accent_sequence`**, etc. — see **`examples/README.md`**.

Run `list_named_styles` over serial to see available styles and their arguments.

### Config-driven layered styles (`config/blade_styles.ini`)

Boot and preset cache behavior (index at boot, seek-load on preset change): **sd_style_boot_order.md**.

You can build effects from **layers** in **`config/blade_styles.ini`** and reference them with **`style = config <section_name>`** (optional **`key=value`** tokens for **`{{name}}`** substitution, e.g. `style = config fallen_order_blade base=cyan`). Use composable **`solid`** / **`solid_bend`** bases plus overlay **`clash`** / **`blast`** / **`responsive_clash`** / **`responsive_blast`** / **`real_clash`** / **`blast_wave_random`** layers, or monolithic bases like **`standard`**. Composable texture layers (**`gradient_layer`**, **`rainbow_layer`**, **`audio_layer`**, **`pulse_layer`**, OS7 **`*_layer`**, **`pixel_sequence`**, **`sparktip_layer`**, …) and multiply masks **`fire_mask`**, **`stripes`**, **`random_bands`**, **`sine_waves`**, **`saw_waves`**, **`hue_waves`**, **`pulse_train`**, **`chirp`**, **`smoothstep_bands`**, **`value_noise`**, **`fbm_noise`**, **`moire_mask`**, **`blade_envelope`**, **`sine_waves_swing`**, **`noise_flicker`**, **`unstable_stripes`**, etc. stack with **multiply** / **screen** / **add** / **normal** over an opaque base. Extend/retract can use **`-1`** to match ignition/retraction soundfont length. See **blade_styles_config.md**, **README_blade_styles_config.md**, and **examples/README.md**. Capstone demo: **`style = config composable_checklist`**. Shipped recipes include **`[sine_waves_cyan]`**, **`[smoke_laser]`**, **`[smoke_sine_cyan]`**, texture demos **`[demo_sine_waves]`** … **`[demo_chirp]`**, **`[smoke_blade]`**, **`[composable_rainbow]`**, **`[solid_lava]`**, Fett263 bases **`[water_blade]`**, **`[fallen_order_blade]`**, and others in **`examples/config/blade_styles.ini`**.

**Edit Mode vs layer stacks:** Fett263 Edit Mode and OS8 **`MENU_SPEC_TEMPLATE`** menus read and write **only each preset’s `style=` line** (via **`style_parser.SetArgument`**), then save **`presets.ini`**. They do **not** edit **`blade_styles.ini`** or individual **`layer =`** rows. **`style = config section base=magenta`** is the on-saber-friendly recolor path (override tokens); full layer editing is SD card or the LayerBlade editor. Full write-up: **README_blade_styles_config.md** (*Edit Mode and on-saber menus vs layer stacks*).

## Behavior

- If **`config/presets.ini`** exists and indexes at least one `new_preset` at boot, the firmware uses it as the preset list and **SD config is active**.
- If the file is missing or invalid, the firmware uses the **compiled** presets from your config file as before.
- Blade selection (resistor ID) and hardware still come from the compiled config; only the preset list is overridden from SD.

## Memory use (config/presets.ini)

Boot stores one **4-byte file offset** per preset. Changing presets (saber off, aux) seeks to that offset and loads **one** preset: font, overlay, voice, track, name, variation, and one style string per blade (each string capped at 512 characters). The previous preset’s strings are dropped.

The index grows with the file (8 entries, then 16, then 32, and so on) and is trimmed back to the number of presets actually found. If the offset table cannot grow, the rest of the file is left unindexed and a status line says so.

The other config files use very little RAM: **board.ini** / **features.ini** only a small struct; **blades.ini** a fixed array (~512 B). **`blade_styles.ini`** is **not** kept whole in RAM: at boot the firmware builds a **section header index** (`[name]` → file offset) that grows to the number of sections. On **preset change**, it **prunes** and **warms** a **heap cache** of parsed **`layer =`** strings for the sections that preset uses (one copy of a shared recipe; up to one per blade when they differ). Palettes load on demand when a section references **`palette=`**. See **sd_style_boot_order.md**.

## Example `config/presets.ini`

Minimal excerpt ( **`NUM_BLADES` 4** in **`config/config-files-config.h`** — four `style=` lines per preset; see **`examples/config/presets.ini`** for the full list):

```
new_preset
font=Kyber
track=tracks/hum.wav
style=config sine_waves_cyan
style=accent_pulse 1500
style=accent_sound_on white 13%
style=accent_glow
name=Sine Waves Cyan
variation=0
new_preset
font=Kyber
track=tracks/hum.wav
style=config smoke_laser
style=accent_pulse 1500
style=accent_sound_on white 13%
style=accent_glow
name=Smoke Laser
variation=0
new_preset
font=Kyber
track=tracks/hum.wav
style=standard red white 300 800
style=accent_pulse 1500
style=accent_sound_on white 13%
style=accent_glow
name=Red
variation=0
end
```

Preset 0 → **`[sine_waves_cyan]`**, preset 1 → **`[smoke_laser]`**, preset 2 → **`[smoke_sine_cyan]`** in **`config/blade_styles.ini`**. Copy **`blade_styles.ini`** (and any **`include =`** fragments) to SD **`config/`** when using **`style = config …`**. Built-in styles (`standard`, `fire`, …) need only **`presets.ini`**.
