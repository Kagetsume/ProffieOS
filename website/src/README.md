# Source (`src/`)

All application logic for **LayerBlade** (ProffieOS SD config browser editor). **No React** — UI is **Lit** custom elements (`<lb-*>`) composing **Web Awesome** (`<wa-*>`), with **Effector** for app state.

## Data flow

1. **User action** — input/select on a Lit element (e.g. `<lb-blade-card>`).
2. **Event** — component dispatches a CustomEvent; page handler fires an Effector event (`stores/`).
3. **Store update** — immutable state change (e.g. `$wiring`, `$styleSections`).
4. **Derived export** — `$export` recomputes INI strings via `serialize/`.
5. **Re-render** — Lit elements subscribed via `$store.watch()` call `requestUpdate()`.

Pure transformations (pin lists, sub-blade ranges, INI formatting) live in **`model/`** and **`serialize/`** so they can be unit-tested without the DOM.

User guides (repo root under `website/`): [BLADES.md](../BLADES.md) (wiring), [BLADE_STYLES.md](../BLADE_STYLES.md) (layer recipes).

## Directories

| Directory | Purpose | README |
|-----------|---------|--------|
| `model/` | Types and pure functions (no Effector) | [model/README.md](./model/README.md) |
| `stores/` | Effector stores, events, derived `$export` | [stores/README.md](./stores/README.md) |
| `serialize/` | Build INI file text from models | [serialize/README.md](./serialize/README.md) |
| `catalog/` | Static JSON: profiles, pins, colors, styles | [catalog/README.md](./catalog/README.md) |
| `validation/` | Caps mirrored from firmware | [validation/README.md](./validation/README.md) |
| `preview/` | Approximate blade preview (pure TS); **`strip-column-bmp.ts`** + **`renderers/strip-column.ts`** match firmware BMP column rules | [preview/README.md](./preview/README.md) |
| `stores/bmpAssets.ts` | In-memory flipbooks keyed by SD path string for **`strip_column`** preview |
| `i18n/` | JSON bundles, translation, Intl formatters | [i18n/README.md](./i18n/README.md) |
| `logger/` | Timestamped `console` wrapper with level toggles | [logger/README.md](./logger/README.md) |
| `ui/` | Lit elements, page mounts, copy panel | [ui/README.md](./ui/README.md) |

## Entry points

- **`main.ts`** — Web Awesome CSS, registers `<lb-*>` elements, hash routes, router.
- **`route-config.ts`** — Route ids, sidebar labels, SD file paths, stub flags.
- **`router.ts`** — `#/home`, `#/board`, `#/features`, `#/blades`, `#/styles`, `#/presets`, `#/export`.

## Conventions

- **File headers** — non-test modules use `@module path/to/module` JSDoc; public exports get brief `@param` / `@returns` where non-obvious.
- **Debug logging** — use `contextLogger('component', 'function')` directly at user handlers, store `event.watch` callbacks, serializer entry points, and preview sim transitions. Do **not** log render loops, rAF ticks, or hot-path recomputes — see [logger/README.md](./logger/README.md).
- **Models** are plain TypeScript; keep side-effect-free helpers here.
- **Stores** own mutable app state; UI dispatches events, never assigns to stores directly.
- **Lit wiring elements** use **Light DOM** (`createRenderRoot() { return this; }`) so Web Awesome form controls work reliably.
- **Lit preview/style pages** may extend **`LbElement`** for shadow DOM + Web Awesome `discover()` (see `ui/elements/lb-element.ts`).
- **Layout CSS** for wiring lives in `app.css`; shadow-DOM pages use `lb-shared-styles.ts`.
- **Tests** (`*.test.ts`) sit next to the module they cover; excluded from `tsc` production build.
