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
    expect(styleDisplayLabel('unknown_style_xyz')).toBe('unknown_style_xyz');
    const lb = getNamedStyle('lb');
    expect(lb).toBeDefined();
    expect(stylePickerLabel(lb!)).toContain('lb');
    const solid = getNamedStyle('solid');
    expect(solid).toBeDefined();
    expect(stylePickerLabel(solid!)).toBe('Solid');
  });

  it('returns default args for known styles', () => {
    const args = defaultArgsForStyle('solid');
    expect(args.length).toBeGreaterThan(0);
    expect(defaultArgsForStyle('unknown_style_xyz')).toEqual([]);
    expect(defaultArgsForStyle('smoke_flow').at(-1)).toBe('1');
  });

  it('describes layers with blend and config sections', () => {
    expect(describeLayer('fire', ['red'], 'add')).toContain('add');
    expect(describeLayer('config', [], 'normal', 'smoke_blade')).toContain('smoke_blade');
    expect(describeLayer('solid', ['cyan'], 'normal')).toContain('Solid');
    expect(describeLayer('config', [], 'normal')).toContain('config ?');
    expect(describeLayer('solid', [], 'add')).toContain('add · Solid');
  });
});
