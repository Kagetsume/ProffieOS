/**
 * strip_column / strip_column_mask preview rendering.
 *
 * @module preview/renderers/strip-column
 */
import { getBmpAsset } from '../../stores/bmpAssets';
import { createPixelBuffer, type PixelBuffer } from '../composite';
import {
  maskLuminance,
  parseStripColumnLayerArgs,
  sampleStripColumnRgb,
} from '../strip-column-bmp';

function placeholderBuffer(count: number): PixelBuffer {
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    buffer.r[i] = Math.round(20 + t * 40);
    buffer.g[i] = Math.round(30 + t * 50);
    buffer.b[i] = Math.round(60 + t * 80);
    buffer.a[i] = 0.35;
  }
  return buffer;
}

/**
 * Render strip_column base or strip_column_mask texture at timeMs.
 *
 * @param mask When true, output grayscale luminance for multiply blends.
 */
export function renderStripColumnLayer(
  args: string[],
  count: number,
  timeMs: number,
  mask: boolean,
): PixelBuffer {
  const parsed = parseStripColumnLayerArgs(args);
  const asset = getBmpAsset(parsed.path);
  if (!asset || asset.frames.length === 0) {
    return placeholderBuffer(count);
  }

  const frameMs = 1000 / Math.max(1, parsed.fps);
  const frameIndex = Math.floor(timeMs / frameMs) % asset.frameCount;
  const frameRgb = asset.frames[frameIndex]!;
  const sourceHeight = Math.min(parsed.sourceHeight, asset.bladePixels);

  const buffer = createPixelBuffer(count);
  for (let led = 0; led < count; led += 1) {
    const [r, g, b] = sampleStripColumnRgb(frameRgb, sourceHeight, led, count);
    if (mask) {
      const gray = maskLuminance(r, g, b);
      buffer.r[led] = gray;
      buffer.g[led] = gray;
      buffer.b[led] = gray;
    } else {
      buffer.r[led] = r;
      buffer.g[led] = g;
      buffer.b[led] = b;
    }
    buffer.a[led] = 1;
  }
  return buffer;
}
