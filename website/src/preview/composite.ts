/**
 * Layer compositing for approximate blade preview.
 *
 * @module preview/composite
 */
import type { LayerBlend } from '../model/style-sections';

export type Rgb = [number, number, number];

export type PixelBuffer = {
  r: number[];
  g: number[];
  b: number[];
  a: number[];
};

/** Allocate an empty RGBA buffer (alpha 0). */
export function createPixelBuffer(count: number): PixelBuffer {
  return {
    r: new Array<number>(count).fill(0),
    g: new Array<number>(count).fill(0),
    b: new Array<number>(count).fill(0),
    a: new Array<number>(count).fill(0),
  };
}

/** Fill buffer with a solid color at full alpha. */
export function fillSolid(buffer: PixelBuffer, color: Rgb): void {
  for (let i = 0; i < buffer.r.length; i += 1) {
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = 1;
  }
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function blendChannel(base: number, overlay: number, mode: LayerBlend): number {
  const b = base / 255;
  const o = overlay / 255;
  switch (mode) {
    case 'multiply':
      return clamp255(b * o * 255);
    case 'screen':
      return clamp255((1 - (1 - b) * (1 - o)) * 255);
    case 'add':
      return clamp255(base + overlay);
    default:
      return overlay;
  }
}

/**
 * Composite overlay onto base using firmware-like blend + opacity (0–32768).
 */
export function compositeLayer(
  base: PixelBuffer,
  overlay: PixelBuffer,
  blend: LayerBlend,
  opacity: number,
): void {
  const alpha = Math.max(0, Math.min(1, opacity / 32768));
  const count = base.r.length;

  for (let i = 0; i < count; i += 1) {
    const overlayAlpha = overlay.a[i] * alpha;
    if (overlayAlpha <= 0) {
      continue;
    }

    if (blend === 'normal' && overlayAlpha >= 0.999) {
      base.r[i] = overlay.r[i]!;
      base.g[i] = overlay.g[i]!;
      base.b[i] = overlay.b[i]!;
      base.a[i] = 1;
      continue;
    }

    const br = blendChannel(base.r[i]!, overlay.r[i]!, blend);
    const bg = blendChannel(base.g[i]!, overlay.g[i]!, blend);
    const bb = blendChannel(base.b[i]!, overlay.b[i]!, blend);

    base.r[i] = clamp255(base.r[i]! * (1 - overlayAlpha) + br * overlayAlpha);
    base.g[i] = clamp255(base.g[i]! * (1 - overlayAlpha) + bg * overlayAlpha);
    base.b[i] = clamp255(base.b[i]! * (1 - overlayAlpha) + bb * overlayAlpha);
    base.a[i] = Math.max(base.a[i]!, overlayAlpha);
  }
}
