# Extended Universe blade pack

SD configuration for **Legends / exotic / deep-lore game** main blades: **DarkSaber**, composable **crackle**, and Fett263 **OS7 `*_layer`** recipes (Fallen Order, Unstable Blades, Power Wave, Static Electricity, Water Flow). Sequel **Kylo** unstable lives in the **FirstOrder** pack.

## Install on SD card

Copy this pack’s contents to the **root** of your SD card:

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `font/<PresetName>/` (optional) | `font/<PresetName>/` |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**, and a full style parser build with OS7 **`*_layer`** names used in this ini (`darksaber_layer`, `drifting_bands_with_pulse_layer`, `shimmer_blade_layer`, `unstable_stripes`, `power_wave_layer`, `static_electricity_layer`, `water_flow_layer`, plus **`pulse_layer`**, **`fire_mask`**, **`responsive_flame_layer`**, and composable texture layers for **`eu_crackle`**).

## Wiring

Same as OST: see `config/blades.ini` (`bladePin`, `bladePowerPin1`–`3`, 144 pixels default).

## Presets

| Name | Style section | Notes |
|------|---------------|--------|
| DarkSaber | `eu_darksaber` | Silver default; `base=steelblue` |
| EUCrackle | `eu_crackle` | Generic EU crackle; `base=purple` / `red` |
| Starkiller | `eu_starkiller` | Force Unleashed: dodger blue with white lightning crackle |
| CalKestis | `eu_fallen_order` | Fallen Order stripes; default **cyan** |
| AhsokaPadawan | `eu_ahsoka_padawan` | Clone Wars green padawan saber; swing shimmer |
| AhsokaWhite | `eu_ahsoka_white` | Later white blades; brightness pulse of +/- 40% over 2.4 s |
| MorganElsbeth | `eu_blade_of_talzin` | Blade of Talzin: green Nightsister fire over a black core |
| BaylanSkoll | `eu_baylan_skoll` | Weathered **darkorange** saber from *Ahsoka* |
| NomiSunrider | `eu_nomi_sunrider` | Teal **aquamarine** + drifting pulsing bands (Legends) |
| MaraJade | `eu_mara_jade` | **vividviolet** + ShimmerBlade swing shimmer (Legends) |
| RevanPurple | `eu_revan_purple` | KOTOR purple saber; **violentviolet** so it stays blue-violet |
| RevanRed | `eu_revan_red` | Darth Revan's red saber |
| UnstableBlades | `eu_unstable_blades` | OS7 stripe unstable (≠ Kylo `unstable`) |
| PowerWave | `eu_power_wave` | Wide slow green bands, Death Star beam |
| StaticCharge | `eu_static_electricity` | Swing charge / clash reset |
| WaterBlade | `eu_water_flow` | Angle-reactive flow |

`ext` / `ret` are **`-1`** so in/out track soundfont length.

## Styles

All OS7 sections follow the same composable pattern: **`solid`** + **`*_layer`** (or **`unstable_stripes`**) + **real_clash** / **blast_wave_random** / **responsive_lockup** / **drag** / **melt** / **lb**.

- **`eu_crackle`** — no OS7 monolith; per-LED + noise flicker only.
- **`eu_starkiller`** — dodger-blue core. White lightning is screened over it, so the flashes add light instead of only darkening the blade.
- **`eu_baylan_skoll`** — `darkorange` (255, 68, 0) with a light swing shimmer. Brighter `orange` (255, 128, 0) is the clean Jedi read.
- **`eu_ahsoka_padawan`** — green, with swing shimmer.
- **`eu_ahsoka_white`** — white, with `pulse_layer 2400 40` so the blade dips and rises enough to see.
- **`eu_blade_of_talzin`** — Morgan Elsbeth's green fire sword. `fire_mask` and `responsive_flame_layer` are screened over black.
- **`eu_revan_purple`** — Revan's purple saber. `violentviolet` (55, 0, 255) keeps the red channel low so the blade stays purple.
- **`eu_revan_red`** — Darth Revan's red saber. Same swing shimmer as the purple.

More OS7 textures (shimmer, rotoscope, kinetic charge, …) live in the main **`sd_config_examples/config/blade_styles.ini`** `[composable_*]` catalog — copy sections into this pack as needed.

## Font layout

Optional **`font_overlay = font/DarkSaber`** (and `font/EUCrackle`) override WAVs from the primary **`font=`** directory. See `font/README.md`.
