/**
 * Tests for bundled config file styles.
 */
import { describe, expect, it } from 'vitest';
import {
  createDefaultConfigStyles,
  getConfigStyle,
  instantiateConfigStyle,
  uniqueConfigStyleId,
} from './config-styles';
import type { StyleSection } from './style-sections';

describe('config-styles', () => {
  it('includes smoke_blade config style', () => {
    const style = getConfigStyle('smoke_blade');
    expect(style).toBeDefined();
    expect(style!.layers.some((layer) => layer.styleName === 'solid')).toBe(true);
    expect(style!.layers.some((layer) => layer.styleName === 'clash')).toBe(true);
    expect(style!.layers.some((layer) => layer.styleName === 'responsive_lockup')).toBe(true);
  });

  it('uses composable solid base in with_vars', () => {
    const style = getConfigStyle('with_vars');
    expect(style!.layers[0]?.styleName).toBe('solid');
    expect(style!.layers.some((layer) => layer.styleName === 'clash')).toBe(true);
    expect(style!.layers.some((layer) => layer.styleName === 'standard')).toBe(false);
  });

  it('seeds defaults from config file styles', () => {
    const sections = createDefaultConfigStyles();
    expect(sections.map((section) => section.id)).toEqual([
      'rainbow_strobe',
      'smoke_blade',
      'water_blade',
      'fire_blast',
      'with_vars',
    ]);
  });

  it('instantiates with fresh layer ids', () => {
    const style = getConfigStyle('smoke_blade');
    expect(style).toBeDefined();
    const section = instantiateConfigStyle(style!, 'smoke_blade');
    expect(section.layers.every((layer) => layer.id.startsWith('layer-'))).toBe(true);
  });

  it('picks a unique section id when the style already exists', () => {
    const sections: StyleSection[] = [
      { id: 'smoke_blade', vars: {}, layers: [] },
      { id: 'smoke_blade_2', vars: {}, layers: [] },
    ];
    expect(uniqueConfigStyleId(sections, 'smoke_blade')).toBe('smoke_blade_3');
  });
});
