# BMP blade pack

Eight presets: **`strip_column`** flipbooks (three BMPs ship; three you add), **`solid_bend` + mask**, and **Crazy Blade** (plasma BMP + multi-`sine_waves` + 50% `rainbow_layer` + `random_bands`). Shared combat stack on each.

## Install on SD card

| Pack path | SD card path |
|-----------|----------------|
| `config/` | `config/` |
| `animations/*.bmp` | `animations/` |
| `font/<PresetName>/` | `font/<PresetName>/` (optional **`name.wav`**, in/out, clash overrides) |

Firmware: **`NUM_BLADES` 1**, **`ENABLE_SD_CONFIG_FILES`**, **`strip_column`** and **`strip_column_mask`** in your build.

## Presets

| Name | Section | BMP (SD path) | Status |
|------|---------|---------------|--------|
| CyanGoldPlasma | `bmp_gallery_cyan_gold` | `animations/cyan-gold-plasma.bmp` | **Included** |
| CyanPlasma | `bmp_gallery_cyan_plasma` | `animations/cyan-plasma.bmp` | **Included** (+ sine multiply) |
| TigerSwirl | `bmp_gallery_tiger` | `animations/tiger-swirl-darkorange.bmp` | **Included** |
| FireColumn | `bmp_gallery_fire` | `animations/fire-column-loop.bmp` | **You provide** |
| LightningColumn | `bmp_gallery_lightning` | `animations/lightning-column.bmp` | **You provide** |
| NebulaDrift | `bmp_gallery_nebula` | `animations/nebula-drift.bmp` | **You provide** |
| CyanMaskOverlay | `bmp_gallery_cyan_mask` | `solid_bend` **cyan** + mask BMP (see section) | **Included** |
| CrazyBlade | `bmp_gallery_crazy_blade` | `cyan-plasma.bmp` + procedural overlays | **Included** |

Missing **`strip_column`** / mask BMPs show the **red/orange danger scroll** fallback until the file is on the card.

### Crazy Blade (`bmp_gallery_crazy_blade`)

Layer stack: **`strip_column`** `cyan-plasma.bmp` → **four-slot `sine_waves`** multiply → **`rainbow_layer`** at **`rainbow_mix = 50%`** → **`random_bands`** rolling multiply → combat. Tune: `style = config bmp_gallery_crazy_blade rainbow_mix=35%`.

### Solid base + opacity map (`bmp_gallery_cyan_mask`)

- **Layer 0:** `solid_bend {{base}}` — flat beam color, sound-length in/out.
- **Layer 1:** `multiply opacity … strip_column_mask` — BMP drives **brightness** (white = full base, black = dark). RGB in the file is converted to grayscale; paint **R=G=B** for precise control.
- **Shipped demo:** `base=cyan` + **`animations/plasma-opacity-mask.bmp`** (high-contrast grayscale mask). You can swap in **`cyan-plasma.bmp`** (luminance from color); use **true black** in mask art or the beam stays mostly flat.
- **Override:** `style = config bmp_gallery_cyan_mask base=deepskyblue mask_opacity=65%`
- **Optional dedicated mask:** `animations/plasma-opacity-mask.bmp` — **144 × 120**, **grayscale only**, high contrast plasma wisps on black (see below).

## BMP file format (all six)

- **24-bit uncompressed Windows BMP** (BI_RGB, no RLE). ProffieOS rejects 8-bit palette BMPs.
- **GIMP trap:** *Image → Mode → Grayscale* or *Indexed* exports often become **8-bit BMP** (GIMP stores one byte per pixel + palette). Before export: **Image → Mode → RGB** (paint **R=G=B** for masks), then *File → Export As…* → `.bmp`. In the export dialog, pick **24 bit** / **RGB** if shown; leave compression off. Quick check on PC: open the file in a hex viewer or run `python -c "f=open('x.bmp','rb');f.seek(28);print(int.from_bytes(f.read(2),'little'),'bpp')"` — must print **`24 bpp`**.
- **Photoshop:** *Save As* → BMP → **24 Bit**, uncompressed Windows BMP.
- **Layout `frames_y` (default):** image **width** = blade pixel count (**144** in this pack), **height** = number of animation frames (one horizontal row per frame).
- **Row 0 = hilt**, increasing row index toward **tip** along the column sampled per LED.
- **`source_height`** in ini = width (144). **`fps`** = playback rate (30, or **15** for nebula).

## BMPs to generate (three placeholders)

### 1. `fire-column-loop.bmp` — FireColumn

- **Size:** **144 × 72** px (width × height) or **144 × 90** for a longer loop.
- **Look:** Flames **travel toward the tip** each frame (loop seamlessly if you can). Dark/red core near hilt, orange/yellow mid, bright tips. High saturation reads well on NeoPixels.
- **Motion:** ~2–3 s loop at **30 fps** → 60–90 frames.

### 2. `lightning-column.bmp` — LightningColumn

- **Size:** **144 × 48** to **144 × 60**.
- **Look:** **Dark blue–black** background; **white / cyan** bolt paths along the blade length. Frames should **jump or crawl** so motion feels electric, not smooth lava.
- **Contrast:** Strong bright-on-dark (strip_column gamma helps; avoid mid-gray mush).

### 3. `nebula-drift.bmp` — NebulaDrift

- **Size:** **144 × 36** to **144 × 48** (slower preset uses **15 fps**).
- **Look:** Soft **purple, blue, magenta** gas clouds **drifting** along the blade—lower contrast than plasma/fire, more “space fog.”
- **Motion:** Gentle; fewer frames OK because playback is slower.

Drop finished files in this pack’s `animations/` folder (and on SD under `animations/`) using the **exact filenames** above.

### 4. `plasma-opacity-mask.bmp` — mask for `bmp_gallery_cyan_mask` (included)

- **Size:** **144 × 120** (or match your flipbook length).
- **Format:** **24-bit** uncompressed BMP (same as other pack assets). **8-bit indexed BMPs are rejected** — the mask layer stays transparent and you only see flat `solid_bend`.
- **Look:** **Grayscale only** — white filaments on **RGB 0,0,0** background. Gray “almost black” (~95) does **not** darken enough on a cyan base; paint real black.
- **Use:** `strip_column_mask animations/plasma-opacity-mask.bmp 144 30` (already in `[bmp_gallery_cyan_mask]`).

## Wiring

`config/blades.ini`: **`bladePin`**, **`bladePowerPin1`–`3`**, **144** pixels default (see `doc/pin_reference.md`).

## Forking

Copy one `[bmp_gallery_*]` section into your own ini, change the path or add multiply layers (`strip_column_mask`, crackle, `rainbow_layer`). See **[bladepacks README](../README.md)**.
