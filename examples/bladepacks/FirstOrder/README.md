# First Order blade pack

SD configuration for **sequel-era** blades. Ships with **Kylo Ren**’s unstable crackling main blade.

## Install on SD card

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/KyloRen/` (optional) | `font/KyloRen/` |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**, full named-style catalog (includes built-in **`unstable`**).

## Presets

| Name | Style | Notes |
|------|--------|--------|
| KyloRen | `fo_kylo_unstable` | Red / orange / yellow sparks; `-1` extend/retract |

## Style notes

**`fo_kylo_unstable`** composes monolith **`unstable`**: **`unstable_layer`**, **`on_spark_layer`**, **`unstable_lockup_layer`**, **`localized_clash`**, **`blast`**, **`sparktip_layer`**, drag/melt/lb. Fett263 **UnstableBlades** uses **`unstable_stripes`** / **`unstable_blades`** (EU pack).

Crossguard **quillons** need a second LED strip or accent config; this pack targets the **main** blade only.

## Wiring

See `config/blades.ini` — **`bladePin`**, **`bladePowerPin1`–`3`**, 144 pixels (same as OST / Extended Universe).

## Fonts

Optional **`font_overlay = font/KyloRen`** — see `font/README.md`.
