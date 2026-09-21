# ProffieOS SD Config Editor

Browser-based editor for ProffieOS SD card config files. Generates formatted INI text you can copy or download — no firmware flashing, no serial connection.

| SD file | Status in editor |
|---------|------------------|
| `config/board.ini` | **Ready** — buttons, OLED, Bluetooth |
| `config/features.ini` | **Ready** — gesture, twist on/off |
| `config/blades.ini` | **Ready** — NeoPixel + simple accents, power/data pins, sub-blades |
| `config/blade_styles.ini` | **Ready** — layer recipes, color pickers, live preview |
| `config/presets.ini` | **Ready** — font, track, name, style lines per blade |

## Architecture

**Frontend-only.** No backend, API, database, or auth. All state lives in [Effector](https://effector.dev/) stores in the browser. Persistence is via copy/download (LocalStorage planned).

```
Lit custom elements (<po-*>) + Web Awesome (<wa-*>)
        ↓
Effector stores (in-memory)
        ↓
Serializers → INI strings
        ↓
Copy / Download
```

See **[PLAN.md](./PLAN.md)** for roadmap notes and **[src/README.md](./src/README.md)** for source layout.

## Tech stack

| Layer | Choice | Notes |
|-------|--------|--------|
| Build | [Vite](https://vite.dev/) | Dev server + static `dist/` output |
| UI | [Lit](https://lit.dev/) + [Web Awesome](https://webawesome.com/) | App `<po-*>` elements compose `<wa-*>` |
| State | [Effector](https://effector.dev/) | Stores/events; Lit watches in `connectedCallback` |
| Language | TypeScript | Models, serializers, validation |
| Tests | Vitest + jsdom | Pure model/serialize tests + Lit element tests |

**Hard rule:** no React, Vue, or other UI frameworks.

## Quick start

```bash
cd website
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

| Route | Purpose |
|-------|---------|
| `#/blades` | Wiring — NeoPixel strips, simple PWM accents, sub-blade ranges |
| `#/styles` | Layer recipes + approximate blade preview |
| `#/board`, `#/features` | Hardware and feature toggles |
| `#/export` | Copy/download generated INI files |

Legacy hash `#/wiring` redirects to `#/blades`.

You cannot open `index.html` directly (`file://`); Vite must compile and serve the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck (`tsc`) + production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally (production smoke test) |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests + V8 coverage report (`coverage/` HTML + terminal summary) |

Deploy `dist/` to any static host (GitHub Pages, Cloudflare Pages, etc.).

## Project layout

```
website/
  BLADES.md            Blades wiring guide (examples + use cases)
  BLADE_STYLES.md      Blade style recipes guide (layers, examples)
  PLAN.md              Implementation roadmap (historical + future)
  README.md            This file
  index.html           App shell
  vite.config.ts       Vite + Vitest config
  src/
    README.md          Source architecture
    main.ts            Boot: styles, routes, router
    route-config.ts    Sidebar routes + SD file metadata
    router.ts          Hash-based client router
    model/             Plain TS types + pure helpers
    stores/            Effector stores
    serialize/         Model → INI text
    catalog/           Static JSON (pins, colors, styles, profiles)
    validation/        Firmware limit constants
    preview/           Approximate blade preview math (no DOM)
    ui/                Lit elements, page mounts, export panel
```

## Reference material

Firmware and example configs this editor targets:

- **[BLADES.md](./BLADES.md)** — blades guide: types, examples, sub-blades, accents, presets
- **[BLADE_STYLES.md](./BLADE_STYLES.md)** — layer recipes: base/overlay, blends, build-from examples
- [`examples/config/`](../examples/config/) — example INI files
- [`examples/README.md`](../examples/README.md) — accent styles and NUM_BLADES 5 layout
- [`doc/blade_config.md`](../doc/blade_config.md) — firmware parser grammar
- [`config/proffieboard_v3_config.h`](../config/proffieboard_v3_config.h) — pin name source

## Feature summary

### Blades (`config/blades.ini`)

- NeoPixel (`ws2811`) and simple PWM (`type = simple`)
- **Data pin** dropdown with board silkscreen labels (`bladePin`, `blade5Pin`, …)
- **Power pin** editor (up to 6 FET pins, cross-blade duplicate prevention)
- **Sub-blades** — split one strip into logical segments (`sub_blade = first, last`)
- Read-only **board pin (silkscreen)** derived from selected data pin
- Optional user **note** exported as `#` comment
- Logical blade count hint for matching `NUM_BLADES` / preset `style =` lines

### Blade styles (`config/blade_styles.ini`)

- Section/layer stack editor with style catalog and color pickers
- Recipe library starters (`smoke_blade`, `water_blade`, …) from bundled catalog
- Section variables (`{{base}}`, …) and preset override hints
- Approximate live preview on `<po-blade-preview>` (not firmware-accurate)
- Collapsible help on the Styles page → [BLADE_STYLES.md](./BLADE_STYLES.md)

### Presets (`config/presets.ini`)

- Preset list: font, track, name, variation, optional note
- One **style line editor** per logical blade (named style, config recipe, or custom)
- Style line count syncs when wiring / sub-blades change
- Six starter presets (cyan, red, rainbow strobe, magenta vars, smoke, fire blast)

### Export

- `blades.ini`, `blade_styles.ini`, `presets.ini`, `board.ini`, `features.ini` — live from stores
