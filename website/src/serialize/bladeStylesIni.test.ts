/**
 * Tests for {@link serializeBladeStylesIni}.
 */
import { describe, expect, it } from 'vitest';
import type { StyleSection } from '../model/style-sections';
import { serializeBladeStylesIni } from './bladeStylesIni';

describe('serializeBladeStylesIni', () => {
  const section: StyleSection = {
    id: 'with_vars',
    vars: { base: 'cyan', clash: 'white', ext: '300', ret: '800' },
    layers: [
      {
        id: 'l1',
        styleName: 'solid',
        args: ['{{base}}', '{{ext}}', '{{ret}}'],
        blend: 'normal',
        opacity: 32768,
      },
      {
        id: 'l1b',
        styleName: 'clash',
        args: ['{{clash}}'],
        blend: 'normal',
        opacity: 32768,
      },
      {
        id: 'l2',
        styleName: 'pulse',
        args: ['white', '3000'],
        blend: 'multiply',
        opacity: 24000,
      },
    ],
  };

  it('writes section header, vars, and layer lines', () => {
    const ini = serializeBladeStylesIni([section]);
    expect(ini).toContain('[with_vars]');
    expect(ini).toContain('base = cyan');
    expect(ini).toContain('layer = solid cyan 300 800');
    expect(ini).toContain('layer = clash white');
    expect(ini).toContain('layer = multiply opacity 24000 pulse white 3000');
  });
});
