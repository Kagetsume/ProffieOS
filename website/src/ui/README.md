# UI layer

**Lit** custom elements + **Web Awesome** (`<wa-*>`) + **Effector** stores. No React.

## Structure

```
ui/
  copy-panel.ts              Read-only INI preview + copy/download
  elements/
    po-sidebar-nav.ts        Sidebar navigation
    po-home-page.ts          Overview / config file status
    po-board-page.ts         Board hardware form
    po-features-page.ts      Gesture/twist toggles
    po-wiring-page.ts        Blades wiring route
    po-blade-card.ts         One blade wiring card
    po-pin-picker.ts         Pin dropdown (power or data mode)
    po-power-pin-editor.ts   Multi-row power pin list
    po-sub-blade-editor.ts   NeoPixel sub-blade ranges
    po-styles-page.ts        Blade styles + layer stack
    po-color-input.ts        Grouped color picker with swatches
    po-blade-preview.ts      Approximate saber preview canvas
    po-config-stub-page.ts   Placeholder for unimplemented routes
    pin-picker-utils.ts      Pin catalog + wa-option helpers
    po-element.ts            Base for shadow-DOM + Web Awesome discover
    po-shared-styles.ts      CSS for shadow-DOM pages
    index.ts                 Side-effect registration
  pages/
    *-page.ts                Thin mount wrappers → `<po-*>` or copy panel
    mount-page.ts            Shared mount helpers
```

## Patterns

### Mount / cleanup

Pages export `mountXPage(root): () => void`. Lit elements subscribe to Effector in
`connectedCallback` and unsubscribe in `disconnectedCallback`.

### Effector + Lit

- `$wiring` is the source of truth; `po-wiring-page` watches it and passes `.blade` /
  `.blades` to each `po-blade-card`.
- Pin pickers register with `registerPowerPinEditorRefresh()` so all pickers refresh
  when `$wiring` changes (disabled states + selection sync).
- `$export` drives the export page copy panels.

### Light DOM vs shadow DOM

**Wiring pickers** (`po-blade-card`, `po-pin-picker`, editors) use **Light DOM** so Web Awesome
selects work without shadow-root autoload workarounds.

**Styles/preview pages** use **`PoElement`** + shadow DOM for encapsulated layout and canvas.
See `elements/README.md`.

## Tests

| File | Covers |
|------|--------|
| `elements/pin-picker-utils.test.ts` | Option init, disabled flags, data mode |
| `elements/po-power-pin-editor.test.ts` | Add/remove rows, cross-blade disable |
| `elements/po-blade-card.test.ts` | Data pin picker on blade card |
