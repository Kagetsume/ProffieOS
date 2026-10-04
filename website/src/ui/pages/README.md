# UI pages

Thin route mount wrappers registered in `main.ts`. Each exports:

```ts
function mountXPage(root: HTMLElement): () => void
```

| Page | Route | Implementation |
|------|-------|----------------|
| `home-page.ts` | `#/home` | `<lb-home-page>` |
| `board-page.ts` | `#/board` | `<lb-board-page>` |
| `features-page.ts` | `#/features` | `<lb-features-page>` |
| `wiring-page.ts` | `#/blades` | `<lb-wiring-page>` (alias `#/wiring`) |
| `styles-page.ts` | `#/styles` | `<lb-styles-page>` |
| `presets-page.ts` | `#/presets` | `<lb-presets-page>` |
| `export-page.ts` | `#/export` | Imperative shell + `$export` watch + copy panels |

Shared helpers live in `mount-page.ts` (`mountCustomElementPage`, `mountConfigStubPage`).

Route metadata (labels, SD paths, stub flags) is in `route-config.ts`.
