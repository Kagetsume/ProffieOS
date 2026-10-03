# SD style config boot and preset load order

Contract for **`ENABLE_SD_CONFIG_FILES`** and **`config/blade_styles.ini`**.

## Goals

- **Low RAM at boot** — do not load the full INI or all layer strings into static storage.
- **Short SD holds during boot sound** — boot pass indexes section headers only.
- **Preset-scoped cache** — keep parsed layer lines for the active preset’s `config <section>` names on the heap; evict other sections on preset change.
- **Seek + parse** — after boot, load a section by file offset from the index (not a full-file scan).
- **Palettes on demand** — global palette blocks load when a section references `palette=` (not during index build).
- **No audio yield inside INI parse** — do not call `Looper::DoLoop()` while reading style config (causes boot/preon sputter).
- **INI file handles** — `ScopedFileReader` closes each handle at scope exit (same open count as explicit `Close()`; not per line). Preset warm opens `blade_styles.ini` **once** and seek-loads all cache-miss sections before closing. Palettes load in a separate one-time pass **before** the section file is opened so the same INI is never held open twice.

## Boot sequence (`ProffieOS.ino`)

1. `LoadSDConfig()` — `config/presets.ini` (and related SD config).
2. `LoadBladeConfigFile()` / `InitSDBladeConfig()` — blades when configured.
3. **`WarmSdBootStyleCache()`** — `StyleConfigBuildSectionIndexFromSd()` only (serial: `Style config: indexed N sections`). No layer strings, no palette scan, no BMP reads.
4. `FindBlade()` → **`SetPreset(0, …)`** → **`StyleBootOnPresetActivate`** (warm heap layer cache for preset 0) → **`AllocateBladeStyles()`**.

Every later **`SetPreset`** / **`SetPresetFast`** runs **`StyleBootOnPresetActivate`** again before styles are allocated.

## Preset change (`prop_base.h` → `StyleBootOnPresetActivate`)

Before `AllocateBladeStyles()`:

1. Collect unique `config <section>` names from the preset’s per-blade `style=` lines.
2. **Prune** heap layer cache — drop sections not used by this preset.
3. **Warm** — for each cache-miss section, seek-parse via the section index (single SD open for the whole warm pass when the index is ready), then store on heap.

Serial (boot): `Style config: indexed N sections`.

Loader lines during `setup()` may run before the USB host opens the port. They are **buffered** and **reprinted once** when serial connects (immediately before `Welcome to ProffieOS`).

Serial (SetPreset), summary line plus one line per unique section:

- `Style config: preset K unique=M config_blades=B deduped=D pruned=P cache_hit=… sd_load=… fail=… heap_cached=…`
- `Style config:   [section_name] N layer(s) cache hit` or `… loaded from SD` or `… load failed`

## Style factory (`style_parser.h` config factory)

`LoadStyleConfigLayers` returns immediately on **cache hit** (no overrides). With preset `key=value` overrides, cache is bypassed and the section is parsed again with overrides merged.

## Media layers (`strip_column` / `strip_column_mask`)

These are **not** loaded by `LoadStyleConfigLayers`. The INI only stores the style argument string (SD path, height, fps, …).

- **Format:** ordinary **24-bit BI_RGB uncompressed BMP** on SD (GIMP/Photoshop export). There is **no** separate saber container format.
- **Pixels:** BMP stores **BGR**; the loader swaps to **RGB** in RAM (`strip_column_bmp.h`).
- **Paths:** SD-relative (e.g. `animations/plasma.bmp`). **Quoted paths** are optional when the path contains spaces (`"anim/my file.bmp"`).
- **When SD is read:** **`strip_column`** / **`strip_column_mask`** **do not open BMP files until the saber is on** (`SaberBase::IsOn()`). While off, the layer is transparent and boot stays responsive (SD I/O would block the Looper).
- **How frames load:** One vertical **column** per animation frame; rows are filled **incrementally** in small slices (`STRIP_COLUMN_BMP_ROWS_PER_RUN`); render reads **RAM only** between slices. Firmware advances **one frame at a time** (no skipping when SD is slow) and prefetches up to **`STRIP_COLUMN_FRAME_RING_SIZE − 1`** columns ahead (default ring **6**). The style **`fps`** arg sets the target advance rate, but SD slice I/O can cap the **effective** flipbook speed — tune **`fps`** down (demo presets often use **`8`**–**`10`**, not **`30`**) and A/B without multiply layers if motion feels too fast or uneven.
- **Mask parity:** **`strip_column_mask`** uses the same BMP layout and the shared **`StripColumnFrameSource`** in **`strip_column_source.h`** (grayscale → multiply luminance).

Open/fail lines on serial (`strip_column: opened …`, missing file, invalid BMP) are intentional; they are separate from **`Style config:`** boot/preset cache logs.
