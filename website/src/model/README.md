# Model layer

Plain TypeScript types and **pure functions** — no Effector, no DOM, no fetch.

## Files

| File | Description |
|------|-------------|
| `blades.ts` | `BladeDefinition`, `BoardProfile` types matching `config/blades.ini` concepts |
| `power-pins.ts` | Power pin list editing, cross-blade `masterUsedPresetPins` / `usedPresetsForPicker`, export filtering |

## Why separate from stores?

Power pin logic had subtle state bugs when embedded only in UI handlers. Moving rules here allows:

- Deterministic unit tests (`power-pins.test.ts`)
- Reuse from serializers (`exportablePowerPins`)
- Future backend sync without rewriting business rules

## Power pin editing vs export

While editing, the UI keeps **empty strings** in the pin array so “Add power pin” can append a blank row. On export, `exportablePowerPins()` strips blanks before writing `power_pin` / `power_pin1` lines.

Cross-blade FET pin conflicts are computed in pure functions here; **`stores/power-pin-usage.ts`** exposes them to Lit pickers via `$wiring` and `getUsedPresetsForPicker()`.
