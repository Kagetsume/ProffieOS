# Original Trilogy (OST) blade pack

Example SD configuration for classic OT-style lightsabers: solid beam with bend in/out, subtle idle flicker, and responsive clash / blast / lockup / swing overlays.

## Install on SD card

Copy contents of this folder to the **root** of your SD card:

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/<PresetName>/` | `font/<PresetName>/` |

Install the shared soundfont as an SD root folder matching **`font=`** (default **`SmthJedi/`** — same level as `config/`, `font/`, `common/`). Also add `common/` for voice prompts and optional `tracks/` (see **Font layout**).

Firmware must define **`NUM_BLADES` 1** and enable **`ENABLE_SD_CONFIG_FILES`** (see `config/config-files-config.h` for the SD examples profile).

## Wiring (`config/blades.ini`)

- NeoPixel **data pin 1**
- **Power FETs** on pins **1**, **2**, and **3**
- Default **144** pixels — change `pixels=` to match your strip

## Presets

| Name | Base color | `font_overlay=` |
|------|------------|-----------------|
| LukeANH | blue | `font/LukeANH` |
| ObiWan | blue | `font/ObiWan` |
| Vader | red | `font/Vader` |
| LukeROTJ | green | `font/LukeROTJ` |
| Windu | purple | `font/Windu` |
| TempleGuard | yellow | `font/TempleGuard` |

Extend and retract use **`-1`** so ignition and retraction follow the in/out sound lengths.

## Font layout

Each preset sets **`font_overlay = font/<PresetName>`**. Overlay directories are searched **before** the primary **`font=`** path, so you can drop per-character WAV overrides (for example `in.wav`, `out.wav`, `clash/*.wav`) without duplicating the full hum/swing library.

**`font=`** is the **directory name on the SD card**, not a `Fonts/` prefix. This pack uses **`font = SmthJedi`**, which resolves to **`/SmthJedi/`** at the card root (hum, swing, clash, and so on live in that folder). Change the name in `config/presets.ini` if your base pack folder is different.

Empty overlay folders in this repo are placeholders; add WAVs as needed.

## Style

All presets use **`style = config ost_classic base=<color>`** from `config/blade_styles.ini`:

1. **`solid_bend`** base (sound-length in/out when `ext`/`ret` are `-1`)
2. **`base_flicker`** at **`multiply opacity 100%`** (uniform brightness pulse; optional **`noise_flicker`** if you want spatial crackle too)
3. **`responsive_clash`**, **`responsive_blast`**, **`responsive_lockup`**, **`drag`**, **`melt`**, **`lb`**, **`swing`**

Override timing or colors from a preset, e.g. `style = config ost_classic base=green clash=cyan`.

## One style, many presets (variables)

Every OT character preset points at the **same** `[ost_classic]` section. The blade recipe does not change—only **`base=`** (and optional **`clash=`**, **`lockup=`**, …) on the preset line. Section vars at the top of `[ost_classic]` (`base = blue`, `ext = -1`, …) are defaults; **`style = config ost_classic base=green`** overrides **`{{base}}`** on every layer that references it.

Compare **[OST-Pulsing](../OST-Pulsing/)**: identical combat stack, one different idle layer (`pulse_layer` instead of `base_flicker`). That is the intended teaching path—**fork the section** or **swap one layer line**, not duplicate whole styles per character.
