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
import { baseSectionVarEntries, resolveLayerArgs, type StyleSection } from './style-sections';

describe('config-styles', () => {
  it('includes smoke_blade config style', () => {
    const style = getConfigStyle('smoke_blade');
    expect(style).toBeDefined();
    expect(style!.layers.some((layer) => layer.styleName === 'solid')).toBe(true);
    expect(style!.layers.some((layer) => layer.styleName === 'real_clash')).toBe(true);
    expect(style!.layers.some((layer) => layer.styleName === 'responsive_lockup')).toBe(true);
  });

  it('smoke_laser and smoke_blade expose editable base color via {{base}}', () => {
    for (const id of ['smoke_laser', 'smoke_blade'] as const) {
      const section = instantiateConfigStyle(getConfigStyle(id)!, id);
      expect(baseSectionVarEntries(section).some(([key]) => key === 'base')).toBe(true);
      const solid = section.layers.find((layer) => layer.styleName === 'solid');
      expect(resolveLayerArgs(solid!, { ...section.vars, base: 'magenta' })[0]).toBe('magenta');
      const screenSmoke = section.layers.find(
        (layer) => layer.styleName === 'smoke_flow' && layer.blend === 'screen',
      );
      expect(resolveLayerArgs(screenSmoke!, { ...section.vars, base: 'magenta' })[1]).toBe(
        'magenta',
      );
    }
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
      'sine_waves_cyan',
      'smoke_sine_cyan',
      'demo_saw_waves',
      'demo_smoothstep_bands',
      'demo_value_noise',
      'demo_fbm_noise',
      'demo_moire_mask',
      'demo_blade_envelope',
      'demo_sine_waves_swing',
      'demo_sine_waves',
      'demo_random_bands',
      'demo_pulse_train',
      'demo_chirp',
      'smoke_laser',
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
