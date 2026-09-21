# Serializers

Convert in-memory models into **INI text** matching ProffieOS SD file conventions.

Blades examples and use cases: [BLADES.md](../../BLADES.md).  
Blade style recipes: [BLADE_STYLES.md](../../BLADE_STYLES.md).

## Files

| File | Output | Reference |
|------|--------|-----------|
| `format.ts` | Shared comment headers and spacing | Tone of `examples/config/*.ini` |
| `bladesIni.ts` | `config/blades.ini` | [`doc/blade_config.md`](../../../doc/blade_config.md) |
| `bladeStylesIni.ts` | `config/blade_styles.ini` | Layer recipes, `config <id>` references |
| `presetsIni.ts` | `config/presets.ini` | Preset blocks, `style =` per logical blade |
| `boardIni.ts` | `config/board.ini` | [`doc/board_config.md`](../../../doc/board_config.md) |
| `featuresIni.ts` | `config/features.ini` | Gesture/twist overrides |

## `blades.ini` fields

| Blade type | Exported fields |
|------------|-----------------|
| NeoPixel | `data_pin`, `pixels`, `power_pin` / `power_pin1`…, optional `sub_blade = first, last` |
| Simple PWM | `type = simple`, `data_pin`, `led`, `active_state` |

Comment block above each blade:

1. `# ---- <board silkscreen label> ----` — from data pin catalog (read-only in UI)
2. Optional `# <user note>` — when note field is non-empty

## Design rules

- Serializers are **pure functions**: `(model) => string`.
- Match firmware field names (`power_pin` vs `power_pin1`, `type = simple`, etc.).
- Strip in-progress empty values via model helpers before writing lines (`exportablePowerPins`, `exportableSubBlades`).
- **Presets** serializer not implemented yet.

## Tests

| Test file | Covers |
|-----------|--------|
| `bladesIni.test.ts` | Power pin formatting, comments, sub-blade lines |
| `bladeStylesIni.test.ts` | Section/layer export |
| `boardIni.test.ts` | Board hardware fields |
