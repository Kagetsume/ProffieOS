/** Responsive saber preview layout (container resize, DPR, emitter). */
import { describe, expect, it } from 'vitest';
import { applyPreviewLayoutToCanvas, measurePreviewLayout } from './layout';

describe('measurePreviewLayout', () => {
  it('scales blade length down when container narrows', () => {
    const wide = measurePreviewLayout({
      containerWidth: 800,
      containerHeight: 0,
      pixelCount: 144,
      emitter: { x: 0.2, y: 0.5 },
    });
    const narrow = measurePreviewLayout({
      containerWidth: 400,
      containerHeight: 0,
      pixelCount: 144,
      emitter: { x: 0.2, y: 0.5 },
    });

    expect(narrow.canvasCssWidth).toBeLessThan(wide.canvasCssWidth);
    expect(narrow.pixelCssWidth).toBeLessThan(wide.pixelCssWidth);
  });

  it('keeps LED count; display width per pixel shrinks instead', () => {
    const layout = measurePreviewLayout({
      containerWidth: 300,
      containerHeight: 0,
      pixelCount: 100,
      emitter: { x: 0.25, y: 0.5 },
      maxBladeCssLength: 2000,
    });

    expect(layout.canvasCssWidth).toBeGreaterThan(0);
    expect(layout.pixelCssWidth).toBeGreaterThanOrEqual(1);
    expect(Math.round(layout.canvasCssWidth / layout.pixelCssWidth)).toBe(100);
  });

  it('sets backing store from devicePixelRatio', () => {
    const layout = measurePreviewLayout({
      containerWidth: 500,
      containerHeight: 125,
      pixelCount: 50,
      emitter: { x: 0.15, y: 0.5 },
      devicePixelRatio: 2,
    });

    expect(layout.canvasBackingWidth).toBe(Math.round(layout.canvasCssWidth * 2));
    expect(layout.canvasBackingHeight).toBe(Math.round(layout.canvasCssHeight * 2));
  });

  it('applies layout to a canvas element', () => {
    const layout = measurePreviewLayout({
      containerWidth: 400,
      containerHeight: 100,
      pixelCount: 80,
      emitter: { x: 0.5, y: 0.5 },
      devicePixelRatio: 2,
    });
    const canvas = document.createElement('canvas');
    const ctx = applyPreviewLayoutToCanvas(canvas, layout);
    expect(canvas.width).toBe(layout.canvasBackingWidth);
    expect(canvas.height).toBe(layout.canvasBackingHeight);
    expect(typeof ctx.setTransform).toBe('function');
  });

  it('handles zero pixel count as a single blade segment', () => {
    const layout = measurePreviewLayout({
      containerWidth: 400,
      containerHeight: 100,
      pixelCount: 0,
      emitter: { x: 0.1, y: 0.5 },
    });
    expect(layout.canvasCssWidth).toBeGreaterThan(0);
    expect(layout.pixelCssWidth).toBe(layout.bladeLengthCss);
  });

  it('positions canvas at emitter anchor', () => {
    const layout = measurePreviewLayout({
      containerWidth: 400,
      containerHeight: 100,
      pixelCount: 80,
      emitter: { x: 0.5, y: 0.5 },
    });

    expect(layout.canvasCssLeft).toBe(200);
    expect(layout.canvasCssTop).toBe(50 - layout.canvasCssHeight / 2);
  });
});
