# Effector stores

Application state and derived export strings. UI pages subscribe with `.watch()` and dispatch **events** — never assign to stores directly.

## Stores

| Unit | Holds |
|------|--------|
| `$boardProfileId` | Selected board profile (e.g. `proffie_v3`) |
| `$numBlades` | Blade count (informational; wiring store is source of truth for list length) |
| `$wiring` | `BladeDefinition[]` — full wiring table |
| `$masterUsedPresetPins` | Preset FET pins in use across all NeoPixel blades (derived from `$wiring`) |
| `$export` | Derived `{ bladesIni: string }` from `$wiring` |

## Events

| Event | Effect |
|-------|--------|
| `bladeUpdated` | Patch one blade by index |
| `bladeAdded` | Append a new default NeoPixel blade |
| `bladeRemoved` | Remove blade by index |
| `applyProfileDefaults` | Reset `$wiring` from catalog profile |
| `boardProfileChanged` | Change active board profile id |

## Power pin usage (`power-pin-usage.ts`)

| Export | Role |
|--------|------|
| `$masterUsedPresetPins` | Derived list of preset FET pins in use |
| `getUsedPresetsForPicker()` | Presets to disable in one picker (sibling rows + other blades) |
| `registerPowerPinEditorRefresh()` | Fan-out from `$wiring` to mounted `<po-pin-picker>` elements |

One app-lifetime `$wiring.watch` notifies registered refresh callbacks. Each picker unsubscribes in `disconnectedCallback`.

## Adding Phase 2+ stores

Follow the same pattern: plain model types → store → serializer → `$export` combine. Keep serializers free of Effector imports.
