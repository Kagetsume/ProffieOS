# UI pages



Thin route mount wrappers registered in `main.ts`. Each exports:



```ts

function mountXPage(root: HTMLElement): () => void

```



| Page | Route | Implementation |

|------|-------|------------------|

| `wiring-page.ts` | `#/wiring` | Inserts `<po-wiring-page>` (Lit; subscribes to `$wiring`, `$boardProfileId` internally) |

| `export-page.ts` | `#/export` | Imperative HTML shell + `$export` watch + `copy-panel` |



Phase 2+ will add preset/style/board pages as Lit elements with the same mount pattern.


