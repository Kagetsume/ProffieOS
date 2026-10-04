# UI layer

**Lit** custom elements + **Web Awesome** (`<wa-*>`) + **Effector** stores. No React.

## Structure

```
ui/
  copy-panel.ts              Read-only INI preview + copy/download
  elements/
    lb-sidebar-nav.ts        Sidebar navigation
    lb-home-page.ts          Overview / config file status
    lb-board-page.ts         Board hardware form
    lb-features-page.ts      Gesture/twist toggles
    lb-wiring-page.ts        Blades wiring route
    lb-blade-card.ts         One blade wiring card
    lb-pin-picker.ts         Pin dropdown (power or data mode)
    lb-power-pin-editor.ts   Multi-row power pin list
    lb-sub-blade-editor.ts   NeoPixel sub-blade ranges
    lb-styles-page.ts        Blade styles + layer stack
    lb-color-input.ts        Grouped color picker with swatches
    lb-blade-preview.ts      Approximate saber preview canvas
    lb-config-stub-page.ts   Placeholder for unimplemented routes
    pin-picker-utils.ts      Pin catalog + wa-option helpers
    lb-element.ts            Base for shadow-DOM + Web Awesome discover
    lb-shared-styles.ts      CSS for shadow-DOM pages
    index.ts                 Side-effect registration
  pages/
    *-page.ts                Thin mount wrappers → `<lb-*>` or copy panel
    mount-page.ts            Shared mount helpers
```

## Patterns

### Mount / cleanup

Pages export `mountXPage(root): () => void`. Lit elements subscribe to Effector in
`connectedCallback` and unsubscribe in `disconnectedCallback`.

### Effector + Lit

- `$wiring` is the source of truth; `lb-wiring-page` watches it and passes `.blade` /
  `.blades` to each `lb-blade-card`.
- Pin pickers register with `registerPowerPinEditorRefresh()` so all pickers refresh
  when `$wiring` changes (disabled states + selection sync).
- `$export` drives the export page copy panels.

### Light DOM vs shadow DOM

**Wiring pickers** (`lb-blade-card`, `lb-pin-picker`, editors) use **Light DOM** so Web Awesome
selects work without shadow-root autoload workarounds.

**Styles/preview pages** use **`LbElement`** + shadow DOM for encapsulated layout and canvas.
See `elements/README.md`.

## Tests

Each `elements/lb-*.ts` component has a matching `elements/lb-*.test.ts` (mount + behavior where relevant).

Shared: `pin-picker-utils.test.ts`, `lb-component-i18n.test.ts`.
