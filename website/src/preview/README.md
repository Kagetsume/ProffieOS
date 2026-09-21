# Blade preview (approximate)

Pure TypeScript — no Effector, no DOM in render math. Lit `<po-blade-preview>` (on the Styles page) calls into this folder.

**Important:** Preview output is an **approximation** of firmware blade styles, not a pixel-accurate emulator. Recipe concepts and INI examples: [BLADE_STYLES.md](../../BLADE_STYLES.md).

## Modules

| File | Role |
|------|------|
| `simulation.ts` | Preview sim state: lockup, drag, blast, LB, melt, clock |
| `frame.ts` | Composite all layers → RGBA pixel buffer for one frame |
| `composite.ts` | Layer blend + opacity |
| `colors.ts` | Resolve style color tokens to RGB |
| `renderers/basic.ts` | Base styles (solid, gradient, audio, etc.) |
| `renderers/overlays.ts` | Overlay effects (clash, lockup, swing, …) |
| `vertical-layout.ts` | Upward saber geometry: hilt + blade canvas placement |
| `layout.ts` | Horizontal saber mock geometry (legacy) |
| `hilt-asset.ts` | Public URL for hilt SVG |
| `responsive-lockup.ts` | Lockup overlay positioning helpers |

## Data flow

1. `$styleSections` → active section layers + vars
2. `$previewSim` → effect simulation state
3. `renderStylePreview()` → pixel buffer
4. `<po-blade-preview>` → canvas draw + ResizeObserver

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

Simulation **pixel count** comes from wiring (`pixels` on blade 0 by default); **display** scales via CSS layout.

## Tests

| File | Covers |
|------|--------|
| `layout.test.ts` | Container shrink/grow, DPR, pixel count |
| `vertical-layout.test.ts` | Vertical saber geometry |
| `frame.test.ts` | Layer compositing |
| `simulation.test.ts` | Sim state transitions |
| `responsive-lockup.test.ts`, `lockup-overlay.test.ts` | Lockup overlay layout |
