# Effector stores

Application state and derived export strings. UI pages subscribe with `.watch()` and dispatch **events** — never assign to stores directly.

## Core stores

| Unit | Holds |
|------|--------|
| `$boardProfileId` | Selected board profile (e.g. `proffie_v3`) — `project.ts` |
| `$wiring` | `BladeDefinition[]` — full wiring table — `wiring.ts` |
| `$boardFeatures` | Board + feature toggles — `boardFeatures.ts` |
| `$styleSections` | Blade style sections/layers — `styleSections.ts` |
| `$presets` | Preset list — `presets.ts` (syncs style line count with `$wiring`) |
| `$previewSim` | Preview simulation state (lockup, drag, etc.) — `previewEvents.ts` |
| `$export` | Derived INI strings — `export.ts` |

## Wiring events (`wiring.ts`)

| Event | Effect |
|-------|--------|
| `bladeUpdated` | Patch one blade by index |
| `bladeAdded` | Append a new default NeoPixel blade |
| `bladeRemoved` | Remove blade by index |
| `applyProfileDefaults` | Reset `$wiring` from catalog profile |
| `boardProfileChanged` | Change active board profile id — `project.ts` |

## Pin usage helpers

### Power pins (`power-pin-usage.ts`)

| Export | Role |
|--------|------|
| `$masterUsedPresetPins` | Derived list of preset FET pins in use |
| `getUsedPresetsForPicker()` | Presets to disable in one picker (sibling rows + other blades) |
| `registerPowerPinEditorRefresh()` | Fan-out from `$wiring` to mounted `<po-pin-picker>` elements |

One app-lifetime `$wiring.watch` notifies registered refresh callbacks. Each picker unsubscribes in `disconnectedCallback`.

### Data pins (`data-pin-usage.ts`)

| Export | Role |
|--------|------|
| `$masterUsedDataPins` | Derived list of preset data pins in use |
| `getUsedDataPinsForPicker()` | Data pins to disable on other blades |
| `wiringWithBladeDataPin()` | Substitute in-progress data pin before store commit |

## Export (`export.ts`)

`$export` combines `$wiring`, `$styleSections`, `$presets`, and `$boardFeatures` into:

| Key | Serializer |
|-----|------------|
| `bladesIni` | `serializeBladesIni` |
| `bladeStylesIni` | `serializeBladeStylesIni` |
| `presetsIni` | `serializePresetsIni` |
| `boardIni` | `serializeBoardIni` |
| `featuresIni` | `serializeFeaturesIni` |

## Style section events (`styleSections.ts`)

`$styleSections` holds `[section]` blocks for `config/blade_styles.ini` (variables + layer stack). Events cover section/layer CRUD, variable binding, reorder, and active section selection. Recipe concepts: [BLADE_STYLES.md](../../BLADE_STYLES.md).

## Debug logging

Store events are traced at **debug** level via `event.watch` + `contextLogger` at the bottom of each store module. Example:

```ts
bladeUpdated.watch(({ index, patch }) => {
  contextLogger('wiring', 'bladeUpdated').debug('dispatched', {
    index,
    patchKeys: Object.keys(patch),
  });
});
```

Example DevTools filter:

```ts
import { configureContextLoggerFilter, configureLogger } from '../logger';

configureLogger({ debug: true });
configureContextLoggerFilter({ objectNames: ['wiring', 'presets'] });
```

UI components log user handlers separately (`contextLogger('po-*', …)`). Together they trace: click → store event → `$export` → serialize (also logged in each `serialize*Ini`).

**Not logged:** `previewSimTick`, derived `presetStyleSlotsSynced` (fires on every wiring change — use `wiring` events instead).

## Adding new config files

Follow the same pattern: plain model types → store → serializer → add to `$export` combine. Keep serializers free of Effector imports. Add `event.watch` + `contextLogger` for new events and a debug line at each serializer entry point.
