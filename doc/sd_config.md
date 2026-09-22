# SD Card Configuration

ProffieOS can load the **preset list** from a config file on the SD card instead of using the presets compiled into the firmware. This lets you change fonts, styles, and preset names without recompiling.

## When it applies

- **Hardware config** (board, pins, number of blades, blade drivers) still comes from the compiled `CONFIG_FILE`.
- **Presets** (font, track, style strings, names) are taken from the SD config file when present.

## Config file location and format

1. Create a folder named **`config`** in the **root** of your SD card (same level as `Fonts`, `tracks`, etc.).
2. Inside `config`, create a file named **`presets.ini`**.

The format is the same as the save-dir `presets.ini` used for saving state. Parsing is **whitespace-tolerant** (spaces, tabs, blank lines are ignored). **Malformed lines or parts are ignored** and do not cause a crash. String values (font, track, style, name) are capped at 512 characters per value to avoid unbounded allocation. Parsing stops after **SD_PRESETS_CONFIG_MAX_LINES** (2048) lines. Each preset is a block:

```
new_preset
font=YourFontName
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
- **`font=`** – font directory name (e.g. `MyFont` for `Fonts/MyFont/`).
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
- **Layered extend/retract** – base layer sets timing; **`normal`/`add` textures** and composable **`*_layer`** textures follow without extra args; **`smoke_flow`** and other **own-InOut** styles must receive the **same `{{ext}}`/`{{ret}}` as the base** on each layer line (see **blade_styles_config.md**).
- **fire** – e.g. `fire red yellow`.
- **rainbow** – e.g. `rainbow 300 800`.
- **gradient**, **audio**, **flicker**, **sparktip**, **sparkle_blade**, **cylon**, **pulse_blade**.
- **strobe**, **cycle**, **unstable**, **advanced**.
- **Fett263 OS7 base styles** (firmware): **`water_flow`**, **`darksaber`**, **`static_electricity`**, **`power_wave`**, **`unstable_blades`**, **`fallen_order`** — each takes **`base clash extend retract`** (e.g. `fallen_order cyan white 300 800`). Distinct from built-in **`unstable`**.
- **GPIO accents** (simple PWM blades): **`accent_glow`**, **`accent_blast`**, **`accent_clash`**, **`accent_preon`**, **`accent_postoff`**, **`accent_sequence`**, etc. — see **`examples/README.md`**.

Run `list_named_styles` over serial to see available styles and their arguments.

### Config-driven layered styles (`config/blade_styles.ini`)

You can build effects from **layers** in **`config/blade_styles.ini`** and reference them with **`style = config <section_name>`** (optional **`key=value`** tokens for **`{{name}}`** substitution, e.g. `style = config fallen_order_blade base=cyan`). Use composable **`solid`** / **`solid_bend`** bases plus overlay **`clash`** / **`blast`** / **`responsive_clash`** / **`responsive_blast`** / **`real_clash`** / **`blast_wave_random`** layers, or monolithic bases like **`standard`**. Composable texture layers (**`gradient_layer`**, **`rainbow_layer`**, **`audio_layer`**, **`pulse_layer`**, OS7 **`*_layer`**, **`pixel_sequence`**, **`sparktip_layer`**, …) and masks **`fire_mask`**, **`stripes`**, **`noise_flicker`**, **`unstable_stripes`**, etc. stack with **multiply** / **screen** / **add** / **normal** over an opaque base. Extend/retract can use **`-1`** to match ignition/retraction soundfont length. See **blade_styles_config.md**, **README_blade_styles_config.md**, and **examples/README.md**. Capstone demo: **`style = config composable_checklist`**. Shipped recipes include **`[smoke_blade]`**, **`[composable_rainbow]`**, **`[solid_lava]`**, **`[solid_unstable]`**, **`[solid_chase]`**, Fett263 bases **`[water_blade]`**, **`[fallen_order_blade]`**, and others in **`examples/config/blade_styles.ini`**.

## Behavior

- If **`config/presets.ini`** exists and parses correctly at boot, the firmware uses it as the preset list (up to 64 presets) and **SD config is active**.
- If the file is missing or invalid, the firmware uses the **compiled** presets from your config file as before.
- Blade selection (resistor ID) and hardware still come from the compiled config; only the preset list is overridden from SD.

## Memory use (config/presets.ini)

**config/presets.ini** is the only config that keeps a large amount of data in RAM:

- Each preset’s **font**, **track**, **name**, and each **style=** line are stored on the **heap** (up to 512 characters per value).
- With **64 presets** and e.g. **3 blades**, worst case is 64 × (font + track + name + 3× style) ≈ 64 × 6 × 512 bytes ≈ **192 KB** of heap just for preset strings. On boards with limited RAM (e.g. 256 KB), that can cause instability or failures if you use many long preset names and style strings.

**Recommendations:**

- Use a **smaller preset list** (e.g. 16–32 presets) if you see freezes or odd behavior after loading.
- Keep **font**, **track**, and **name** short where possible; long **style=** lines are the main cost per blade.
- The limits **SD_MAX_PRESETS** (64) and **READ_STRING_MAX_LEN** (512 in `file_reader.h`) can be reduced in the source if you need to fit tighter memory.

The other config files use very little RAM: **board.ini** / **features.ini** only a small struct; **blades.ini** a fixed array (~512 B); **blade_styles.ini** is **not** loaded entirely—only the section for the current style is read into a 4 KB buffer when needed, then discarded.

## Example `config/presets.ini`

```
new_preset
font=Kyber
track=tracks/hum.wav
style=config smoke_laser
name=Smoke Laser
variation=0
new_preset
font=Kyber
track=tracks/hum.wav
style=standard red white 300 800
name=Red
variation=0
new_preset
font=Kyber
track=tracks/hum.wav
style=fire red yellow
name=Fire
variation=0
end
```

Preset 0 applies **`[smoke_laser]`** from **`config/blade_styles.ini`** — copy both INI files to the SD **`config/`** folder. Built-in styles (`standard`, `fire`, …) need only **`presets.ini`**.
