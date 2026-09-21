# Lit custom elements

ProffieOS config editor UI. Registered via `index.ts` (imported from `main.ts`).

## Pages

| Tag | Role |
|-----|------|
| `<po-home-page>` | Overview, config file readiness table |
| `<po-sidebar-nav>` | Hash navigation sidebar |
| `<po-board-page>` | `config/board.ini` editor |
| `<po-features-page>` | `config/features.ini` editor |
| `<po-wiring-page>` | Blades wiring route (toolbar + blade list + collapsible help) |
| `<po-styles-page>` | Blade styles layer stack + preview + collapsible help |
| `<po-presets-page>` | Presets list + per-blade style line editors |
| `<po-preset-style-row>` | One logical blade's style = line (named / config / custom) |
| `<po-config-stub-page>` | Placeholder for future routes |
| `<po-blade-preview>` | Approximate vertical saber preview canvas |

## Wiring components

| Tag / module | Role |
|--------------|------|
| `<po-blade-card>` | One blade form: type, data pin, board label, note, NeoPixel/simple fields |
| `<po-pin-picker>` | One pin dropdown — `mode="power"` (FET) or `mode="data"` (strip/Free pins) |
| `<po-power-pin-editor>` | Multi-row power pins for one NeoPixel blade |
| `<po-sub-blade-editor>` | LED index ranges → `sub_blade = first, last` lines |
| `pin-picker-utils.ts` | Pin catalogs, declarative option labels, custom pin value |

## Style components

| Tag | Role |
|-----|------|
| `<po-color-input>` | Grouped color select with per-option swatches |

## Infrastructure

| Module | Role |
|--------|------|
| `po-element.ts` | Shadow-DOM base — Web Awesome `discover()` after Lit updates |
| `po-shared-styles.ts` | Shared layout CSS (host, page shell, config forms, wiring widgets) |
| `po-*.styles.ts` | Per-component Lit `css` — imported as `static styles` (keeps `.ts` files small) |

## Light DOM + Web Awesome

Wiring elements use **Light DOM** (`createRenderRoot() { return this; }`) so `wa-select` /
`wa-option` behave per [Web Awesome docs](https://webawesome.com/docs/components/select).
Global layout classes live in `app.css`.

`PoElement` + `po-shared-styles.ts` are used for shadow-encapsulated pages (styles, preview, home).

## Pin picker UX

1. Preset options show human labels (data pins) or pin names (power pins).
2. Presets in use on **other blades** (or sibling power-pin rows) get `option.disabled = true`.
3. **Custom** option allows raw pin names or GPIO numbers.
4. All `<po-pin-picker>` instances subscribe to `$wiring` via `registerPowerPinEditorRefresh()`.

## Sub-blade UX

- NeoPixel blades only; cleared when switching to simple PWM.
- Each row: `first`, `last` (inclusive, 0-based), LED count, validation against `pixels`.
- Empty list = full strip (no `sub_blade` lines exported).
- Up to 8 ranges (`MAX_SUB_BLADES`).

## Tests

- `pin-picker-utils.test.ts` — option init, disabled flags, data mode mapping
- `po-power-pin-editor.test.ts` — add/remove rows, cross-blade disable
- `po-blade-card.test.ts` — data pin picker, silkscreen labels
