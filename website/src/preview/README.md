# Blade preview (approximate)

Pure TypeScript — no Effector, no DOM in render math. Lit `<po-blade-preview>` (Phase 5) calls into this folder.

## Modules

| File | Role |
|------|------|
| `layout.ts` | Horizontal saber mock geometry (legacy) |
| `vertical-layout.ts` | Upward saber: blade 15% hilt width, 3× height, above rotated hilt |
| `hilt-asset.ts` | Public URL for user hilt SVG |
| `composite.ts` | Layer blend + opacity (Phase 5) |
| `frame.ts` | Build RGBA[] for N pixels at time `t` (Phase 5) |
| `registry.ts` | Style name → renderer (Phase 5) |

## Responsive layout contract

The preview must scale when the viewport or styles-page pane resizes.

### DOM structure (inside `<po-blade-preview>` shadow root)

```html
<div class="preview-mock">
  <div class="preview-hilt" aria-hidden="true">
    <!-- inline SVG: width/height from viewBox only; CSS width 100% -->
  </div>
  <canvas class="preview-blade"></canvas>
</div>
```

### CSS (shadow DOM — e.g. `po-preview-styles.ts`)

```css
:host {
  display: block;
  width: 100%;
  min-width: 0;
}

.preview-mock {
  position: relative;
  width: 100%;
  max-width: min(100%, 48rem);
}

.preview-hilt svg {
  display: block;
  width: 100%;
  height: auto;
}

.preview-blade {
  position: absolute;
  /* left, top, width, height set from measurePreviewLayout() in JS */
  pointer-events: none;
}
```

### Canvas sizing (critical)

- **Never** rely on static `width`/`height` attributes in the template.
- **CSS** sets display size (layout pixels).
- **Backing store** sets bitmap resolution for sharp drawing:

```ts
const dpr = window.devicePixelRatio || 1;
canvas.style.width = `${layout.canvasCssWidth}px`;
canvas.style.height = `${layout.canvasCssHeight}px`;
canvas.width = Math.round(layout.canvasCssWidth * dpr);
canvas.height = Math.round(layout.canvasCssHeight * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

On `ResizeObserver` callback: remeasure → update canvas box → redraw last frame.

### Emitter anchor

Hilt SVG should expose `#emitter` (or normalized `{ x, y }` in 0–1 mock space). After the SVG lays out at CSS width:

1. Map emitter to CSS coordinates inside `.preview-mock`.
2. Place canvas origin at emitter; blade extends along +X (configurable later).
3. `bladeLengthCss = min(availableWidth, maxBladeCss)` where `availableWidth` is mock width minus hilt portion.

Simulation **pixel count** comes from wiring (`num_pixels`); **display** scales via `pixelCssWidth = bladeLengthCss / numPixels`.

## Tests

- `layout.test.ts` — container shrink/grow, DPR, pixel count, emitter position.
