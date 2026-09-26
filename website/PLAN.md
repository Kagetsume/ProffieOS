# ProffieOS SD Config Editor — Implementation Plan

> **Current status:** See [README.md](./README.md) and per-folder READMEs under `src/` for
> what is implemented today. This plan retains historical phase notes and future ideas.

Web app for **displaying, editing, and exporting** SD card config files used by the
config-driven workflow in [`examples/config/`](../examples/config/). Generates
formatted INI text for copy/download — does **not** run Proffie firmware or generate
compilable C++ styles. **Approximate** blade strip preview (layer compositing + simplified
per-style renderers) is in scope; pixel-perfect parity with hardware is not.

**Architecture (current): frontend-only.** No backend, API, database, or auth. The app
runs entirely in the browser (Vite dev server or static `dist/`). All state lives in
Effector stores; persistence uses **LocalStorage** and/or user **download** of INI/zip.
A backend may be added later (e.g. shared presets, catalog hosting, auth) — design
stores and serializers so they stay portable and do not assume a server.

---

## Goals

1. **Wiring wizard** — select board profile, blade count, NeoPixel vs simple PWM
   accents; emit valid `config/blades.ini`.
2. **Preset editor** — font, track, name, one `style =` line per blade index; support
   direct named styles and `config <section>` with optional `key=value` overrides.
3. **Layer recipe editor** — edit `[section]` blocks for `config/blade_styles.ini`
   with **forms, not free typing**: style dropdowns, color pickers, numeric fields,
   blend/opacity controls, variable/palette editors, and inline validation of layer
   configs (arg counts, unresolved `{{vars}}`, stack warnings). Optional raw `layer =`
   line mode for power users. Does **not** generate compilable firmware styles — only
   SD config INI.
4. **Board / features** — toggles for `board.ini` and `features.ini`.
5. **Live export pane** — formatted file preview per config type, **Copy** and
   **Download** (single file or zip of `config/` tree).
6. **Layer stack + blade preview** — structural stack (base → overlays) plus an
   **approximate** LED strip preview: resolved colors, blend/opacity compositing,
   simplified idle animation, and optional event simulation (clash, lockup, swing).
   Texture and OS7-style recipes use **style-informed math approximations** (refinable
   over time), not firmware-identical rendering.

## Non-goals (initial releases)

- React, Vue, Angular, Svelte, or any UI framework beyond Web Components.
- **Backend services** — no REST/GraphQL, server-side render, cloud save, or build-time
  API in Phase 1–4. Explore and test locally; defer server work until requirements are clear.
- **Pixel-accurate** blade preview or a full style-engine port (WASM / reimplementing
  all C++ templates). Approximate preview **is** planned (see **Blade preview** below).
- Generating **compilable** Proffie style code (`Layers<>`, new named styles in firmware).
- Round-trip import that preserves all comments from hand-edited INI (Phase 3+ only).
- Flashing firmware or serial communication with the saber.

---

## Tech stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Build | **Vite** | Dev server, production bundle, static deploy |
| UI | **Lit** + **Web Awesome** | App custom elements (`<po-*>`) compose `<wa-*>` |
| State | **Effector** | Stores, events, derived units; Lit elements watch in `connectedCallback` |
| Language | **TypeScript** | Serializers, catalogs, validation |
| Styling | Web Awesome theme + utilities | No React, no JSX |

**Hard rule:** no React (or React wrappers). App UI is Lit custom elements; design system is Web Awesome:

```html
<po-wiring-page></po-wiring-page>
<wa-button variant="brand">Save</wa-button>
```

Effector is the source of truth; Lit elements subscribe on connect and unsubscribe on disconnect.

---

## Repository layout

All site source lives under **`website/`** (this directory):

```
website/
  PLAN.md                 ← this file
  README.md               ← quick start (after scaffold exists)
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  public/
    favicon.svg
    saber-hilt.svg          ← user-provided **100% vector** hilt for preview mock (Phase 5)
  src/
    main.ts               ← boot: Effector, router, WA component imports
    app.css               ← minimal app shell overrides
    router.ts             ← hash or path routes (#/wiring, #/presets, …)
    catalog/              ← static JSON (generated or hand-maintained)
      named-styles.json   ← from styles/style_parser.h (scripted sync)
      board-profiles.json ← Proffie V3 pin names, defaults
      colors.json         ← rgb_arg.h color names
      accent-styles.json  ← accent_* quick reference
    model/                ← plain TS types (no Effector here)
      blades.ts
      presets.ts
      style-sections.ts
      board.ts
    stores/               ← Effector
      project.ts          ← numBlades, board profile id
      wiring.ts
      presets.ts
      styleSections.ts
      boardFeatures.ts
      export.ts           ← derived: all generated file strings
    serialize/            ← model → INI text
      bladesIni.ts
      presetsIni.ts
      bladeStylesIni.ts
      boardIni.ts
      featuresIni.ts
      format.ts           ← headers, comments, indentation helpers
    parse/                ← Phase 3+: INI → model (best-effort)
      ...
    preview/              ← approximate strip renderers (no Effector; pure functions)
      layout.ts           ← measurePreviewLayout (responsive canvas + emitter; unit tested)
      composite.ts        ← blend + opacity (match config_layers_style.h math)
      frame.ts            ← RGBA[] for N pixels at time t
      registry.ts         ← style name → renderer + catalog arg mapping
      renderers/          ← one module per style/family; versioned, refinable
        stripes.ts
        fire.ts
        solid-gradient.ts
        overlay-events.ts
        ...
    ui/
      elements/           ← Lit `<po-*>` custom elements (extend PoElement)
        po-element.ts     ← Web Awesome discover(shadowRoot) + MutationObserver
        po-wiring-page.ts
        po-blade-card.ts
        po-power-pin-editor.ts
        po-pin-picker.ts
        po-shared-styles.ts
        pin-picker-utils.ts
      pages/              ← thin mount wrappers (insert Lit page elements)
        wiring-page.ts
        export-page.ts
      copy-panel.ts       ← INI preview + copy/download (Phase 1 export UI)
    validation/
      limits.ts           ← mirrors firmware caps (16 blades, 6 power pins, …)
  scripts/
    sync-named-styles.mjs ← optional: grep style_parser.h → catalog JSON
```

Built output: **`website/dist/`** (gitignored). Deploy as static files; no server required.

### Frontend-only data flow

```
User edits UI (Lit `<po-*>` + Web Awesome `<wa-*>`)
        ↓
Effector stores (in-memory)
        ↓
Serializers → INI strings ($export)
        ↓
Copy / Download / LocalStorage JSON   ← no network
```

Optional later backend (out of scope now): sync presets, hosted catalog, account storage.
Keep serializers and model types in plain TS modules so they can be reused server-side if needed.

---

## Documentation standards

Every new module under `website/src/` should include:

1. **File-level JSDoc** — `@module` tag, purpose, and links to firmware docs when relevant.
2. **Public function JSDoc** — params, return value, and non-obvious behavior (e.g. empty pin rows while editing).
3. **Directory README.md** — each major folder (`model/`, `stores/`, `ui/`, …) explains its role and files.
4. **Tests** — `*.test.ts` beside the module with a one-line file comment describing coverage.
5. **Root [README.md](./README.md)** — updated when adding scripts, routes, or phases.

Catalog JSON files are documented in [src/catalog/README.md](./src/catalog/README.md) (JSON has no comments).

---

## Effector store design

### `$project`

- `boardProfileId: string` (e.g. `proffie_v3`)
- `numBlades: number` (default **5**, matches [`config-files-config.h`](../config/config-files-config.h))
- `firmwareProfile: string` (informational: `config-files-config.h`)

### `$wiring`

- `blades: BladeDefinition[]` — index, type (`ws2811` | `simple`), data pin, pixels,
  power pins[], simple LED type, `active_state`

Events: `bladeAdded`, `bladeUpdated`, `bladeRemoved`, `applyProfileDefaults`

### `$presets`

- `presets: Preset[]` — font, track, name, variation, `styles: string[]` (length = numBlades)

Events: `presetAdded`, `presetUpdated`, `presetReordered`, `styleLineChanged`

### `$styleSections`

- `sections: Record<string, StyleSection>` — vars + layers + includes
- `activeSectionId: string | null`

Layer model:

```ts
type StyleLayer = {
  blend: 'normal' | 'multiply' | 'screen' | 'add';
  opacity: number;       // 0–32768, 32768 = omit opacity in export if normal opaque base
  style: string;         // "standard", "config foo", "multiply opacity …" parsed or structured
  args: string[];
};
```

Prefer **structured** layers in the store; serializer emits `layer = …` lines matching
[`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini).

### `$boardFeatures`

- `buttons: 1 | 2 | 3`
- `oled: boolean`
- `bluetooth: boolean`
- `gesture`, `twistOn`, `twistOff`: boolean

### `$export` (derived)

```ts
sample({
  clock: combine([$wiring, $presets, $styleSections, $boardFeatures]),
  fn: ([w, p, s, b]) => ({
    bladesIni: serializeBladesIni(w),
    presetsIni: serializePresetsIni(p, project.numBlades),
    bladeStylesIni: serializeBladeStylesIni(s),
    boardIni: serializeBoardIni(b),
    featuresIni: serializeFeaturesIni(b),
  }),
});
```

UI subscribes to `$export` and refreshes copy panels.

---

## UI pages (Web Awesome)

| Route | Components (examples) | Purpose |
|-------|----------------------|---------|
| **Wiring** | `wa-select`, `wa-input`, `wa-switch`, `wa-card` | Blade list editor, profile picker |
| **Presets** | `wa-tab-group`, `wa-button`, drag handles (native) | Preset list; per-blade style inputs |
| **Styles** | split pane, forms, canvas strip | Vars + layer stack + layer form + preview |
| **Board** | `wa-switch` | board.ini + features.ini fields |
| **Export** | `wa-tab-group`, `wa-textarea`, copy | All files, syntax-friendly text |

### Layer recipe editor UX (config INI only)

Goal: **minimal typing** — dropdowns, color pickers, selections, and validation.
Layout wireframes (e.g. Balsamiq) should define regions first; Web Awesome styling comes later.

**Styles page layout (conceptual):**

```
┌──────────────────┬──────────────────────────────┐
│ Section picker   │  Saber mock: [hilt SVG]══════  │  ← LED strip from emitter
│ Variables table  │  [Clash] [Lockup] [Swing] …  │
│ Layer stack      │  time scrubber (optional)    │
│  (reorder/add)   │                              │
├──────────────────┴──────────────────────────────┤
│ Selected layer form (style dropdown + fields)   │
└─────────────────────────────────────────────────┘
```

**Layer stack** — vertical `wa-card` rows, bottom = first layer (opaque base):

```
┌─────────────────────────────┐
│ real_clash white 16000      │  ← top (combat overlay)
├─────────────────────────────┤
│ multiply · stripes 8000 …   │
├─────────────────────────────┤
│ standard_bend blue …        │  ← base
└─────────────────────────────┘
```

Badge: blend mode + opacity when not `normal`/32768. Click row → edit in layer form.

**Layer form (per selected row):**

- **Style dropdown** — grouped: base blades, overlays, textures, preon/postoff, `config <section>`.
- **Dynamic fields** from `named-styles.json` arg schema (colors → picker mapped to `colors.json`
  names; ms/freq/width → number inputs; blend + opacity when applicable).
- **Structured export** — store structured args; serializer emits `layer = …` or
  `layer.<style>.<slot> = value` where firmware supports structured keys.
- **Validation (inline)** — wrong arg count; unresolved `{{name}}`; opaque-on-opaque without blend
  (warning); layer/section limits; preset `config` references missing section.

**Presets integration:**

- Per blade: built-in style vs **`config <section>`** section picker.
- Override tokens (`base=`, `clash=`, …) as form fields, not raw strings.

**Style line helpers**

- Named styles from `catalog/named-styles.json` (args schema + defaults + preview renderer id).
- Section picker for `config <section>` from `$styleSections` keys.
- Accent quick-picks from `catalog/accent-styles.json`.
- Optional **advanced** toggle: edit raw `layer =` line for styles without structured keys
  (e.g. some `preon_*` / `postoff_*`).

### Blade preview (approximate, refinable)

Preview answers: “Does this stack look roughly right before I copy INI to the SD card?”
**Roughly right is the target** — not HoldPeakF-perfect, not audio-reactive, not OS7-identical.

**Pipeline:**

```
StyleSection + wiring (pixel count)
        ↓
Resolve vars, palette, preset overrides, nested config sections
        ↓
Per-layer preview renderer (style name → simplified math)
        ↓
Composite layers (blend + opacity — faithful to firmware rules)
        ↓
Canvas LED strip + animation loop (aligned to hilt emitter)
        ↓
Optional event bus (clash / lockup / swing / ignition) → overlay renderers
```

**Saber mock (user-provided hilt SVG — 100% vector):**

The preview is not a bare pixel bar — a **cool-looking saber mock** composes:

1. **Static hilt** — **pure vector** SVG from the project author (`public/saber-hilt.svg`). Must scale cleanly at any preview pane size (mobile → desktop) with no pixelation.
2. **Dynamic blade** — canvas segment (or SVG `<rect>` strip) drawn from the hilt **emitter** outward; pixel colors from the preview pipeline.
3. **Alignment** — **emitter anchor** in the SVG (viewBox coordinates or a named `#emitter` / `data-emitter` marker) so the LED strip lines up regardless of hilt aspect ratio or CSS scale.

**Vector-only requirement (hilt asset):**

- **100% vector** — paths, shapes, gradients, strokes only. **No** embedded PNG/JPEG/WebP, `<image href="…">`, or raster filters.
- Use a proper **`viewBox`** (and optional `preserveAspectRatio`) so the mock scales via CSS width/height without fixed pixel dimensions.
- Inline the SVG in `<po-blade-preview>` shadow DOM (fetch + inject or Vite `?raw` import) — not a fixed-size bitmap. This keeps emitter coordinates readable and allows `currentColor` theming later.
- The **blade LED strip** may stay on canvas for animation performance; the **hilt must remain SVG** so only the colored pixels are rasterized, not the saber body.

Implementation sketch for `<po-blade-preview>`:

- Container: CSS-scaled SVG hilt + absolutely positioned canvas blade aligned to `#emitter`.
- Size mock to fit preview pane; scale blade length to pixel count (cap max width for UI).
- **Hilt is decorative only** — no interaction; all simulation stays on the blade segment.
- Fallback if asset missing: plain horizontal strip (dev-friendly).

**Responsive preview layout (viewport / pane scaling):**

The saber mock must reflow when the styles page or browser viewport changes — same pattern as wiring (`width: 100%`, no fixed pixel shell).

| Layer | Scaling rule |
|-------|----------------|
| **`<po-blade-preview>` host** | `display: block; width: 100%` — fills preview column on desktop, stacks full-width on mobile |
| **`.preview-mock` container** | `position: relative; width: 100%; max-width: min(100%, 48rem)` — grows/shrinks with pane |
| **Hilt SVG** | `width: 100%; height: auto; display: block` + author `viewBox` — vector scales, never fixed `width`/`height` attributes in HTML |
| **Canvas (blade)** | **CSS size** from layout math; **backing store** `canvas.width/height = cssSize × devicePixelRatio` for sharp pixels on retina |
| **Emitter alignment** | On every resize: read emitter anchor (SVG `#emitter` bbox or normalized coords) → set canvas `left`/`top`/`width`/`height` in CSS px |

**Do not** hard-code canvas `width="800" height="40"` in markup without syncing on resize — that breaks responsive layout.

**`<po-blade-preview>` lifecycle:**

1. **`ResizeObserver`** on `.preview-mock` (and optionally `window` `resize`) → call `measurePreviewLayout()` in [`preview/layout.ts`](src/preview/layout.ts).
2. Update canvas CSS box + backing store dimensions; reposition canvas over emitter.
3. Re-render current frame (same pixel simulation; only **display scale** changes — LED count unchanged).
4. **`disconnectedCallback`**: disconnect observer.

**Blade length vs pixel count:** simulation always uses `num_pixels` from wiring; on screen each LED is `bladeLengthCss / numPixels` wide (minimum 1 CSS px). If the pane is narrow, the mock shrinks; if wide, cap blade length so the hilt+blade mock does not dominate the page.

**Page grid:** styles page preview column uses CSS grid/flex with `min-width: 0` so the preview pane can shrink inside flex children (avoids overflow clipping on small viewports).

See [`src/preview/README.md`](src/preview/README.md) for the layout module API and canvas markup pattern.

**SVG author notes (for whoever draws the hilt):**

- **Vector only** — export from Illustrator/Inkscape/Figma as plain SVG; flatten to paths if needed; verify no raster embeds.
- Include a clear **blade exit / emitter** point (left or right edge of the “blade socket”).
- Optional: group id `emitter` or metadata attribute for anchor placement.
- Single-blade mock is enough for Phase 5; multi-blade / accent preview can reuse the same hilt with blade index selector later.

**Fidelity tiers (catalog-driven):**

| Tier | Styles | Preview approach |
|------|--------|------------------|
| **High** | Compositing | `normal` / `multiply` / `screen` / `add` + opacity 0–32768 — match [`config_layers_style.h`](../styles/config_layers_style.h) |
| **Medium** | `standard`, `rainbow`, `fire`, `gradient`, `strobe`, accents | Solid colors, hue cycle, 1D heat/noise, timed flash — readable motion |
| **Low (texture)** | `stripes`, `hard_stripes`, `fire_mask`, `noise_flicker`, `pixel_sequence`, `*_layer` textures | **Approximate the math the texture represents** (e.g. stripes → moving bands with soft/hard edges inspired by [`stripes.h`](../styles/stripes.h); fire_mask → rolling brightness zones). Refine per renderer later — v1 can be simple, v2+ closer to firmware semantics |
| **Low (OS7 recipes)** | `water_flow`, `fallen_order`, `darksaber`, … | Composite of sub-approximations (base color + stripe-like motion + optional noise). Label as approximate |

**Explicit non-goals for preview:** BladeAngle, HoldPeakF, audio/mic, exact StripesX/SlowNoise timing, WASM style engine.

**UI copy:** small note — “Preview uses simplified renderers” — so users know hardware may differ in detail.

**Catalog entry per style (extends `named-styles.json`):**

```ts
{
  "name": "stripes",
  "args": [ /* … */ ],
  "previewRenderer": "stripes",
  "previewTier": "texture",
  "previewVersion": 1
}
```

**Implementation order (preview sub-phases):**

1. Static strip — resolved base colors + layer swatches
2. Compositing — blend/opacity live as layers reorder
3. Animated idle — rainbow, fire, gradient, strobe
4. Event buttons — clash, lockup, swing overlays
5. Texture renderers — stripes, masks, noise (approximate math, iterative refinement)
6. Optional — swing slider, time scrubber, mic for `audio` style (later)

Preview module stays **pure TS** (no Effector); Lit `<po-blade-preview>` reads `$styleSections` +
`$wiring` and calls `preview/frame.ts`.

---

## Serializers (export format)

Match tone and headers of existing examples:

| File | SD path | Reference |
|------|---------|-----------|
| `bladesIni` | `config/blades.ini` | [`examples/config/blades.ini`](../examples/config/blades.ini), [`doc/blade_config.md`](../doc/blade_config.md) |
| `presetsIni` | `config/presets.ini` | [`examples/config/presets.ini`](../examples/config/presets.ini) |
| `bladeStylesIni` | `config/blade_styles.ini` | [`examples/config/blade_styles.ini`](../examples/config/blade_styles.ini), [`doc/blade_styles_config.md`](../doc/blade_styles_config.md) |
| `boardIni` | `config/board.ini` | [`examples/config/board.ini`](../examples/config/board.ini) |
| `featuresIni` | `config/features.ini` | [`examples/config/features.ini`](../examples/config/features.ini) |

Validation before export and **inline on the styles/presets pages** (warnings in UI):

- `numBlades` matches blade count in wiring and style lines per preset.
- Blade indices 0…N-1 contiguous (accent indices not skipped when using SD blades.ini).
- Layer opacity 0–32768; max layers per section (mirror `STYLE_CONFIG_MAX_LAYERS` in firmware).
- Pin names valid for selected board profile.
- Named style arg count matches catalog schema.
- Unresolved `{{variable}}` in layer strings.
- Stack warnings: opaque full-blade layer covering lower layers without blend/opacity.
- Preset `config <section>` references an existing section.

---

## Catalog sync (maintainability)

1. **`named-styles.json`** — script parses `styles/style_parser.h` `named_styles[]` names
   and help strings (or manual curated list updated on firmware changes).
2. **`board-profiles.json`** — pin name enums from `proffieboard_v3_config.h` (and future boards).
3. **`colors.json`** — from `styles/rgb_arg.h`.
4. Document in `website/README.md`: run `npm run sync-catalog` after adding named styles.

---

## Implementation phases

### Phase 1 — Scaffold + wiring + export (MVP)

- [x] Vite + TS + Web Awesome + Effector; `index.html` shell, hash router.
- [x] `$project`, `$wiring`, `$export` → `bladesIni` only.
- [x] Wiring page + Export copy panel.
- [x] Board profile: Proffie V3 defaults (bladePin, blade5Pin–7Pin, power pins).
- [ ] `npm run dev` / `npm run build` verified locally.

### Phase 2 — Presets + board/features

- [ ] `$presets`, `$boardFeatures`; serializers for presets, board, features.
- [ ] Presets page: N style lines, font/track/name.
- [ ] Board page: toggles matching examples.
- [ ] Export tab for all Phase 2 files.
- [ ] Validation warnings (blade count mismatch).

### Phase 3 — Layer recipes + forms + stack UI

- [ ] `$styleSections`: CRUD sections, vars, structured layers.
- [ ] Styles page: section picker, variables table, layer stack (reorder/add/remove).
- [ ] Layer form: style dropdown + dynamic fields from catalog (color pickers, numbers, blend/opacity).
- [ ] Inline validation (arg counts, vars, stack warnings, section limits).
- [ ] `bladeStylesIni` serializer (includes optional `include =` paths as strings).
- [ ] Preset integration: `style = config section` + override key=value forms.
- [ ] Optional raw `layer =` advanced mode for unsupported structured styles.

### Phase 4 — Quality of life (still frontend-only)

- [ ] Download zip (`config/` folder layout) — client-side (`JSZip` or similar), no upload.
- [ ] LocalStorage project persistence (Effector `persist` or manual JSON export/import).
- [ ] Best-effort INI import (parse layer lines into structured model) — file picker, no server.
- [ ] `sync-named-styles.mjs` dev/CI script — reads repo `style_parser.h`, writes local JSON.

### Phase 5 — Approximate blade preview

- [ ] `preview/` module: `composite.ts`, `frame.ts`, `registry.ts`.
- [ ] User-provided **`public/saber-hilt.svg`** integrated into preview mock (hilt + emitter-aligned blade).
- [ ] `preview/layout.ts` + tests — responsive canvas CSS vs backing store, emitter positioning.
- [ ] `<po-blade-preview>` — `ResizeObserver`, 100% width host, no fixed canvas attributes in HTML.
- [ ] Static + composited preview (blend/opacity faithful; layers reorder live).
- [ ] Idle renderers: `standard`, `rainbow`, `fire`, `gradient`, `strobe` (medium tier).
- [ ] Event simulation: clash, lockup, swing (overlay flash on demand).
- [ ] Texture renderers (low tier, approximate math): `stripes`, `hard_stripes`, `fire_mask`,
  `noise_flicker`, `pixel_sequence`, common `*_layer` textures — **v1 simple, refine later**
  (`previewVersion` in catalog).
- [ ] OS7-style full blades: composite sub-approximations + “simplified preview” label.
- [ ] Unit tests: compositing math; snapshot tests for a few renderer outputs.

### Phase 6 — Optional backend (deferred)

Only if product needs exceed browser-only workflow:

- [ ] Hosted static deploy (GitHub Pages / Cloudflare Pages) — still no API.
- [ ] Optional API for shared preset libraries, user accounts, or team configs.
- [ ] Keep frontend as primary editor; backend as sync/storage layer, not required to run app.

### Phase 7 — Optional advanced

- [ ] Preview refinement pass (texture/OS7 renderer versions, swing slider, time scrubber).
- [ ] Templates: “5-blade + 3 accent” wizard from [`examples/README.md`](../examples/README.md).
- [ ] Daughterboard note UI (GPIO accent / FET board) — documentation links only.
- [ ] Optional mic-driven `audio` style preview (low priority).

---

## Vite configuration notes

- **Root:** `website/`
- **Base:** `./` for relative paths (works opened from file:// or subpath hosting).
- **Build output:** `dist/`
- Import Web Awesome per-component for tree-shaking:

```ts
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
// …
```

- **No** `@vitejs/plugin-react`.

---

## Effector + Lit usage pattern

```ts
// stores/wiring.ts
export const bladeUpdated = createEvent<{ index: number; patch: Partial<BladeDefinition> }>();
export const $wiring = createStore<BladeDefinition[]>(defaultBlades)
  .on(bladeUpdated, (blades, { index, patch }) =>
    blades.map((b) => (b.index === index ? { ...b, ...patch } : b)),
  );

// ui/elements/po-wiring-page.ts (Lit)
connectedCallback() {
  this.blades = $wiring.getState();
  super.connectedCallback();
  this.unwatch = $wiring.watch((blades) => {
    this.blades = blades;
    this.requestUpdate();
  });
}
disconnectedCallback() {
  this.unwatch?.();
  super.disconnectedCallback();
}
```

Cross-blade power pin disables: `stores/power-pin-usage.ts` derives from `$wiring`; `<po-pin-picker>` registers refresh callbacks on connect.

Page mounts stay thin: `mountWiringPage(root)` appends `<po-wiring-page>` and returns cleanup.

---

## Testing strategy

- **Unit tests** (Vitest): serializers snapshot against golden strings from `examples/config/*.ini` subsets; model helpers (`power-pins.ts`); Lit elements via `.shadowRoot` (`po-power-pin-editor.test.ts`, `pin-picker-utils.test.ts`).
- **Validation tests:** edge cases (16 blades, 6 power pins, empty preset).
- **Preview tests:** compositing (`composite.ts`); golden RGBA snapshots for select renderers.
- **Manual:** copy generated files to SD card, verify firmware accepts (serial `list_named_styles`, boot logs); compare strip preview loosely to hardware.

---

## Documentation links (in-app)

- [`examples/README.md`](../examples/README.md) — accent styles, NUM_BLADES 4 layout.
- [`doc/blade_config.md`](../doc/blade_config.md) — blades.ini grammar.
- [`doc/blade_styles_config.md`](../doc/blade_styles_config.md) — layer blends, Fett263 SD recipes.

---

## Resolved / open decisions

| Decision | Choice (for now) | Rationale |
|----------|------------------|-----------|
| **Backend** | **None** | Test and explore in browser; add API later only if needed. |
| **Default template** | **Examples snapshot** (5-blade + accents) | Matches [`examples/config/`](../examples/config/); easier hardware validation. |
| **Routing** | **Hash** (`#/wiring`, `#/export`) | Works with static hosting, no server rewrite rules. |
| **Persistence** | LocalStorage + download | No cloud until backend phase. |
| **Web Awesome Pro** | Free / MIT components only | Revisit if Pro-only widgets are required. |
| **Repo CI** | Open | Optional `npm run build` in GitHub Actions. |
| **Blade preview fidelity** | **Approximate, refinable** | Style-informed simplified math + accurate compositing; not pixel-perfect or WASM engine. Texture/OS7 renderers improve incrementally via `previewVersion`. |
| **Style editor scope** | **Config INI only** | Forms → `$styleSections` → `blade_styles.ini` / preset `config` lines; no compilable C++ style generation. |
| **Preview hilt art** | **User-supplied 100% vector SVG** | Pure vector hilt scales with layout; canvas only for dynamic blade pixels. Emitter anchor + `viewBox`. Path: `public/saber-hilt.svg`. |

---

## Success criteria

- User can configure **5-blade + 3 accent** setup matching current examples without hand-editing INI.
- Generated `blades.ini` and `presets.ini` boot on hardware with `config-files-config.h` profile.
- Layer sections produce copy-pasteable `[section]` blocks consistent with firmware parser expectations.
- Styles page validates common layer mistakes before export; strip preview roughly matches stacked intent on hardware.
- **No React** in `package.json` dependencies or source tree.
