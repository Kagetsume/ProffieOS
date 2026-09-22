import { describe, expect, it } from 'vitest';
import {
  formatPresetStyleLine,
  normalizePresetStyles,
  parsePresetStyleLine,
  presetSlotLabel,
} from './preset-styles';

describe('preset-styles', () => {
  it('formats named and config style lines', () => {
    expect(
      formatPresetStyleLine({
        kind: 'named',
        ref: 'standard',
        args: ['cyan', 'white', '300', '800'],
        overrides: {},
        customLine: '',
      }),
    ).toBe('standard cyan white 300 800');

    expect(
      formatPresetStyleLine({
        kind: 'config',
        ref: 'with_vars',
        args: [],
        overrides: { base: 'magenta' },
        customLine: '',
      }),
    ).toBe('config with_vars base=magenta');
  });

  it('parses config overrides', () => {
    const parsed = parsePresetStyleLine('config with_vars base=blue clash=yellow');
    expect(parsed.kind).toBe('config');
    expect(parsed.ref).toBe('with_vars');
    expect(parsed.overrides).toEqual({ base: 'blue', clash: 'yellow' });
  });

  it('parses named style lines', () => {
    const parsed = parsePresetStyleLine('rainbow 300 800');
    expect(parsed.kind).toBe('named');
    expect(parsed.ref).toBe('rainbow');
    expect(parsed.args).toEqual(['300', '800']);
  });

  it('returns defaults for empty lines and formats custom lines', () => {
    expect(parsePresetStyleLine('   ').ref).toBe('standard');
    expect(
      formatPresetStyleLine({
        kind: 'custom',
        ref: '',
        args: [],
        overrides: {},
        customLine: '  StylePtr<Blue>  ',
      }),
    ).toBe('StylePtr<Blue>');
    expect(
      formatPresetStyleLine({
        kind: 'config',
        ref: 'section',
        args: [],
        overrides: { '': 'x', valid: ' ' },
        customLine: '',
      }),
    ).toBe('config section');
  });

  it('labels preset slots for five-blade layouts', () => {
    expect(presetSlotLabel(0, 5)).toContain('main strip');
    expect(presetSlotLabel(2, 5)).toContain('Free1');
    expect(presetSlotLabel(0, 2)).toBe('Blade 0');
  });

  it('normalizes style slot count', () => {
    const styles = normalizePresetStyles(
      [
        {
          kind: 'named',
          ref: 'standard',
          args: ['cyan', 'white', '300', '800'],
          overrides: {},
          customLine: '',
        },
      ],
      5,
    );
    expect(styles).toHaveLength(5);
    expect(styles[2]?.ref).toBe('accent_pulse');
    expect(styles[4]?.ref).toBe('accent_glow');
  });
});
