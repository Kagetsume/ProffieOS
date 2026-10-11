# Per-preset font overlays

Copy each subfolder to the **SD card root** as `font/<PresetName>/` (same path as `font_overlay=` in `config/presets.ini`).

WAVs here override matching files from the primary `font=` directory on the SD card (`TeensySF/` when `font = TeensySF`). Typical overrides: **`name.wav`** (preset announce), `in/`, `out/`, `clash/`, or a root `font.wav`.

Each preset has a matching subfolder in this directory (placeholder until you add WAVs).
