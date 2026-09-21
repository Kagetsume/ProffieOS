import { describe, expect, it } from 'vitest';
import {
  defaultArgsForStyle,
  describeLayer,
  getNamedStyle,
  listStyleGroups,
  listStylesInGroup,
  styleDisplayLabel,
  stylePickerLabel,
} from './style-catalog';

describe('style-catalog', () => {
  it('looks up named styles and groups', () => {
    const standard = getNamedStyle('standard');
    expect(standard?.group).toBe('base');
    expect(listStyleGroups().length).toBeGreaterThan(0);
    expect(listStylesInGroup('base').some((style) => style.id === 'standard')).toBe(true);
  });

  it('formats display and picker labels', () => {
    expect(styleDisplayLabel('standard')).toBe('Standard');
    const lb = getNamedStyle('lb');
    expect(lb).toBeDefined();
    expect(stylePickerLabel(lb!)).toContain('lb');
  });

  it('returns default args for known styles', () => {
    const args = defaultArgsForStyle('solid');
    expect(args.length).toBeGreaterThan(0);
    expect(defaultArgsForStyle('unknown_style_xyz')).toEqual([]);
  });

  it('describes layers with blend and config sections', () => {
    expect(describeLayer('fire', ['red'], 'add')).toContain('add');
    expect(describeLayer('config', [], 'normal', 'smoke_blade')).toContain('smoke_blade');
    expect(describeLayer('solid', ['cyan'], 'normal')).toContain('Solid');
  });
});
