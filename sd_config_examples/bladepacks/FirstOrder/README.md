# First Order blade pack

SD configuration for **sequel-era** blades: **Kylo Ren**’s unstable crackling main blade and **Rey**’s yellow saber.

## Install on SD card

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/KyloRen/` (optional) | `font/KyloRen/` |
| `font/Rey/` (optional) | `font/Rey/` |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**, full named-style catalog (includes built-in **`unstable`** and **`shimmer_blade_layer`**).

## Presets

| Name | Style | Notes |
|------|--------|--------|
| KyloRen | `fo_kylo_unstable` | Red / orange / yellow sparks; `-1` extend/retract |
| Rey | `fo_rey_yellow` | Rise of Skywalker gold-yellow (`255,190,0`) with swing shimmer |

## Style notes

**`fo_kylo_unstable`** composes monolith **`unstable`**: **`unstable_layer`**, **`on_spark_layer`**, **`unstable_lockup_layer`**, **`localized_clash`**, **`blast`**, drag/melt/lb. The spark on the moving edge is `transition = spark … bend`. Fett263 **UnstableBlades** uses **`unstable_stripes`** / **`unstable_blades`** (EU pack).

**`fo_rey_yellow`** is a stable plasma blade: **`solid`** `255,190,0` plus **`shimmer_blade_layer`**, then the usual clash, blast, lockup, drag, melt, and lockup-begin layers. Plain `yellow` (`255,255,0`) pushes the green LED as hard as red and reads lime on many strips. The OST pack’s Temple Guard uses that plain `yellow`.

Crossguard **quillons** need a second LED strip or accent config; this pack targets the **main** blade only.

## Wiring

See `config/blades.ini` — **`bladePin`**, **`bladePowerPin1`–`3`**, 132 pixels (same as OST / Extended Universe).

## Fonts

Optional **`font_overlay = font/KyloRen`** — see `font/README.md`.
