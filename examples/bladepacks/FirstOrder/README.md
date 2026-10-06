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

**`fo_kylo_unstable`** uses the classic **`unstable`** named style as layer 0 (built-in clash/lockup/blast), plus **drag / melt / lb** overlays for lockup events. This is intentionally **not** the Fett263 **`unstable_blades`** OS7 stripe style (see Extended Universe **`eu_crackle`** or main config **`composable_unstable_blades`**).

Crossguard **quillons** need a second LED strip or accent config; this pack targets the **main** blade only.

## Wiring

See `config/blades.ini` (same defaults as OST / Extended Universe).

## Fonts

Optional **`font_overlay = font/KyloRen`** — see `font/README.md`.
