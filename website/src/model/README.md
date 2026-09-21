# Model layer

Plain TypeScript types and **pure functions** — no Effector, no DOM, no fetch.

**User guide with examples:** [BLADES.md](../../BLADES.md) (wiring, sub-blades, accents, presets).

## Wiring (`config/blades.ini`)

| File | Description |
|------|-------------|
| `blades.ts` | `BladeDefinition`, `SubBladeRange`, `BoardProfile` |
| `power-pins.ts` | Power pin list editing, cross-blade usage, export filtering |
| `data-pins.ts` | Data/Free pin catalog helpers, board silkscreen labels |
| `sub-blades.ts` | Sub-blade range editing, validation, logical blade slot counting |

### Quick reference — what each field is for

| Field | Used when | Purpose |
|-------|-----------|---------|
| `index` | Always | Matches `blade = N` in INI and preset `style =` order |
| `type` | Always | `ws2811` (NeoPixel) or `simple` (PWM accent) |
| `dataPin` | Always | Board data line name or GPIO number |
| `pixels` | NeoPixel | LED count on the strip |
| `powerPins` | NeoPixel | FET pin(s) that switch strip power |
| `subBlades` | NeoPixel | Split one strip into multiple styled segments |
| `led` | Simple | LED circuit type (`CreeXPE2White`, …) |
| `activeState` | Simple | `high` or `low` on-state polarity |
| `comment` | Optional | User note exported as `#` comment line |

### Example shapes (in-memory)

**Main NeoPixel strip:**

```ts
{ index: 0, type: 'ws2811', dataPin: 'bladePin', pixels: 144, powerPins: ['bladePowerPin1'] }
```

**Strip split into hilt + chamber (two logical blades):**

```ts
{
  index: 0,
  type: 'ws2811',
  dataPin: 'bladePin',
  pixels: 144,
  powerPins: ['bladePowerPin1'],
  subBlades: [{ first: 0, last: 119 }, { first: 120, last: 143 }],
}
```

**Free1 accent (simple PWM):**

```ts
{
  index: 2,
  type: 'simple',
  dataPin: 'blade5Pin',
  led: 'CreeXPE2White',
  activeState: 'high',
  comment: 'Motor pulse — accent_pulse in presets',
}
```

### Power pin editing vs export

While editing, the UI keeps **empty strings** in the pin array so “Add power pin” can append a blank row. On export, `exportablePowerPins()` strips blanks before writing `power_pin` / `power_pin1` lines.

Cross-blade FET conflicts are computed in `power-pins.ts`; **`stores/power-pin-usage.ts`** exposes them to pickers. Data pin conflicts use **`stores/data-pin-usage.ts`**.

### Sub-blades

One physical NeoPixel strip can define multiple **`sub_blade = first, last`** ranges (inclusive, 0-based). Each range consumes one logical blade slot for preset `style =` lines. See [BLADES.md](../../BLADES.md#sub-blades--one-strip-multiple-styles).

## Board / features

| File | Description |
|------|-------------|
| `board.ts` | `BoardFeaturesState` — buttons, OLED, Bluetooth, gesture/twist toggles |

## Blade styles (`config/blade_styles.ini`)

**User guide with examples:** [BLADE_STYLES.md](../../BLADE_STYLES.md) (recipes, layers, blends, presets).

| File | Description |
|------|-------------|
| `style-sections.ts` | Section/layer stack types, `{{var}}` resolution, base-var rules |
| `style-catalog.ts` | Named style metadata from `catalog/named-styles.json` |
| `style-picker.ts` | Recipe + layer style dropdown encoding |
| `config-styles.ts` | Bundled starter recipes in `catalog/config-styles.json` |
| `colors.ts` | Color catalog groups, export tokens (`name` vs `r,g,b`) |

### Quick reference — recipe stack

| Concept | INI | In-memory |
|---------|-----|-----------|
| Recipe id | `[smoke_blade]` | `StyleSection.id` |
| Section variables | `base = cyan` | `StyleSection.vars` |
| One composited layer | `layer = fire red yellow` | `StyleLayer` (styleName, args, blend, opacity) |
| Nested recipe | `layer = config other_section` | `styleName: 'config'`, `configSection` |
| Preset reference | — | `style = config smoke_blade base=purple` (presets, not model) |

### Example section shape (in-memory)

**Fire + blast (minimal two-layer recipe):**

```ts
{
  id: 'fire_blast',
  vars: {},
  layers: [
    { id: '…', styleName: 'fire', args: ['red', 'yellow'], blend: 'normal', opacity: 32768 },
    { id: '…', styleName: 'blast', args: ['white'], blend: 'normal', opacity: 32768 },
  ],
}
```

**Variable-driven composable base:**

```ts
{
  id: 'with_vars',
  vars: { base: 'cyan', ext: '300', ret: '800' },
  layers: [
    { styleName: 'solid', args: ['{{base}}', '{{ext}}', '{{ret}}'], … },
    { styleName: 'clash', args: ['white'], … },
  ],
}
```

Starter recipes ship in `catalog/config-styles.json` (`smoke_blade`, `water_blade`, `greyscale_mercenary`, …). The editor can insert them via `instantiateConfigStyle()`.

## Presets (`config/presets.ini`)

| File | Description |
|------|-------------|
| `presets.ts` | `PresetDefinition`, default catalog loader |
| `preset-styles.ts` | `PresetStyle` parse/format, slot defaults, accent lines |

Each preset has one `PresetStyle` per logical blade. Export via `serialize/presetsIni.ts`. Wiring changes trigger style slot resize in `stores/presets.ts`.

## Why separate from stores?

Business rules had subtle state bugs when embedded only in UI handlers. Moving rules here allows:

- Deterministic unit tests (`*.test.ts` next to each module)
- Reuse from serializers (`exportablePowerPins`, `exportableSubBlades`, `exportColorToken`)
- Future import/persistence without rewriting logic
