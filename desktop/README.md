# LayerBlade desktop (Tauri 2)

Native shell for the [`website/`](../website/) LayerBlade editor. The UI is the same Vite build as the browser app; the desktop build adds saber (SD) folder pick and safe read/write under that root.

## Prerequisites

- [Node.js](https://nodejs.org/) (same as `website/`)
- [Rust](https://www.rust-lang.org/tools/install) (stable) — **required** for `tauri dev` / `tauri build` and for `cargo check` in `src-tauri/`
- Windows: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually already installed on Windows 10/11)

### Verify Rust

```bash
rustc --version
cargo --version
```

If those commands are not found, install Rust from [rustup.rs](https://rustup.rs/) and reopen your terminal. Icon generation (`npm run tauri icon …`) only needs Node; compiling the shell needs Rust.

**Scaffold check (Oct 2025):** bundle icons were generated under `src-tauri/icons/` from `website/public/favicon.svg`. `cargo check` / `npm run build` were **not** run on the agent machine because Rust was not on `PATH`. After installing Rust locally:

```bash
cd desktop/src-tauri && cargo check
cd .. && npm run build
```

## Development

### Option A — live Vite (recommended)

1. Install deps:

   ```bash
   cd website && npm install
   cd ../desktop && npm install
   ```

2. From `desktop/`:

   ```bash
   npm run dev
   ```

   Tauri runs `npm run dev --prefix ../website` and loads `http://localhost:5173`.

### Option B — bundled `website/dist`

1. Build the frontend (see note below on TypeScript):

   ```bash
   cd website
   npm run build
   # or, to skip `tsc` while iterating: npx vite build
   ```

2. From `desktop/`:

   ```bash
   npm run tauri dev -- --no-dev-server
   ```

   (Exact flag name may vary by CLI version; if unsupported, ensure `website/dist` exists and stop any dev server so Tauri falls back to `frontendDist`.)

## Production build

```bash
cd website && npm run build
cd ../desktop && npm run build
```

Artifacts land under `desktop/src-tauri/target/release/bundle/`.

## Saber storage (v1)

| Layer | Role |
| --- | --- |
| `website/src/platform/` | `SaberStorage` port, browser stub, Tauri bridge |
| `desktop/src-tauri/src/saber_storage.rs` | `set_root`, `get_root`, `pick_folder`, `read_text`, `write_text` with path traversal checks |

In the desktop app, open **Export** → **Open saber folder**, then **Write blade_styles.ini** to prove read/write of `config/blade_styles.ini`.

## Icons

Bundle icons live in `src-tauri/icons/`. Regenerate from the site favicon after Rust is installed:

```bash
cd desktop
npm run tauri icon ../website/public/favicon.svg
```

## Frontend build note

`website` `npm run build` currently runs `tsc && vite build`. If `tsc` fails on unrelated errors, use `npx vite build` to produce `dist/` for Tauri until those issues are fixed.
