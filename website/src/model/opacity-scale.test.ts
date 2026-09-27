import { describe, expect, it } from 'vitest';
import {
  formatOpacityScaleExport,
  OPACITY_SCALE,
  parseOpacityScaleToken,
  percentToOpacityScale,
} from './opacity-scale';

describe('parseOpacityScaleToken', () => {
  it('parses explicit percent', () => {
    expect(parseOpacityScaleToken('55%')).toBe(Math.round((55 * OPACITY_SCALE) / 100));
    expect(parseOpacityScaleToken('100%')).toBe(OPACITY_SCALE);
  });

  it('parses raw scale when n > 100', () => {
    expect(parseOpacityScaleToken('18000')).toBe(18000);
    expect(parseOpacityScaleToken('32768')).toBe(OPACITY_SCALE);
  });

  it('parses implicit percent when n <= 100', () => {
    expect(parseOpacityScaleToken('100')).toBe(OPACITY_SCALE);
    expect(parseOpacityScaleToken('50')).toBe(Math.round(OPACITY_SCALE / 2));
  });
});

describe('formatOpacityScaleExport', () => {
  it('exports percent for typical layer opacity', () => {
    expect(formatOpacityScaleExport(18000)).toBe('55%');
    expect(formatOpacityScaleExport(24000)).toBe('73%');
    expect(formatOpacityScaleExport(OPACITY_SCALE)).toBe('100');
  });
});

describe('percentToOpacityScale', () => {
  it('matches parse of plain percent', () => {
    expect(percentToOpacityScale(55)).toBe(parseOpacityScaleToken('55'));
  });
});
