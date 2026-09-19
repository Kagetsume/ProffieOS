# Source (`src/`)



All application logic for the ProffieOS SD Config Editor. **No React** — UI is **Lit** custom elements (`<po-*>`) composing **Web Awesome** (`<wa-*>`), with **Effector** for app state.



## Data flow



1. **User action** — input/select on a Lit element (e.g. `<po-blade-card>`).

2. **Event** — component dispatches an Effector event (`stores/`).

3. **Store update** — immutable state change (e.g. `$wiring`).

4. **Derived export** — `$export` recomputes INI strings via `serialize/`.

5. **Re-render** — Lit elements subscribed via `$store.watch()` call `requestUpdate()`.



Pure transformations (power pin lists, INI formatting) live in **`model/`** and **`serialize/`** so they can be unit-tested without the DOM.



## Directories



| Directory | Purpose | README |

|-----------|---------|--------|

| `model/` | Types and pure functions (no Effector) | [model/README.md](./model/README.md) |

| `stores/` | Effector stores, events, derived `$export` | [stores/README.md](./stores/README.md) |

| `serialize/` | Build INI file text from models | [serialize/README.md](./serialize/README.md) |

| `catalog/` | Static JSON: board profiles, pin names | [catalog/README.md](./catalog/README.md) |

| `validation/` | Caps mirrored from firmware | [validation/README.md](./validation/README.md) |

| `ui/` | Lit elements, page mounts, copy panel | [ui/README.md](./ui/README.md) |



## Entry points



- **`main.ts`** — Web Awesome CSS, registers `<po-*>` elements, hash routes, router.

- **`router.ts`** — `#/wiring`, `#/export`; each route exposes `mount(root) → cleanup`.



## Conventions



- **Models** are plain TypeScript; keep side-effect-free helpers here.

- **Stores** own mutable app state; UI dispatches events, never assigns to stores directly.

- **Lit elements** extend **`PoElement`** when they host `wa-*` in shadow DOM (see `ui/elements/po-element.ts`).

- **Layout CSS** for wiring lives in `ui/elements/po-shared-styles.ts` (global `app.css` classes do not pierce shadow roots; `--wa-*` tokens do).

- **Tests** (`*.test.ts`) sit next to the module they cover; excluded from `tsc` production build.


