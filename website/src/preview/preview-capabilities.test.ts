import { describe, expect, it } from 'vitest';
import type { StyleLayer, StyleSection } from '../model/style-sections';
import { getConfigStyle, instantiateConfigStyle } from '../model/config-styles';
import {
  previewCombatControlEnabled,
  sectionPreviewCapabilities,
} from './preview-capabilities';

function layer(styleName: string, args: string[] = []): StyleLayer {
  return { id: 'l1', styleName, args, blend: 'normal', opacity: 32768 };
}

describe('sectionPreviewCapabilities', () => {
  it('enables combat controls present in composable_checklist', () => {
    const def = getConfigStyle('composable_checklist');
    expect(def).toBeDefined();
    const section = instantiateConfigStyle(def!, 'composable_checklist');
    const caps = sectionPreviewCapabilities(section);
    expect(caps.blast).toBe(true);
    expect(caps.clash).toBe(true);
    expect(caps.swing).toBe(true);
    expect(caps.lockup).toBe(true);
    expect(caps.drag).toBe(true);
    expect(caps.melt).toBe(true);
    expect(caps.lb).toBe(true);
    expect(caps.force).toBe(false);
  });

  it('disables blast and clash for solid-only stacks', () => {
    const section: StyleSection = {
      id: 'plain',
      vars: {},
      layers: [layer('solid_bend', ['blue', '300', '800']), layer('gradient_layer', ['red', 'blue'])],
    };
    const caps = sectionPreviewCapabilities(section);
    expect(caps.blast).toBe(false);
    expect(caps.clash).toBe(false);
    expect(caps.lockup).toBe(false);
    expect(caps.swing).toBe(false);
  });

  it('enables built-in lockup for standard without dedicated lockup layer', () => {
    const section: StyleSection = {
      id: 'std',
      vars: {},
      layers: [layer('standard', ['cyan', 'white', '300', '800'])],
    };
    const caps = sectionPreviewCapabilities(section);
    expect(caps.lockup).toBe(true);
    expect(caps.blast).toBe(false);
  });

  it('enables force when force_glow is stacked', () => {
    const section: StyleSection = {
      id: 'force',
      vars: {},
      layers: [layer('accent_color', ['white']), layer('force_glow', ['white'])],
    };
    const caps = sectionPreviewCapabilities(section);
    expect(caps.force).toBe(true);
  });

  it('enables swing for swing_layer textures', () => {
    const section: StyleSection = {
      id: 'swing',
      vars: {},
      layers: [
        layer('solid_bend', ['blue', '300', '800']),
        { ...layer('swing_layer', ['10', '200']), blend: 'multiply' },
      ],
    };
    const caps = sectionPreviewCapabilities(section);
    expect(caps.swing).toBe(true);
    expect(caps.blast).toBe(false);
  });

  it('flattens nested config layer references', () => {
    const fragment: StyleSection = {
      id: 'fragment',
      vars: {},
      layers: [layer('blast', ['white']), layer('real_clash', ['white'])],
    };
    const parent: StyleSection = {
      id: 'parent',
      vars: {},
      layers: [
        layer('solid', ['cyan', '300', '800']),
        {
          id: 'nested',
          styleName: 'config',
          configSection: 'fragment',
          args: [],
          blend: 'normal',
          opacity: 32768,
        },
      ],
    };
    const caps = sectionPreviewCapabilities(parent, [parent, fragment]);
    expect(caps.blast).toBe(true);
    expect(caps.clash).toBe(true);
  });

  it('returns empty capabilities for null section', () => {
    const caps = sectionPreviewCapabilities(null);
    expect(caps.blast).toBe(false);
    expect(caps.force).toBe(false);
  });

  it('skips built-in lockup when a dedicated lockup layer exists', () => {
    const withDedicated: StyleSection = {
      id: 'std-lock',
      vars: {},
      layers: [layer('standard', ['cyan', 'white']), layer('lockup', ['white'])],
    };
    const caps = sectionPreviewCapabilities(withDedicated);
    expect(caps.lockup).toBe(true);
  });

  it('ignores missing or cyclic nested config references', () => {
    const parent: StyleSection = {
      id: 'parent',
      vars: {},
      layers: [
        {
          id: 'missing',
          styleName: 'config',
          configSection: 'does_not_exist',
          args: [],
          blend: 'normal',
          opacity: 32768,
        },
        {
          id: 'self',
          styleName: 'config',
          configSection: 'parent',
          args: [],
          blend: 'normal',
          opacity: 32768,
        },
      ],
    };
    const caps = sectionPreviewCapabilities(parent, [parent]);
    expect(caps.blast).toBe(false);
  });

  it('requires combat ready and capability for interactive controls', () => {
    const caps = sectionPreviewCapabilities(
      instantiateConfigStyle(getConfigStyle('fire_blast')!, 'fire_blast'),
    );
    expect(previewCombatControlEnabled(caps, false, 'blast')).toBe(false);
    expect(previewCombatControlEnabled(caps, true, 'blast')).toBe(true);
    expect(previewCombatControlEnabled(caps, true, 'force')).toBe(false);
  });
});
