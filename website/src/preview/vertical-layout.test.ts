/** Upward saber preview layout (blade 15% hilt width, 3× hilt height). */
import { describe, expect, it } from 'vitest';
import {
  BLADE_HEIGHT_TO_HILT_RATIO,
  BLADE_WIDTH_RATIO,
  hiltVisualBoxFromRotatorWidth,
  measureVerticalSaberLayout,
} from './vertical-layout';

describe('measureVerticalSaberLayout', () => {
  it('sizes blade to 15% hilt width and 3× hilt height', () => {
    const layout = measureVerticalSaberLayout({
      hiltDisplayWidth: 40,
      hiltDisplayHeight: 120,
      pixelCount: 144,
    });

    expect(layout.bladeCssWidth).toBe(40 * BLADE_WIDTH_RATIO);
    expect(layout.bladeCssHeight).toBe(120 * BLADE_HEIGHT_TO_HILT_RATIO);
    expect(layout.bladeTipRadius).toBe(layout.bladeCssWidth / 2);
  });

  it('divides blade height across pixel count', () => {
    const layout = measureVerticalSaberLayout({
      hiltDisplayWidth: 30,
      hiltDisplayHeight: 100,
      pixelCount: 50,
    });

    expect(Math.round(layout.bladeCssHeight / layout.pixelCssHeight)).toBe(50);
  });

  it('derives visual hilt box from rotator width', () => {
    const box = hiltVisualBoxFromRotatorWidth(176);
    expect(box.height).toBe(176);
    expect(box.width).toBeCloseTo(176 * (753 / 2089), 1);
  });
});
