# Per-preset font overlays

Copy each subfolder to the **SD card root** as `font/<PresetName>/` (same path as `font_overlay=` in `config/presets.ini`).

WAVs here override matching files from the primary `font=` directory. Each preset folder contains a `font.wav` name announcement.

The sputter effect uses the font's **preon** sound and **pstoff** sound. Put those in the primary font, or override them in this folder.
