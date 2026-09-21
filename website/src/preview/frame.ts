/**
 * Composite a style section into one preview frame.
 *
 * @module preview/frame
 */
import type { StyleSection } from '../model/style-sections';
import { sectionHasDedicatedLockupLayer } from '../model/style-sections';
import { clipOverlayToBaseLit, compositeLayer, createPixelBuffer, type PixelBuffer } from './composite';
import { renderLayerPixels } from './renderers/basic';
import type { PreviewSimState } from './simulation';
import { bladeLengthFraction, createInitialPreviewSim } from './simulation';

export type StylePreviewFrame = {
  pixels: PixelBuffer;
  pixelCount: number;
  lengthFraction: number;
};

/**
 * Render all layers bottom → top for one section at time `timeMs`.
 */
export function renderStylePreview(
  section: StyleSection,
  pixelCount: number,
  timeMs: number,
  sim: PreviewSimState = createInitialPreviewSim(),
): StylePreviewFrame {
  const count = Math.max(1, pixelCount);
  const pixels = createPixelBuffer(count);

  const dedicatedLockupLayer = sectionHasDedicatedLockupLayer(section);
  for (let layerIndex = 0; layerIndex < section.layers.length; layerIndex += 1) {
    const layer = section.layers[layerIndex]!;
    const overlay = renderLayerPixels(layer, section.vars, count, timeMs, sim, {
      dedicatedLockupLayer,
    });
    if (overlay.r.length !== count) {
      continue;
    }
    if (layerIndex > 0) {
      clipOverlayToBaseLit(overlay, pixels);
    }
    compositeLayer(pixels, overlay, layer.blend, layer.opacity);
  }

  const lengthFraction = bladeLengthFraction(sim, timeMs);
  applyBladeLengthMask(pixels, lengthFraction);

  return { pixels, pixelCount: count, lengthFraction };
}

/** Hide pixels above the current extend/retract length (index 0 = hilt). */
export function applyBladeLengthMask(pixels: PixelBuffer, fraction: number): void {
  const count = pixels.r.length;
  const lit = Math.max(0, Math.min(count, Math.ceil(count * fraction)));
  for (let i = lit; i < count; i += 1) {
    pixels.r[i] = 0;
    pixels.g[i] = 0;
    pixels.b[i] = 0;
    pixels.a[i] = 0;
  }
}
