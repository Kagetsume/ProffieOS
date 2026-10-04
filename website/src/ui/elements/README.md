# Lit custom elements

ProffieOS config editor UI. Registered via `index.ts` (imported from `main.ts`).

## Pages

| Tag | Role |
|-----|------|
| `<lb-home-page>` | Overview, config file readiness table |
| `<lb-sidebar-nav>` | Hash navigation sidebar |
| `<lb-board-page>` | `config/board.ini` editor |
| `<lb-features-page>` | `config/features.ini` editor |
| `<lb-wiring-page>` | Blades wiring route (toolbar + blade list + collapsible help) |
| `<lb-styles-page>` | Blade styles layer stack + preview + collapsible help |
| `<lb-presets-page>` | Presets list + per-blade style line editors |
| `<lb-preset-style-row>` | One logical blade's style = line (named / config / custom) |
| `<lb-config-stub-page>` | Placeholder for future routes |
| `<lb-blade-preview>` | Approximate vertical saber preview canvas |

## Wiring components

| Tag / module | Role |
|--------------|------|
| `<lb-blade-card>` | One blade form: type, data pin, board label, note, NeoPixel/simple fields |
| `<lb-pin-picker>` | One pin dropdown — `mode="power"` (FET) or `mode="data"` (strip/Free pins) |
| `<lb-power-pin-editor>` | Multi-row power pins for one NeoPixel blade |
| `<lb-sub-blade-editor>` | LED index ranges → `sub_blade = first, last` lines |
| `pin-picker-utils.ts` | Pin catalogs, declarative option labels, custom pin value |

## Style components

| Tag | Role |
|-----|------|
| `<lb-color-input>` | Grouped color select with per-option swatches |
| `<lb-bmp-input>` | SD path + **Upload BMP** for **`strip_column`** / mask layers (registers flipbook in **`bmpAssets`**) |

## Component file layout

Each `lb-*.ts` class follows this order:

1. Static fields (`static styles`, `static properties`, …)
2. Instance fields
3. Lit lifecycle (`connectedCallback`, `disconnectedCallback`, `createRenderRoot`, `willUpdate`, `firstUpdated`, `updated`, …)
4. Other methods (helpers, handlers, private `renderXxx` template builders)
5. **`render()`** — always the last method in the class
6. **`customElements.define(...)`** — after the class (manual registration; no `@customElement` decorators)

## Infrastructure

| Module | Role |
|--------|------|
| `lb-element.ts` | Shadow-DOM base — Web Awesome `discover()` after Lit updates |
| `lb-shared-styles.ts` | Shared layout CSS (host, page shell, config forms, wiring widgets) |
| `lb-*.styles.ts` | Per-component Lit `css` — imported as `static styles` (keeps `.ts` files small) |

## Light DOM + Web Awesome

Wiring elements use **Light DOM** (`createRenderRoot() { return this; }`) so `wa-select` /
`wa-option` behave per [Web Awesome docs](https://webawesome.com/docs/components/select).
Global layout classes live in `app.css`.

`LbElement` + `lb-shared-styles.ts` are used for shadow-encapsulated pages (styles, preview, home).

## Pin picker UX

1. Preset options show human labels (data pins) or pin names (power pins).
2. Presets in use on **other blades** (or sibling power-pin rows) get `option.disabled = true`.
3. **Custom** option allows raw pin names or GPIO numbers.
4. All `<lb-pin-picker>` instances subscribe to `$wiring` via `registerPowerPinEditorRefresh()`.

## Sub-blade UX

- NeoPixel blades only; cleared when switching to simple PWM.
- Each row: `first`, `last` (inclusive, 0-based), LED count, validation against `pixels`.
- Empty list = full strip (no `sub_blade` lines exported).
- Up to 8 ranges (`MAX_SUB_BLADES`).

## Test IDs

Interactive and structural nodes expose stable `data-testid` attributes for jsdom tests and automation.

**Naming:** `{area}-{role}` in kebab-case — e.g. `blade-preview-clash`, `copy-panel-content`, `sidebar-nav-link-styles`.

**Query helpers:** `getByTestId`, `getAllByTestId`, and `getAllByTestIdPrefix` in `src/test/lit-host-utils.ts` (search light DOM or shadow root as appropriate).

Do not use CSS class names or Web Awesome tag names in tests when a `data-testid` exists for that node.

## Tests

All `<lb-*>` elements have a colocated `lb-*.test.ts` beside the component (jsdom via `vite.config.ts`).

Each spec imports its element (and any child elements the template needs), uses `data-testid` + `getByTestId` from `src/test/lit-host-utils.ts`, and covers mount smoke tests plus behavior where relevant.

Shared non-component tests: `pin-picker-utils.test.ts`, `lb-component-i18n.test.ts`.
