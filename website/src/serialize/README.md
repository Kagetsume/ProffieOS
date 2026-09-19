# Serializers

Convert in-memory models into **INI text** matching ProffieOS SD file conventions.

## Files

| File | Output | Reference |
|------|--------|-----------|
| `format.ts` | Shared comment headers and spacing | Tone of `examples/config/*.ini` |
| `bladesIni.ts` | `config/blades.ini` | [`doc/blade_config.md`](../../../doc/blade_config.md) |

## Design rules

- Serializers are **pure functions**: `(model) => string`.
- Match firmware field names (`power_pin` vs `power_pin1`, `type = simple`, etc.).
- Strip in-progress empty values (e.g. blank power pin rows) via model helpers before writing lines.
- Phase 2+ will add `presetsIni.ts`, `bladeStylesIni.ts`, `boardIni.ts`, `featuresIni.ts`.

## Tests

`bladesIni.test.ts` snapshots key power-pin formatting rules (single pin, numbered pins, blank row omission).
