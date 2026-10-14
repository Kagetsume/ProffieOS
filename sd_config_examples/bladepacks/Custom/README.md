# Custom blade pack

Non-canon recipes that the character packs do not cover. Each preset isolates one behavior: a worn aquamarine crystal, a flame wipe, ignition from the tip, a burst from the middle, a hum-driven blade, and a two-color gradient.

## Install on SD card

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/<PresetName>/` (optional) | `font/<PresetName>/` |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**.

The sputter layers follow sound files in the font. **`preon_sputter`** tracks the preon sound. **`postoff_sputter`** tracks the pstoff sound (`pstoff/` in the font). A font with no preon or pstoff file shows no sputter.

## Wiring

See `config/blades.ini` (`bladePin`, `bladePowerPin1`–`3`, 132 pixels default).

## Presets

| Name | Style section | Notes |
|------|---------------|--------|
| WornAquamarine | `custom_worn_aquamarine` | Aquamarine beam, idle flicker, unstable tip, lockup heat, clash scar, preon and postoff sputter |
| FlameWipe | `custom_flame_wipe` | Dark-orange beam. `transition = flame` with yellow streaks |
| TipIgnite | `custom_tip_ignite` | Deep-sky blue. `transition = bend … tip` extends from the tip |
| CenterBurst | `custom_center_burst` | Violent violet. `transition = explode` with a white spark on both edges |
| HumGlow | `custom_hum_glow` | Amber. `audio_layer` multiplies brightness by the hum |
| CrystalGradient | `custom_crystal_gradient` | Green at the hilt, deep-sky blue at the tip |

`ext` / `ret` are **`-1`** so the main in/out track soundfont length. The sputter layers do not take those times.

## Style

**`custom_worn_aquamarine`** is **`solid`** aquamarine, then **`per_led_flicker`** and **`noise_flicker`**. **`unstable_tip`** creeps the lit end and tints it white. **`lockup_heat`** shifts the hue toward orange while a lockup is held, up to 60 degrees over 1.2 seconds, then cools back. **`clash_scar`** leaves a white patch where the clash hit and fades it over a second. Then the usual clash, blast, lockup, drag, and melt layers. **`preon_sputter`** and **`postoff_sputter`** are drawn after the wipe. Loud audio pushes the sputter farther from the hilt. Quiet audio pulls it back.

Override the cough color with `style = config custom_worn_aquamarine sputter=white`.

**`custom_flame_wipe`** keeps a dark-orange beam. The wipe is `flame`: tongues ahead of the edge on the way out, streaks that peel toward the tip on the way back. The yellow word tints those streaks.

**`custom_tip_ignite`** uses `bend` with the word `tip`. The blade extends from the tip down to the hilt, then retracts back to the tip.

**`custom_center_burst`** uses `explode`. The lit band grows from the middle to both ends, then both edges draw back to the middle. `spark white` marks those edges.

**`custom_hum_glow`** multiplies an amber beam by `audio_layer`. Quiet hum dims the blade. Loud hum brings it back to full.

**`custom_crystal_gradient`** paints `gradient_layer` from green at the hilt to deep-sky blue at the tip. The bend wipe is still the section `transition` line.
