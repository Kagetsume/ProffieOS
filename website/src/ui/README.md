# UI layer

**Lit** custom elements + **Web Awesome** (`<wa-*>`) + **Effector** stores. No React.

## Structure

```
ui/
  copy-panel.ts           Read-only INI preview + copy/download
  elements/
    po-pin-picker.ts      Single power pin picker (Light DOM)
    po-power-pin-editor.ts Multi-row power pin list
    po-blade-card.ts      One blade wiring card
    po-wiring-page.ts     Wiring route page
    pin-picker-utils.ts   wa-select option helpers (shared)
    po-element.ts         Base for future shadow-DOM components
    po-shared-styles.ts   CSS for shadow-DOM components
    index.ts              Side-effect registration
  pages/
    wiring-page.ts        Mount `<po-wiring-page>`
    export-page.ts        Live export preview
```

## Patterns

### Mount / cleanup

Pages export `mountXPage(root): () => void`. Lit elements subscribe to Effector in
`connectedCallback` and unsubscribe in `disconnectedCallback`.

### Effector + Lit

- `$wiring` is the source of truth; `po-wiring-page` watches it and passes `.blade` /
  `.blades` to each `po-blade-card`.
- Cross-blade power pin usage: `usedPresetsForPicker()` in `model/power-pins.ts`; each
  editor re-renders when the wiring store changes.

### Light DOM for form controls

Wiring pickers extend `LitElement` with Light DOM so Web Awesome selects work without
shadow-root autoload workarounds. See `elements/README.md`.

## Tests

- `elements/pin-picker-utils.test.ts` — option init, disabled flags
- `elements/po-power-pin-editor.test.ts` — add/remove rows, cross-blade disable
