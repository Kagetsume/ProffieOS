import { describe, expect, it } from 'vitest';
import {
  BRIGHTNESS65535_SCALE,
  formatBrightness65535Export,
  parseBrightness65535Token,
} from './brightness-scale';

describe('parseBrightness65535Token', () => {
  it('maps percent and legacy raw', () => {
    expect(parseBrightness65535Token('100%')).toBe(BRIGHTNESS65535_SCALE);
    expect(parseBrightness65535Token('12.5%')).toBe(8192);
    expect(parseBrightness65535Token('8192')).toBe(8192);
    expect(parseBrightness65535Token('100')).toBe(BRIGHTNESS65535_SCALE);
    expect(parseBrightness65535Token('0')).toBe(0);
  });
});

describe('formatBrightness65535Export', () => {
  it('round-trips common values', () => {
    expect(formatBrightness65535Export(8192)).toBe('12.5%');
    expect(formatBrightness65535Export(BRIGHTNESS65535_SCALE)).toBe('100%');
  });
});
