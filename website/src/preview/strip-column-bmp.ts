/**
 * Browser-side 24-bit BI_RGB BMP decode for strip_column preview (matches firmware rules).
 *
 * @module preview/strip-column-bmp
 */

export type StripColumnFrameAxis = 'frames_y' | 'frames_x';

export type StripColumnBmpAsset = {
  frameAxis: StripColumnFrameAxis;
  /** Blade span in BMP pixels (width for frames_y, |height| for frames_x). */
  bladePixels: number;
  frameCount: number;
  /** One RGB row/column per frame (length bladePixels * 3). */
  frames: Uint8Array[];
};

export type ParsedStripColumnArgs = {
  path: string;
  sourceHeight: number;
  fps: number;
  frameAxis: StripColumnFrameAxis;
};

const FRAME_AXIS_TOKENS_Y = new Set(['frames_y', 'row', 'rows']);
const FRAME_AXIS_TOKENS_X = new Set(['frames_x', 'column', 'columns']);

function isFrameAxisToken(tok: string): boolean {
  const lower = tok.toLowerCase();
  return FRAME_AXIS_TOKENS_Y.has(lower) || FRAME_AXIS_TOKENS_X.has(lower);
}

function parseFrameAxisToken(tok: string): StripColumnFrameAxis | null {
  const lower = tok.toLowerCase();
  if (FRAME_AXIS_TOKENS_X.has(lower)) {
    return 'frames_x';
  }
  if (FRAME_AXIS_TOKENS_Y.has(lower)) {
    return 'frames_y';
  }
  return null;
}

/** Resolve path, source_height, fps, optional frame axis from layer args. */
export function parseStripColumnLayerArgs(args: string[]): ParsedStripColumnArgs {
  const path = (args[0] ?? '').trim().replace(/^["']|["']$/g, '');
  const sourceHeight = Number.parseInt(args[1] ?? '144', 10) || 144;
  const fps = Number.parseInt(args[2] ?? '30', 10) || 30;
  let frameAxis: StripColumnFrameAxis = 'frames_y';
  if (args[3] && isFrameAxisToken(args[3])) {
    frameAxis = parseFrameAxisToken(args[3]) ?? 'frames_y';
  }
  return { path, sourceHeight, fps, frameAxis };
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function readI32(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}

/**
 * Parse an uncompressed 24-bit BMP into flipbook frames.
 *
 * @throws on invalid or unsupported BMP
 */
export function decodeStripColumnBmp(
  buffer: ArrayBuffer,
  preferredAxis: StripColumnFrameAxis = 'frames_y',
): StripColumnBmpAsset {
  const view = new DataView(buffer);
  if (buffer.byteLength < 54) {
    throw new Error('BMP too small');
  }
  if (view.getUint8(0) !== 0x42 || view.getUint8(1) !== 0x4d) {
    throw new Error('Not a BMP file');
  }
  const pixelOffset = readU32(view, 10);
  const dibSize = readU32(view, 14);
  if (dibSize < 40) {
    throw new Error('Unsupported DIB header');
  }
  const width = readI32(view, 18);
  const heightRaw = readI32(view, 22);
  const planes = readU16(view, 26);
  const bitCount = readU16(view, 28);
  const compression = readU32(view, 30);
  if (width <= 0 || planes !== 1 || bitCount !== 24 || compression !== 0) {
    throw new Error('Need 24-bit uncompressed BMP');
  }

  const topDown = heightRaw < 0;
  const absHeight = Math.abs(heightRaw);
  const rowStride = Math.floor((width * 3 + 3) / 4) * 4;

  let frameAxis = preferredAxis;
  let bladePixels: number;
  let frameCount: number;
  if (frameAxis === 'frames_y') {
    bladePixels = width;
    frameCount = absHeight;
  } else {
    bladePixels = absHeight;
    frameCount = width;
  }
  if (frameCount < 1 || bladePixels < 1) {
    throw new Error('Empty BMP dimensions');
  }

  const bytes = new Uint8Array(buffer);
  const frames: Uint8Array[] = [];

  if (frameAxis === 'frames_y') {
    for (let frame = 0; frame < frameCount; frame += 1) {
      const fileRow = topDown ? frame : absHeight - 1 - frame;
      const rowOff = pixelOffset + fileRow * rowStride;
      const rgb = new Uint8Array(bladePixels * 3);
      for (let x = 0; x < bladePixels; x += 1) {
        const px = rowOff + x * 3;
        rgb[x * 3] = bytes[px + 2]!;
        rgb[x * 3 + 1] = bytes[px + 1]!;
        rgb[x * 3 + 2] = bytes[px]!;
      }
      frames.push(rgb);
    }
  } else {
    for (let frame = 0; frame < frameCount; frame += 1) {
      const rgb = new Uint8Array(bladePixels * 3);
      for (let y = 0; y < bladePixels; y += 1) {
        const fileRow = topDown ? y : absHeight - 1 - y;
        const rowOff = pixelOffset + fileRow * rowStride;
        const px = rowOff + frame * 3;
        rgb[y * 3] = bytes[px + 2]!;
        rgb[y * 3 + 1] = bytes[px + 1]!;
        rgb[y * 3 + 2] = bytes[px]!;
      }
      frames.push(rgb);
    }
  }

  return { frameAxis, bladePixels, frameCount, frames };
}

/** Normalize SD path for asset lookup. */
export function normalizeBmpPath(path: string): string {
  return path.trim().replace(/^["']|["']$/g, '').replace(/\\/g, '/').toLowerCase();
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Sample one blade column at LED index (hilt = 0), linear RGB. */
export function sampleStripColumnRgb(
  frameRgb: Uint8Array,
  bladePixels: number,
  ledIndex: number,
  ledCount: number,
): [number, number, number] {
  if (bladePixels <= 1 || ledCount <= 1) {
    return [frameRgb[0] ?? 0, frameRgb[1] ?? 0, frameRgb[2] ?? 0];
  }
  const pos = (ledIndex / (ledCount - 1)) * (bladePixels - 1);
  const i0 = Math.floor(pos);
  const i1 = Math.min(bladePixels - 1, i0 + 1);
  const frac = pos - i0;
  const o0 = i0 * 3;
  const o1 = i1 * 3;
  return [
    lerpChannel(frameRgb[o0]!, frameRgb[o1]!, frac),
    lerpChannel(frameRgb[o0 + 1]!, frameRgb[o1 + 1]!, frac),
    lerpChannel(frameRgb[o0 + 2]!, frameRgb[o1 + 2]!, frac),
  ];
}

export function maskLuminance(r: number, g: number, b: number): number {
  return Math.round((r + g + b) / 3);
}
