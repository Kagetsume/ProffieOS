# BMP blade pack

Twelve presets. Shared combat stack on each. Full-color **`strip_column`** flipbooks, **Crazy Blade**, a recolorable crack mask, a BMP that is only the wipe, a comet screened over a dim solid, and one fire column played at two speeds.

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
| FireColumn | `bmp_gallery_fire` | `animations/fire-column.bmp` | **Included** |
| LightningColumn | `bmp_gallery_lightning` | `animations/lightning-column.bmp` plus strike / drain wipes | **Included** |
| NebulaDrift | `bmp_gallery_nebula` | `animations/nebula-drift.bmp` | **Included** |
| CyanMaskOverlay | `bmp_gallery_cyan_mask` | `solid` **cyan** + mask BMP (see section) | **Included** |
| CrazyBlade | `bmp_gallery_crazy_blade` | `cyan-plasma.bmp` + procedural overlays | **Included** |
| EmberMask | `bmp_gallery_ember_mask` | `animations/ember-cracks.bmp` over `solid` | **Included** |
| InkBleed | `bmp_gallery_ink_bleed` | `animations/ink-bleed.bmp` is the wipe only | **Included** |
| CometRun | `bmp_gallery_comet` | `animations/comet-run.bmp` screened on `steelblue` | **Included** |
| GhostTrail | `bmp_gallery_ghost_trail` | `fire-column.bmp` at 30 fps and again at 8 fps | **Included** |

Missing **`strip_column`** / mask BMPs show the **red/orange danger scroll** fallback until the file is on the card.

### Crazy Blade (`bmp_gallery_crazy_blade`)

Layer stack: **`strip_column`** `cyan-plasma.bmp` → **four-slot `sine_waves`** multiply → **`rainbow_layer`** at **`rainbow_mix = 50%`** → **`random_bands`** rolling multiply → combat. Tune: `style = config bmp_gallery_crazy_blade rainbow_mix=35%`.

### Solid base + opacity map (`bmp_gallery_cyan_mask`)

- **Layer 0:** `solid {{base}}` — flat beam color. The section `transition` line is the wipe.
- **Layer 1:** `multiply opacity … strip_column_mask` — BMP drives **brightness** (white = full base, black = dark). RGB in the file is converted to grayscale; paint **R=G=B** for precise control.
- **Shipped demo:** `base=cyan` + **`animations/plasma-opacity-mask.bmp`** (high-contrast grayscale mask). You can swap in **`cyan-plasma.bmp`** (luminance from color); use **true black** in mask art or the beam stays mostly flat.
- **Override:** `style = config bmp_gallery_cyan_mask base=deepskyblue mask_opacity=65%`
- **Optional dedicated mask:** `animations/plasma-opacity-mask.bmp` — **144 × 120**, **grayscale only**, high contrast plasma wisps on black (see below).

### Recolorable cracks (`bmp_gallery_ember_mask`)

- **Layer 0:** `solid {{base}}` (default **darkorange**).
- **Layer 1:** `multiply` **`strip_column_mask`** of **`animations/ember-cracks.bmp`** (**144 × 96**). The field is white. Dark lines are the cracks. `base=` recolors the same picture.
- **Layer 2:** `hue_waves` crawls that color along the blade. The cracks stay dark.
- **Override:** `style = config bmp_gallery_ember_mask base=green`

### Wipe-only BMP (`bmp_gallery_ink_bleed`)

Idle is **`solid`** **deepskyblue** plus **`fbm_noise`**. **`animations/ink-bleed.bmp`** (**144 × 48**) is `transition = bmp`. White is lit and black is covered. The top of the image (frame 0) is covered except for a spark at the left, which is the hilt. The bottom row is solid white. Retraction plays the frames backward. Fingers and droplets sit ahead of the wet edge.

### Comet (`bmp_gallery_comet`)

**`steelblue`** is the dim body. **`animations/comet-run.bmp`** (**144 × 80**) is mostly black with one cyan-white head and a gold tail. `screen` leaves black pixels unchanged, so only the traveler adds light. The head runs from the hilt to the tip and loops.

### Two speeds (`bmp_gallery_ghost_trail`)

No new file. **`fire-column.bmp`** plays at **30 fps**, and a second copy of that same file plays at **8 fps** with `screen opacity 25%`. Each copy keeps its own frame ring. The slow copy lags behind the fast one.

## BMP file format (all files)

- **24-bit uncompressed Windows BMP** (BI_RGB, no RLE). ProffieOS rejects 8-bit palette BMPs.
- **GIMP trap:** *Image → Mode → Grayscale* or *Indexed* exports often become **8-bit BMP** (GIMP stores one byte per pixel + palette). Before export: **Image → Mode → RGB** (paint **R=G=B** for masks), then *File → Export As…* → `.bmp`. In the export dialog, pick **24 bit** / **RGB** if shown; leave compression off. Quick check on PC: open the file in a hex viewer or run `python -c "f=open('x.bmp','rb');f.seek(28);print(int.from_bytes(f.read(2),'little'),'bpp')"` — must print **`24 bpp`**.
- **Photoshop:** *Save As* → BMP → **24 Bit**, uncompressed Windows BMP.
- **Layout `frames_y` (default):** image **width** = blade pixel count (**144** in this pack), **height** = number of animation frames (one horizontal row per frame).
- **Row 0 = hilt**, increasing row index toward **tip** along the column sampled per LED.
- **`source_height`** in ini = width (144). **`fps`** = playback rate (30, **15** for nebula, **8** for the ghost trail's second copy).

## Column notes

### 1. `fire-column.bmp` — FireColumn (included)

- **Size:** **144 × 72** px (width × height) or **144 × 90** for a longer loop.
- **Look:** Flames **travel toward the tip** each frame (loop seamlessly if you can). Dark/red core near hilt, orange/yellow mid, bright tips. High saturation reads well on NeoPixels.
- **Motion:** ~2–3 s loop at **30 fps** → 60–90 frames.
- **Wipe:** `transition = flame` with yellow streaks. The column is the lit blade. The flame shape is the ignition and retraction.

### 2. `lightning-column.bmp` — LightningColumn (included)

- **Size:** **144 × 60**. Dark blue–black with white / cyan bolts.
- **Ignition:** `animations/lightning-strike.bmp` (**144 × 40**). Grayscale mask. Row 0 is a short bolt at the hilt with a white trail behind it and forks ahead. The last row is solid white so the idle loop is fully visible once the blade is on.
- **Retraction:** `animations/lightning-drain.bmp` (**144 × 40**). The firmware plays this file backward, so the last row is solid white and row 0 is solid black. The lit region is broken by black gaps, and sparks scatter well past the bolt toward the tip. About 20% of its pixels differ from the strike map.

### 3. `nebula-drift.bmp` — NebulaDrift (included)

- **Size:** **144 × 36** to **144 × 48** (slower preset uses **15 fps**).
- **Look:** Soft **purple, blue, magenta** gas clouds **drifting** along the blade—lower contrast than plasma/fire, more “space fog.”
- **Motion:** Gentle; fewer frames OK because playback is slower.

### 4. `plasma-opacity-mask.bmp` — mask for `bmp_gallery_cyan_mask` (included)

- **Size:** **144 × 120** (or match your flipbook length).
- **Format:** **24-bit** uncompressed BMP (same as other pack assets). **8-bit indexed BMPs are rejected** — the mask layer stays transparent and you only see flat `solid`.
- **Look:** **Grayscale only** — white filaments on **RGB 0,0,0** background. Gray “almost black” (~95) does **not** darken enough on a cyan base; paint real black.
- **Use:** `strip_column_mask animations/plasma-opacity-mask.bmp 144 30` (already in `[bmp_gallery_cyan_mask]`).

## Wiring

`config/blades.ini`: **`bladePin`**, **`bladePowerPin1`–`3`**, **132** pixels default (see `doc/pin_reference.md`).

## Forking

Copy one `[bmp_gallery_*]` section into your own ini, change the path or add multiply layers (`strip_column_mask`, crackle, `rainbow_layer`). See **[bladepacks README](../README.md)**.
