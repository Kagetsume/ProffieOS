import { describe, expect, it } from 'vitest';
import {
  decodeStripColumnBmp,
  parseStripColumnLayerArgs,
  sampleStripColumnRgb,
} from './strip-column-bmp';

/** Minimal 2×2 24-bit BMP (frames_y: 2 blade px, 2 frames). */
function makeTestBmp2x2(): ArrayBuffer {
  const width = 2;
  const height = 2;
  const rowStride = 8;
  const pixelOffset = 54;
  const size = pixelOffset + rowStride * height;
  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4d);
  view.setUint32(2, size, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, pixelOffset, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  // Bottom row (frame 0 in frames_y): red, green
  let off = pixelOffset;
  bytes[off++] = 0;
  bytes[off++] = 0;
  bytes[off++] = 255;
  bytes[off++] = 0;
  bytes[off++] = 255;
  bytes[off++] = 0;
  bytes[off++] = 0;
  bytes[off++] = 0;
  // Top row (frame 1): blue, white
  off = pixelOffset + rowStride;
  bytes[off++] = 255;
  bytes[off++] = 0;
  bytes[off++] = 0;
  bytes[off++] = 255;
  bytes[off++] = 255;
  bytes[off++] = 255;
  bytes[off++] = 0;
  bytes[off++] = 0;
  return buf;
}

describe('strip-column-bmp', () => {
  it('parses layer args with optional frame axis', () => {
    expect(parseStripColumnLayerArgs(['animations/a.bmp', '144', '30', 'frames_y', '-1', '-1'])).toEqual({
      path: 'animations/a.bmp',
      sourceHeight: 144,
      fps: 30,
      frameAxis: 'frames_y',
    });
  });

  it('decodes frames_y flipbook', () => {
    const asset = decodeStripColumnBmp(makeTestBmp2x2(), 'frames_y');
    expect(asset.frameCount).toBe(2);
    expect(asset.bladePixels).toBe(2);
    expect(asset.frames[0]![2]).toBe(255);
    expect(asset.frames[1]![0]).toBe(255);
  });

  it('samples along blade with interpolation', () => {
    const asset = decodeStripColumnBmp(makeTestBmp2x2(), 'frames_y');
    const [, , b] = sampleStripColumnRgb(asset.frames[0]!, 2, 0, 4);
    expect(b).toBe(255);
  });
});
