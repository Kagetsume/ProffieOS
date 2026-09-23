/**
 * Upward-facing saber preview layout (hilt rotated −90°, blade above emitter).
 *
 * @module preview/vertical-layout
 */

/** Blade width as a fraction of the hilt’s displayed width. */
export const BLADE_WIDTH_RATIO = 0.15;

/** Extra blade width (px) beyond ratio — reads fuller on screen. */
export const BLADE_WIDTH_EXTRA_PX = 6;

/** Blade height as a multiple of the hilt’s displayed height. */
export const BLADE_HEIGHT_TO_HILT_RATIO = 3;

/** Blur (px) for edge/tip glow underlay — sharp pass drawn on top afterward. */
export const BLADE_GLOW_BLUR_PX = 12;

/** Horizontal alpha feather (px) at left/right inside the clipped blade. */
export const BLADE_SIDE_FEATHER_PX = 3;

/** Source SVG pixel dimensions (saber-hilt.svg.svg). */
export const HILT_SVG_NATURAL_WIDTH = 2089;
export const HILT_SVG_NATURAL_HEIGHT = 753;

export type VerticalSaberLayout = {
  hiltCssWidth: number;
  hiltCssHeight: number;
  bladeCssWidth: number;
  bladeCssHeight: number;
  bladeTipRadius: number;
  bladeBackingWidth: number;
  bladeBackingHeight: number;
  devicePixelRatio: number;
  pixelCssHeight: number;
};

export type MeasureVerticalSaberLayoutOptions = {
  /** Hilt visual width after −90° rotation (narrow dimension). */
  hiltDisplayWidth: number;
  /** Hilt visual height after −90° rotation (long dimension, points up). */
  hiltDisplayHeight: number;
  /** LED count from wiring (simulation). */
  pixelCount: number;
  devicePixelRatio?: number;
  /**
   * Upper bound on blade CSS height (viewport fit). The 3× hilt ratio still applies
   * when this is omitted or larger than that ideal. The hilt box is not changed.
   */
  maxBladeCssHeight?: number;
};

/**
 * Blade sits above the hilt, centered.
 * Width = 15% of hilt width; height = 3× hilt height, or shorter when
 * `maxBladeCssHeight` is set so the preview pane can fit the viewport.
 * Rounded cap at the tip (top).
 */
export function measureVerticalSaberLayout(
  options: MeasureVerticalSaberLayoutOptions,
): VerticalSaberLayout {
  const {
    hiltDisplayWidth,
    hiltDisplayHeight,
    pixelCount,
    devicePixelRatio = 1,
    maxBladeCssHeight,
  } = options;

  const hiltCssWidth = Math.max(0, hiltDisplayWidth);
  const hiltCssHeight = Math.max(0, hiltDisplayHeight);

  const bladeCssWidth = Math.max(2, hiltCssWidth * BLADE_WIDTH_RATIO + BLADE_WIDTH_EXTRA_PX);
  const idealBladeCssHeight = Math.max(bladeCssWidth, hiltCssHeight * BLADE_HEIGHT_TO_HILT_RATIO);
  const bladeCssHeight =
    maxBladeCssHeight != null && Number.isFinite(maxBladeCssHeight)
      ? Math.max(bladeCssWidth, Math.min(idealBladeCssHeight, maxBladeCssHeight))
      : idealBladeCssHeight;
  const bladeTipRadius = bladeCssWidth / 2;

  // Divide the full blade height across LEDs, including sub-pixel rows, so a
  // viewport-shrunk canvas still draws the tip instead of clipping it.
  const pixelCssHeight = pixelCount > 0 ? bladeCssHeight / pixelCount : bladeCssHeight;

  const bladeBackingWidth = Math.max(1, Math.round(bladeCssWidth * devicePixelRatio));
  const bladeBackingHeight = Math.max(1, Math.round(bladeCssHeight * devicePixelRatio));

  return {
    hiltCssWidth,
    hiltCssHeight,
    bladeCssWidth,
    bladeCssHeight,
    bladeTipRadius,
    bladeBackingWidth,
    bladeBackingHeight,
    devicePixelRatio,
    pixelCssHeight,
  };
}

/** Visual hilt box from rotator CSS width (before rotation math). */
export function hiltVisualBoxFromRotatorWidth(rotatorCssWidth: number): {
  width: number;
  height: number;
} {
  const aspect = HILT_SVG_NATURAL_HEIGHT / HILT_SVG_NATURAL_WIDTH;
  return {
    width: rotatorCssWidth * aspect,
    height: rotatorCssWidth,
  };
}

/** Apply backing-store size and DPR transform for a vertical blade canvas. */
export function applyVerticalBladeCanvas(
  canvas: HTMLCanvasElement,
  layout: VerticalSaberLayout,
): CanvasRenderingContext2D {
  canvas.style.width = `${layout.bladeCssWidth}px`;
  canvas.style.height = `${layout.bladeCssHeight}px`;
  canvas.width = layout.bladeBackingWidth;
  canvas.height = layout.bladeBackingHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2d context unavailable');
  }
  ctx.setTransform(layout.devicePixelRatio, 0, 0, layout.devicePixelRatio, 0, 0);
  return ctx;
}

/**
 * Clip to a visible blade segment: semicircular cap at the top edge, square base at bottom.
 *
 * During in/out, `visibleHeight` is less than full `height` — the cap stays round at the
 * retracting/ extending front instead of a flat horizontal chop.
 */
export function clipBladeVisibleLength(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tipRadius: number,
  visibleHeight: number,
): void {
  const h = Math.max(0, Math.min(visibleHeight, height));
  if (h <= 0) {
    return;
  }

  const yTop = height - h;
  const r = Math.min(tipRadius, width / 2, h);

  ctx.beginPath();
  ctx.moveTo(0, yTop + r);
  ctx.arc(r, yTop + r, r, Math.PI, 0);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.clip();
}

/** Clip to a full blade shape: semicircular tip at top (y = 0), square base at bottom. */
export function clipBladeSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tipRadius: number,
): void {
  clipBladeVisibleLength(ctx, width, height, tipRadius, height);
}

/**
 * Feather left/right alpha inside an already-clipped blade bitmap (soft sides, keeps dome tip).
 */
export function featherBladeSides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  featherPx: number = BLADE_SIDE_FEATHER_PX,
): void {
  if (featherPx <= 0 || width <= featherPx * 2) {
    return;
  }
  const t = Math.min(0.45, featherPx / width);
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(t, 'rgba(0,0,0,1)');
  grad.addColorStop(1 - t, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Sharp clipped blade on top; blurred underlay only peeks at edges and tip halo.
 *
 * `visibleCssHeight` is the current extended length (hilt → tip). Glow is clipped
 * to that span plus the blur radius so the halo grows and shrinks with the blade
 * and does not outline the unlit length.
 */
export function drawBladeWithSoftEdges(
  dest: CanvasRenderingContext2D,
  source: CanvasImageSource,
  layout: Pick<VerticalSaberLayout, 'bladeCssWidth' | 'bladeCssHeight' | 'bladeTipRadius'>,
  visibleCssHeight?: number,
): void {
  const { bladeCssWidth, bladeCssHeight } = layout;
  const visible = Math.max(0, Math.min(bladeCssHeight, visibleCssHeight ?? bladeCssHeight));
  dest.clearRect(0, 0, bladeCssWidth, bladeCssHeight);
  dest.filter = 'none';
  dest.globalAlpha = 1;
  if (visible <= 0) {
    return;
  }
  dest.imageSmoothingEnabled = true;

  // Keep blur pixels past the lit tip. A silhouette clip the same size as the blade erases the halo.
  const glowHeight = Math.min(bladeCssHeight, visible + BLADE_GLOW_BLUR_PX * 2);
  const yTop = bladeCssHeight - glowHeight;
  dest.save();
  dest.beginPath();
  dest.rect(0, yTop, bladeCssWidth, glowHeight);
  dest.clip();

  dest.filter = `blur(${BLADE_GLOW_BLUR_PX}px)`;
  dest.globalAlpha = 0.9;
  dest.drawImage(source, 0, 0, bladeCssWidth, bladeCssHeight);

  dest.filter = 'none';
  dest.globalAlpha = 1;
  dest.drawImage(source, 0, 0, bladeCssWidth, bladeCssHeight);
  dest.restore();
}
