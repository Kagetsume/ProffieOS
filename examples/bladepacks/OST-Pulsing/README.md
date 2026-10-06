# Original Trilogy — pulsing idle (OST-Pulsing)

Same character presets and wiring as the **OST** pack, but idle brightness uses a **smooth whole-blade pulse** (`pulse_layer`) instead of **`base_flicker`** / **`noise_flicker`**.

**Teaching point (with OST):** one **fundamental** OT stack—`solid_bend` + idle modifier + responsive combat. Presets only vary **`base=`**; the pulsing pack varies **one layer line** in the section, not six separate styles. See **[bladepacks README](../README.md)** (OST\* variables).

## Install on SD card

Copy this folder’s **`config/`** (and **`font/`** overlays if you use them) to the SD card root — same layout as the OST pack README.

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**.

## Style

Presets use **`style = config ost_pulsing base=<color>`** from `config/blade_styles.ini`:

1. **`solid_bend`** base (`ext`/`ret` **`-1`** = sound-length in/out)
2. **`pulse_layer`** at **`multiply opacity 100%`** — sine breathe lighter/darker on the full blade (`pulse_ms` **2000**, `pulse_delta` **20** ≈ ±20% brightness; full cycle ≈ **`pulse_ms`** ms). Use **`multiply opacity 100%`** — do not lower layer opacity. Needs firmware with optional **`pulse_layer ms delta`** (second arg); otherwise only **`pulse_layer ms`** (~10% swing).
3. **`responsive_clash`**, **`responsive_blast`**, **`responsive_lockup`**, **`drag`**, **`melt`**, **`lb`**, **`swing`**

Tune idle: `style = config ost_pulsing base=green pulse_ms=4000` (slower) or `pulse_ms=2400` (faster).

## Presets, fonts, wiring

Same table as the OST pack: LukeANH, ObiWan, Vader, LukeROTJ, Windu, TempleGuard; **`font = SmthJedi`**; **`font_overlay = font/<PresetName>`**; blade **data pin 1**, power **1–3**, **144** pixels default (`config/blades.ini`).
