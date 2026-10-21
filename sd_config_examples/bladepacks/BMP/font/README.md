# Per-preset font overlays

Copy each subfolder to the **SD card root** as `font/<PresetName>/` (same path as `font_overlay=` in `config/presets.ini`).

WAVs here override matching files from the primary **`font=`** directory (`TeensySF/` when `font = TeensySF`). Typical additions: **`name.wav`** (preset announce), `in/`, `out/`, `clash/`, or root `font.wav`.

Each preset folder includes `font.wav` (the name played when that font is selected). Add `in/`, `out/`, or `clash/` here to override TeensySF.
