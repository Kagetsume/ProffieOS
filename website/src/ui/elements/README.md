# Lit custom elements

ProffieOS config editor UI. Registered via `index.ts` (imported from `main.ts`).

| Tag / module | Role |
|--------------|------|
| `<po-wiring-page>` | Wiring route (toolbar + blade list) |
| `<po-blade-card>` | One blade form card |
| `<po-power-pin-editor>` | Multi-row power pins for one NeoPixel blade |
| `<po-pin-picker>` | One FET power pin (`wa-select` + custom input) |
| `pin-picker-utils.ts` | Imperative `wa-option` setup (no innerHTML rebuild) |
| `po-element.ts` | Optional base for future shadow-DOM components (preview, etc.) |
| `po-shared-styles.ts` | Layout CSS for shadow-DOM components |

## Light DOM + Web Awesome

Wiring elements use **Light DOM** (`createRenderRoot() { return this; }`) so `wa-select` /
`wa-option` behave per [Web Awesome docs](https://webawesome.com/docs/components/select).
Global layout classes live in `app.css`.

`PoElement` + `po-shared-styles.ts` remain for components that need shadow encapsulation
(e.g. planned `<po-blade-preview>`).

## Power pin UX

1. Empty rows stay empty until the user picks a pin.
2. Presets in use (other rows **or other blades**) get `option.disabled = true`.
3. Cross-blade sync: each `po-power-pin-editor` receives `.blades` from `po-wiring-page`;
   `usedPresetsForPicker()` runs on every render when `$wiring` changes.

## Tests

- `pin-picker-utils.test.ts` — option init, disabled flags
- `po-power-pin-editor.test.ts` — add/remove rows, cross-blade disable
