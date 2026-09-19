# ProffieOS SD Config Editor

Browser-based editor for ProffieOS SD card config files. Generates formatted INI text you can copy or download — no firmware flashing, no serial connection.

| SD file | Status in editor |
|---------|------------------|
| `config/blades.ini` | **Phase 1** — wiring wizard |
| `config/presets.ini` | Planned (Phase 2) |
| `config/blade_styles.ini` | Planned (Phase 3) |
| `config/board.ini` | Planned (Phase 2) |
| `config/features.ini` | Planned (Phase 2) |

## Architecture

**Frontend-only.** No backend, API, database, or auth. All state lives in [Effector](https://effector.dev/) stores in the browser. Persistence is via copy/download (LocalStorage planned in Phase 4).

```
Lit custom elements (<po-*>) + Web Awesome (<wa-*>)
        ↓
Effector stores (in-memory)
        ↓
Serializers → INI strings
        ↓
Copy / Download
```

See **[PLAN.md](./PLAN.md)** for phased roadmap and **[src/README.md](./src/README.md)** for source layout.

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

- **Wiring** — edit blade definitions (NeoPixel + simple accents, power pins).
- **Export** — preview, copy, or download `blades.ini`.

You cannot open `index.html` directly (`file://`); Vite must compile and serve the app.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Typecheck (`tsc`) + production bundle → `dist/` |
| `npm run preview` | Serve `dist/` locally (production smoke test) |
| `npm test` | Run unit tests once |
| `npm run test:watch` | Run tests in watch mode |

Deploy `dist/` to any static host (GitHub Pages, Cloudflare Pages, etc.).

## Project layout

```
website/
  PLAN.md              Implementation roadmap
  README.md            This file
  index.html           App shell
  vite.config.ts       Vite + Vitest config
  src/
    README.md          Source architecture
    main.ts            Boot: styles, routes, router
    router.ts          Hash-based client router
    model/             Plain TS types + pure helpers
    stores/            Effector stores
    serialize/         Model → INI text
    catalog/           Static JSON (board pins, profiles)
    validation/        Firmware limit constants
    ui/                Lit elements, thin page mounts, export panel
```

## Reference material

Firmware and example configs this editor targets:

- [`examples/config/`](../examples/config/) — example INI files
- [`examples/README.md`](../examples/README.md) — accent blade layout (NUM_BLADES 5)
- [`doc/blade_config.md`](../doc/blade_config.md) — `blades.ini` grammar
- [`config/proffieboard_v3_config.h`](../config/proffieboard_v3_config.h) — pin name source

## Current status (Phase 1)

- [x] Vite + Lit + Web Awesome + Effector scaffold
- [x] Wiring page (`<po-wiring-page>`, blade cards, NeoPixel vs simple)
- [x] Power pin picker (select + custom, cross-blade duplicate prevention via Effector)
- [x] `PoElement` base — Web Awesome `discover(shadowRoot)` + MutationObserver
- [x] `blades.ini` serializer + export panel
- [x] Unit tests for power-pin logic, Lit editors, and export
- [ ] Presets, styles, board/features (later phases)
