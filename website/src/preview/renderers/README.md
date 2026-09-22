# Preview renderers

Approximate per-style pixel generators used by `renderStylePreview()` in `frame.ts`. Each renderer returns an RGBA buffer for one layer; `composite.ts` blends layers bottom → top.

Parent overview: [../README.md](../README.md).

## Files

| File | Role |
|------|------|
| `basic.ts` | Base blades (`solid`, `standard`, `fire`, …), generic textures, routes OS7 layers |
| `os7-layers.ts` | Fett263 OS7 `*_layer` textures and monolithic OS7 bases |
| `overlays.ts` | Event overlays (clash, blast, lockup, preon/postoff, `force_glow`, …) |

## Routing

`renderLayerPixels()` in `basic.ts` is the single entry for one layer:

1. **Overlay phase** — if `overlayPhaseForStyle()` matches, delegate to `renderEventOverlay()` in `overlays.ts` when the sim phase is active.
2. **Base / texture** — switch on `styleName`; OS7 `*_layer` styles call `renderOs7TextureLayer()` in `os7-layers.ts`.

Capability gating for preview UI buttons lives in `../preview-capabilities.ts` (not here).

## Debugging

- **UI actions** — `contextLogger` in `<po-blade-preview>` (`onBlast`, `onPowerOn`, …).
- **Sim transitions** — `contextLogger` in `simulation.ts` (`previewPowerOn`, `previewTriggerEvent`, …).
- **Store events** — `contextLogger` in `stores/previewEvents.ts` `event.watch` callbacks.
- Do **not** log inside per-frame render loops or `renderStylePreview()` — use DevTools performance tab instead.

## Tests

| File | Covers |
|------|--------|
| `basic.test.ts` | Base styles, textures, lockup on standard |
| `os7-layers.test.ts` | OS7 layer renderers |
| `overlays.test.ts` | Clash/blast/preon/postoff/force |
| `composable-preview.test.ts` | Full composable checklist coverage |
