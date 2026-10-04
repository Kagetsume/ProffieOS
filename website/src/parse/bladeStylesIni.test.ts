import { describe, expect, it } from 'vitest';
import type { StyleSection } from '../model/style-sections';
import { serializeBladeStylesIni } from '../serialize/bladeStylesIni';
import { parseBladeStylesIni, parseLayerLineBody } from './bladeStylesIni';

describe('parseLayerLineBody', () => {
  it('parses blend, opacity, and style tokens', () => {
    const layer = parseLayerLineBody('multiply opacity 73% pulse white 3000');
    expect(layer.blend).toBe('multiply');
    expect(layer.styleName).toBe('pulse');
    expect(layer.args).toEqual(['white', '3000']);
    expect(layer.opacity).toBeLessThan(32768);
  });

  it('parses config nesting', () => {
    const layer = parseLayerLineBody('config smoke_blade');
    expect(layer.styleName).toBe('config');
    expect(layer.configSection).toBe('smoke_blade');
  });
});

describe('parseBladeStylesIni', () => {
  const section: StyleSection = {
    id: 'with_vars',
    vars: { base: 'cyan', clash: 'white' },
    layers: [
      {
        id: 'l1',
        styleName: 'solid',
        args: ['{{base}}', '300', '800'],
        blend: 'normal',
        opacity: 32768,
      },
      {
        id: 'l2',
        styleName: 'clash',
        args: ['{{clash}}'],
        blend: 'normal',
        opacity: 32768,
      },
    ],
  };

  it('round-trips sections and layer stacks', () => {
    const ini = serializeBladeStylesIni([section]);
    const parsed = parseBladeStylesIni(ini);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.id).toBe('with_vars');
    expect(parsed[0]!.vars.base).toBe('cyan');
    expect(parsed[0]!.layers.map((layer) => layer.styleName)).toEqual(['solid', 'clash']);
    expect(parsed[0]!.layers[0]!.args[0]).toBe('cyan');
  });
});
