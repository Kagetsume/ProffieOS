import { describe, expect, it } from 'vitest';
import {
  canonicalColorName,
  exportColorToken,
  listColorGroups,
  normalizeColorValue,
  parseColorRgb,
  rgbDistanceSquared,
  selectValueForColor,
  sortColorsByRgbCloseness,
} from './colors';
import catalog from '../catalog/colors.json';

describe('colors', () => {
  it('recognizes firmware named colors', () => {
    expect(canonicalColorName('Cyan')).toBe('cyan');
    expect(selectValueForColor('deepskyblue')).toBe('deepskyblue');
  });

  it('recognizes extended menu colors for the picker', () => {
    expect(canonicalColorName('Purple')).toBe('purple');
    expect(selectValueForColor('gold')).toBe('gold');
    expect(parseColorRgb('purple')).toEqual([93, 0, 197]);
  });

  it('parses hex and rgb for preview', () => {
    expect(parseColorRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(parseColorRgb('65535,0,0')).toEqual([255, 0, 0]);
  });

  it('normalizes custom values for editor storage', () => {
    expect(normalizeColorValue('  Blue  ')).toBe('blue');
    expect(normalizeColorValue('#00ff80')).toBe('0,255,128');
    expect(normalizeColorValue('100, 200, 50')).toBe('100,200,50');
    expect(normalizeColorValue('gold')).toBe('gold');
    expect(normalizeColorValue('')).toBe('');
    expect(normalizeColorValue('not-a-color')).toBe('not-a-color');
  });

  it('exports extended names as rgb triplets', () => {
    expect(exportColorToken('blue')).toBe('blue');
    expect(exportColorToken('gold')).toBe('180,130,0');
    expect(exportColorToken('purple')).toBe('93,0,197');
    expect(exportColorToken('')).toBe('');
    expect(exportColorToken('#ff0000')).toBe('255,0,0');
  });

  it('recognizes and exports vivid OS 8 colors', () => {
    expect(selectValueForColor('masterswordblue')).toBe('masterswordblue');
    expect(parseColorRgb('masterswordblue')).toEqual([0, 255, 219]);
    expect(exportColorToken('masterswordblue')).toBe('0,255,219');
    expect(exportColorToken('supersaiyan')).toBe('255,186,0');
  });

  it('uses custom select value for unknown tokens', () => {
    expect(selectValueForColor('128,64,32')).toBe('__custom__');
  });

  it('sorts each dropdown group by rgb closeness', () => {
    const sorted = sortColorsByRgbCloseness(catalog.firmware);
    expect(sorted[0]?.name).toBe('black');

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const current = sorted[i]!;
      const placed = new Set(sorted.slice(0, i).map((color) => color.name));
      const remaining = catalog.firmware.filter((color) => !placed.has(color.name));
      const closestDistance = Math.min(...remaining.map((color) => rgbDistanceSquared(prev, color)));
      const closestNames = remaining
        .filter((color) => rgbDistanceSquared(prev, color) === closestDistance)
        .map((color) => color.name)
        .sort();
      expect(closestNames).toContain(current.name);
    }

    const standard = listColorGroups().find((group) => group.id === 'firmware')!.colors;
    const redIndex = standard.findIndex((color) => color.name === 'red');
    const orangeIndex = standard.findIndex((color) => color.name === 'orange');
    const cyanIndex = standard.findIndex((color) => color.name === 'cyan');
    expect(Math.abs(redIndex - orangeIndex)).toBeLessThan(Math.abs(redIndex - cyanIndex));
  });
});
