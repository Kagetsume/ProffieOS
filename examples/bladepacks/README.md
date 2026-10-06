# Blade packs (SD examples)

These folders are **copy-to-SD recipe packs**: small `config/blade_styles.ini` + `presets.ini` (+ optional `font/` overlays). They are meant to **inspire**, not to be the only “correct” way to build a saber.

**Design goal:** give people **lots** of worked examples—some **canon-leaning** (recognizable character vibes), some **far afield** (textures, BMP flipbooks, procedural masks, OS7 Fett263 idles). Every preset should be easy to **fork**: change `base=`, swap one layer line, or paste a section into your own ini.

## How to use a pack

1. Copy the pack’s **`config/`** to the SD card **`config/`** (merge or replace `presets.ini` / `blade_styles.ini` deliberately—you usually keep one pack’s presets unless you merge by hand).
2. Match **`config/blades.ini`** to your **`NUM_BLADES`** and wiring. Pack defaults use **board pin names** — **`bladePin`**, **`bladePowerPin1`–`3`** — not numeric GPIO (numbers in ini are literal pin indices, not “FET 1/2/3”).
3. Point a preset at a section: **`style = config <section_name>`** with optional **`key=value`** overrides.
4. Read the section in **`blade_styles.ini`**—that file is the real tutorial.

The **full layer laboratory** remains **`examples/config/blade_styles.ini`** (2600+ lines, `[composable_*]`, BMP demos, accents). Packs are **curated slices** of that space.

## Pack spectrum (canon → experimental)

| Pack | Intent | Typical stack |
|------|--------|----------------|
| **[OST](OST/)** | Original Trilogy–style **solid beam** + subtle flicker + responsive combat | `solid_bend`, `base_flicker`, `responsive_*` |
| **[OST-Pulsing](OST-Pulsing/)** | Same OT combat path, **smooth pulse** instead of crackle flicker | `pulse_layer` |

### OST\* — one recipe, many characters (variables)

**[OST](OST/)** and **[OST-Pulsing](OST-Pulsing/)** are deliberately parallel:

- **Same skeleton:** `solid_bend` → idle texture layer → same **`responsive_*` / drag / melt / lb** (and swing on OST).
- **One section per pack** (`[ost_classic]` vs `[ost_pulsing]`): the *structure* is fixed; **character = preset overrides**.
- Six presets differ almost only by **`style = config … base=<color>`** (and `font_overlay=`). That shows **`{{base}}`** / **`base=`** in action without six different ini sections.
- **OST vs OST-Pulsing** swaps a **single idle layer line** (flicker vs pulse)—combat unchanged. Forkers learn: change one layer, keep the rest.

Extended Universe uses the same idea with more idle variants (`eu_fallen_order`, `eu_darksaber`, …) but the same combat block and **`ext = -1` / `ret = -1`** vars everywhere.
| **[FirstOrder](FirstOrder/)** | Sequel **canon** (e.g. Kylo crackle) | `unstable_layer` + composable overlays |
| **[ExtendedUniverse](ExtendedUniverse/)** | **Exotic / game / deep-lore** idles (DarkSaber, Fallen Order, OS7 `*_layer`, composable crackle) | `solid_bend` + `*_layer` + Real Clash stack |

Nothing stops you from mixing: e.g. **`ost_classic`** combat with **`eu_darksaber`** idle, or a **`strip_column`** BMP base from the main config catalog under any pack’s preset.

## Build your own combined pack

Packs stay **small on purpose** so you can lift pieces without reading thousands of lines.

1. **Start a personal ini** on SD, e.g. `config/blade_styles.ini`, with a short header comment (your saber name, pixel count, `-1` ext/ret if you use sound-length in/out).
2. **Copy whole sections** from any pack or from `examples/config/blade_styles.ini`: from `[section_name]` through the last `layer =` line (blank line before the next `[...]`).
3. **Rename sections** if you merge two packs that both define `[ost_classic]`—pick unique names (`[my_luke]`, `[my_darksaber]`) and point presets at them: `style = config my_luke base=green`.
4. **Merge `presets.ini`**: copy `new_preset` … blocks; each preset only needs one main-blade `style = config …` (plus optional accent lines). Keep **`name =`** unique on the saber.
5. **One `blades.ini`** for your hardware; packs share the same default wiring—you edit it once.
6. **Mix layers across sections**: duplicate a section, delete or swap one `layer =` line (e.g. OST responsive combat under EU `darksaber_layer`), or change vars (`base=`, `pulse_ms=`) without touching firmware.

You do **not** need every preset from every pack—keep five favorites and grow the ini as you experiment. The monolithic main example config is the reference when you want one more technique; packs are the **starter slices** you paste from.

## Go weird: stack order matters

Layers composite **bottom → top**. Layer **0** drives in/out (`strip_column`, `solid_bend`, …). Example “crazy nuts” recipe:

1. **`strip_column`** — animated BMP is the whole look (motion lives in the file).
2. **`multiply`** crackle — `per_led_flicker` + `noise_flicker` grit over the art (see EU **`eu_crackle`** layers).
3. **`normal opacity 25% rainbow_layer`** — animated rainbow **tint** on top (not full `[composable_rainbow]` on solid—here the base is already the BMP).
4. Combat overlays last — `real_clash`, `blast_wave_random`, etc.

Shipped copy-paste section: **`[wild_bmp_crackle_rainbow]`** in **`examples/config/blade_styles.ini`**. Try `style = config wild_bmp_crackle_rainbow` after copying the sample BMP from **`examples/sd/animations/`** to SD. Tune `rainbow_mix = 8192` (~25%) or `opacity 15%` on the rainbow line.

Same idea without BMP: `solid_bend` + OS7 `*_layer` + crackle multiply + rainbow tint—packs are starting points, not limits.

## Ideas for future packs (not shipped yet)

- **BMP gallery** — `strip_column` bases + one combat stack; swap only the `.bmp` path.
- **Procedural playground** — sine/saw/noise/moire multiply masks over `solid_bend` (see main `[demo_*]` sections).
- **Accent-forward** — preon/postoff/ignition_flash recipes with minimal main blade.
- **Wild / non-canon** — see **`[wild_bmp_crackle_rainbow]`**, `chaos_inferno`, multi-mask stacks; label clearly as experimental.

When adding a pack, keep **sections short**, **comment the “why”**, and prefer **layer-first** recipes so flash stays in firmware once, creativity stays on SD.

## Firmware

Packs assume a **full** style parser build (`ENABLE_SD_CONFIG_FILES`, OS7 `*_layer` names where used). SD ini does not reduce flash; it changes what you can edit without recompiling.

## Share your own pack (community distribution)

A hope for this layout: people **author and ship packs** the way the community shares **Fett263 OS7 blade styles**—but **composable config** stays on the SD card: **no C++**, no reflash to try a look, only an editor and optional BMPs/WAVs.

**What to ship** (zip or git folder):

| Include | Purpose |
|---------|---------|
| `config/blade_styles.ini` | Your `[sections]` — the product |
| `config/presets.ini` | Optional ready-made presets |
| `config/blades.ini` | **`bladePin`** + **`bladePowerPin1`–`3`**; edit `pixels=` for your strip (keep pin **names**, not numeric GPIO) |
| `README.md` | Install path, firmware needs (`*_layer` names, BMP), credits |
| `font/` overlays | Optional per-character WAV overrides |
| `animations/` or doc paths | BMP flipbooks if your pack uses `strip_column` |

**Authoring tips**

- **One pack = one theme** (canon clan, game, artist series, “weird experiments”) so README stays short.
- **Comment each section**: what it mimics, which vars matter (`base=`, `rainbow_mix=`, BMP path).
- **Prefer layer-first** recipes so users on the same firmware build can mix your sections into their ini.
- **State dependencies** in README: “needs `darksaber_layer`”, “needs `strip_column`”, “works on any build with full parser”.
- **Test on saber hardware** (SD load, missing-BMP fallback, `-1` ext/ret with your soundfont).

**vs Fett263-style blades:** his OS7 styles are **compiled** named strings (`fallen_order blue white 300 800`)—powerful, fixed at flash time. **Composable packs** are **`style = config your_section`**—same expressive stack (often `solid_bend` + `*_layer` + overlays), editable layers, shareable as **text + assets**. Authors trade a little copy-paste for **user-friendly iteration**.

**Distribution:** repo subfolder under `examples/bladepacks/YourPack/`, personal GitHub, forum post, or Discord—same layout as OST / Extended Universe so adopters know where to copy files on the SD card.

If you contribute a pack upstream, keep **preset names** and **section names** unique, avoid huge single ini files unless labeled “kitchen sink”, and link to the main **`examples/config/blade_styles.ini`** for techniques you don’t duplicate.
