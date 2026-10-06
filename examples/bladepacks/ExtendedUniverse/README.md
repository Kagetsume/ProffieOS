# Extended Universe blade pack

SD configuration for **Legends / exotic / deep-lore game** main blades: **DarkSaber**, composable **crackle**, and Fett263 **OS7 `*_layer`** recipes (Fallen Order, Unstable Blades, Power Wave, Static Electricity, Water Flow). Sequel **Kylo** unstable lives in the **FirstOrder** pack.

## Install on SD card

Copy this pack’s contents to the **root** of your SD card:

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/<PresetName>/` (optional) | `font/<PresetName>/` |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**, and a full style parser build with OS7 **`*_layer`** names used in this ini (`darksaber_layer`, `drifting_bands_with_pulse_layer`, `unstable_stripes`, `power_wave_layer`, `static_electricity_layer`, `water_flow_layer`, plus composable texture layers for **`eu_crackle`**).

## Wiring

Same as OST: see `config/blades.ini` (data pin 1, power pins 1–3, 144 pixels default).

## Presets

| Name | Style section | Notes |
|------|---------------|--------|
| DarkSaber | `eu_darksaber` | Silver default; `base=steelblue` |
| EUCrackle | `eu_crackle` | Generic EU crackle; `base=purple` / `red` |
| CalKestis | `eu_fallen_order` | Fallen Order stripes; default **cyan** |
| NomiSunrider | `eu_nomi_sunrider` | Teal **aquamarine** + drifting pulsing bands (Legends) |
| MaraJade | `eu_mara_jade` | **vividviolet** + ShimmerBlade swing shimmer (Legends) |
| UnstableBlades | `eu_unstable_blades` | OS7 stripe unstable (≠ Kylo `unstable`) |
| PowerWave | `eu_power_wave` | Wide slow silver bands |
| StaticCharge | `eu_static_electricity` | Swing charge / clash reset |
| WaterBlade | `eu_water_flow` | Angle-reactive flow |

`ext` / `ret` are **`-1`** so in/out track soundfont length.

## Styles

All OS7 sections follow the same composable pattern: **`solid_bend`** + **`*_layer`** (or **`unstable_stripes`**) + **real_clash** / **blast_wave_random** / **responsive_lockup** / **drag** / **melt** / **lb**.

- **`eu_crackle`** — no OS7 monolith; per-LED + noise flicker only.

More OS7 textures (shimmer, rotoscope, kinetic charge, …) live in the main **`examples/config/blade_styles.ini`** `[composable_*]` catalog — copy sections into this pack as needed.

## Font layout

Optional **`font_overlay = font/DarkSaber`** (and `font/EUCrackle`) override WAVs from the primary **`font=`** directory. See `font/README.md`.
