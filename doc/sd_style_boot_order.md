# SD style config boot and preset load order

Contract for **`ENABLE_SD_CONFIG_FILES`** and **`config/blade_styles.ini`**.

## Goals

- **Low RAM at boot** — do not load the full INI or all layer strings into static storage.
- **Short SD holds during boot sound** — boot pass indexes section headers only.
- **Preset-scoped cache** — keep parsed layer lines for the active preset’s `config <section>` names on the heap; evict other sections on preset change.
- **Seek + parse** — after boot, load a section by file offset from the index (not a full-file scan).
- **Palettes on demand** — global palette blocks load when a section references `palette=` (not during index build).
- **No audio yield inside INI parse** — do not call `Looper::DoLoop()` while reading style config (causes boot/preon sputter).

## Boot sequence (`ProffieOS.ino`)

1. `LoadSDConfig()` — `config/presets.ini` (and related SD config).
2. `LoadBladeConfigFile()` / `InitSDBladeConfig()` — blades when configured.
3. **`WarmSdBootStyleCache()`** — `StyleConfigBuildSectionIndexFromSd()` only (serial: `Style config: indexed N sections`).
4. `FindBlade()` → **`SetPreset`** → style allocation.

## Preset change (`prop_base.h` → `StyleBootOnPresetActivate`)

Before `AllocateBladeStyles()`:

1. Collect unique `config <section>` names from the preset’s per-blade `style=` lines.
2. **Prune** heap layer cache — drop sections not used by this preset.
3. **Warm** — for each section not already cached, `LoadStyleConfigLayers` (seek via index, parse, store on heap).

Serial (boot): `Style config: indexed N sections`.

Loader lines during `setup()` may run before the USB host opens the port. They are **buffered** and **reprinted once** when serial connects (immediately before `Welcome to ProffieOS`).

Serial (SetPreset), summary line plus one line per unique section:

- `Style config: preset K unique=M config_blades=B deduped=D pruned=P cache_hit=… sd_load=… fail=… heap_cached=…`
- `Style config:   [section_name] N layer(s) cache hit` or `… loaded from SD` or `… load failed`

## Style factory (`style_parser.h` config factory)

`LoadStyleConfigLayers` returns immediately on **cache hit** (no overrides). With preset `key=value` overrides, cache is bypassed and the section is parsed again with overrides merged.

## Media layers (e.g. `strip_column`)

BMP column animation is **not** part of this loader; SD reads for animation files happen when the saber is on and the style runs. Fix loader/cache first, then debug BMP display separately.
