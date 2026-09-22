# Validation limits

Constants mirrored from ProffieOS firmware caps. Used by UI (disable add buttons) and model helpers (slice arrays).

| Constant | Value | Firmware reference |
|----------|-------|-------------------|
| `MAX_BLADES` | 16 | SD blade definition limit (`SD_MAX_BLADE_DEFS`) |
| `MAX_POWER_PINS` | 6 | Up to six FET power pins per NeoPixel blade |
| `MAX_SUB_BLADES` | 8 | Up to eight `sub_blade` ranges per NeoPixel strip (`SD_MAX_SUB_BLADES_PER_BLADE`) |

**`blade_styles.ini`** limits (firmware — not all enforced in UI yet): 16 layers per section,
384 characters per `layer =` line, 4096 parser line cap (`SD_STYLE_CONFIG_MAX_LINES`). See
[`doc/blade_styles_config.md`](../../../doc/blade_styles_config.md).

## Logical blade count

Wiring entries in `blades.ini` are not always 1:1 with preset `style =` lines. A NeoPixel blade with **N** sub-blade ranges consumes **N** logical blades; a blade with no sub-blades consumes **1**. Use `totalLogicalBladeSlots()` in `model/sub-blades.ts` — the wiring page shows this count for matching compiled `NUM_BLADES`.

Future helpers may warn when logical blade count differs from firmware `NUM_BLADES` without blocking export.
