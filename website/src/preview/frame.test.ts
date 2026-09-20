/**
 * Tests for {@link renderStylePreview} compositing.
 */
import { describe, expect, it } from 'vitest';
import type { StyleSection } from '../model/style-sections';
import { renderStylePreview } from './frame';

describe('renderStylePreview', () => {
  it('composites a fire base layer', () => {
    const section: StyleSection = {
      id: 'fire_blast',
      vars: {},
      layers: [
        {
          id: 'l1',
          styleName: 'fire',
          args: ['red', 'yellow'],
          blend: 'normal',
          opacity: 32768,
        },
      ],
    };
    const frame = renderStylePreview(section, 8, 0);
    expect(frame.lengthFraction).toBe(1);
    expect(frame.pixels.r.some((value) => value > 0)).toBe(true);
    expect(frame.pixels.a.every((alpha) => alpha > 0)).toBe(true);
  });

  it('animates smoke_blade with rolling darker patches', () => {
    const section: StyleSection = {
      id: 'smoke_blade',
      vars: { base: 'blue', clash: 'white', ext: '300', ret: '800' },
      layers: [
        {
          id: 'l1',
          styleName: 'standard',
          args: ['{{base}}', '{{clash}}', '{{ext}}', '{{ret}}'],
          blend: 'normal',
          opacity: 32768,
        },
        {
          id: 'l2',
          styleName: 'fire',
          args: ['white', 'white'],
          blend: 'multiply',
          opacity: 20000,
        },
      ],
    };
    const early = renderStylePreview(section, 32, 0);
    const later = renderStylePreview(section, 32, 2000);
    const spread = (frame: ReturnType<typeof renderStylePreview>) => {
      const values = frame.pixels.r.filter((_, index) => frame.pixels.a[index]! > 0);
      return Math.max(...values) - Math.min(...values);
    };
    expect(spread(early)).toBeGreaterThan(20);
    expect(later.pixels.r.some((value, index) => value !== early.pixels.r[index])).toBe(true);
  });
});
