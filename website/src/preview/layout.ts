/**
 * Responsive geometry for the saber preview mock (hilt SVG + canvas blade).
 *
 * Pure functions — no DOM. {@link measurePreviewLayout} is called from
 * `<po-blade-preview>` on mount and on `ResizeObserver` callbacks.
 *
 * @module preview/layout
 */

/** Normalized emitter position in the mock box (0–1), before CSS scaling. */
export type EmitterAnchor = {
  /** 0 = left edge of mock, 1 = right */
  x: number;
  /** 0 = top, 1 = bottom */
  y: number;
};

export type MeasurePreviewLayoutOptions = {
  /** `.preview-mock` client width (CSS px). */
  containerWidth: number;
  /** `.preview-mock` client height if known; 0 = derive from aspect ratio. */
  containerHeight: number;
  /** LED count from wiring — simulation length, not display cap. */
  pixelCount: number;
  /** Emitter in mock-normalized coordinates (from SVG `#emitter` or default). */
  emitter: EmitterAnchor;
  /** `window.devicePixelRatio` (default 1). */
  devicePixelRatio?: number;
  /** Max blade segment length in CSS px (UI cap). */
  maxBladeCssLength?: number;
  /** Blade strip thickness in CSS px. */
  bladeThicknessCss?: number;
  /** Mock aspect ratio width/height when height is unknown (matches hilt viewBox). */
  mockAspectRatio?: number;
};

export type PreviewLayout = {
  mockCssWidth: number;
  mockCssHeight: number;
  canvasCssLeft: number;
  canvasCssTop: number;
  canvasCssWidth: number;
  canvasCssHeight: number;
  canvasBackingWidth: number;
  canvasBackingHeight: number;
  devicePixelRatio: number;
  /** Display width of one LED on the canvas (CSS px). */
  pixelCssWidth: number;
  bladeLengthCss: number;
};

const DEFAULT_MAX_BLADE = 640;
const DEFAULT_BLADE_THICKNESS = 12;
const DEFAULT_ASPECT = 4; // wide horizontal mock (w:h = 4:1)

/**
 * Compute canvas CSS box and backing-store size for the blade strip.
 * Call again whenever the preview container resizes.
 */
export function measurePreviewLayout(options: MeasurePreviewLayoutOptions): PreviewLayout {
  const {
    containerWidth,
    containerHeight,
    pixelCount,
    emitter,
    devicePixelRatio = 1,
    maxBladeCssLength = DEFAULT_MAX_BLADE,
    bladeThicknessCss = DEFAULT_BLADE_THICKNESS,
    mockAspectRatio = DEFAULT_ASPECT,
  } = options;

  const mockCssWidth = Math.max(0, containerWidth);
  const mockCssHeight =
    containerHeight > 0 ? containerHeight : mockCssWidth / mockAspectRatio;

  const emitterX = clamp(emitter.x, 0, 1) * mockCssWidth;
  const emitterY = clamp(emitter.y, 0, 1) * mockCssHeight;

  const availableBlade = Math.max(0, mockCssWidth - emitterX);
  const bladeLengthCss =
    pixelCount > 0
      ? Math.min(availableBlade, maxBladeCssLength)
      : Math.min(availableBlade, maxBladeCssLength);

  const pixelCssWidth =
    pixelCount > 0 ? Math.max(1, bladeLengthCss / pixelCount) : bladeLengthCss;

  const canvasCssWidth = pixelCount > 0 ? pixelCssWidth * pixelCount : bladeLengthCss;
  const canvasCssHeight = bladeThicknessCss;

  const canvasCssLeft = emitterX;
  const canvasCssTop = emitterY - canvasCssHeight / 2;

  const canvasBackingWidth = Math.max(1, Math.round(canvasCssWidth * devicePixelRatio));
  const canvasBackingHeight = Math.max(1, Math.round(canvasCssHeight * devicePixelRatio));

  return {
    mockCssWidth,
    mockCssHeight,
    canvasCssLeft,
    canvasCssTop,
    canvasCssWidth,
    canvasCssHeight,
    canvasBackingWidth,
    canvasBackingHeight,
    devicePixelRatio,
    pixelCssWidth,
    bladeLengthCss,
  };
}

/** Apply {@link PreviewLayout} to a canvas element (CSS box + backing store + DPR transform). */
export function applyPreviewLayoutToCanvas(
  canvas: HTMLCanvasElement,
  layout: PreviewLayout,
): CanvasRenderingContext2D {
  canvas.style.left = `${layout.canvasCssLeft}px`;
  canvas.style.top = `${layout.canvasCssTop}px`;
  canvas.style.width = `${layout.canvasCssWidth}px`;
  canvas.style.height = `${layout.canvasCssHeight}px`;
  canvas.width = layout.canvasBackingWidth;
  canvas.height = layout.canvasBackingHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d context unavailable');
  }
  ctx.setTransform(layout.devicePixelRatio, 0, 0, layout.devicePixelRatio, 0, 0);
  return ctx;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
