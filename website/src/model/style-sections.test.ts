import { describe, expect, it } from 'vitest';
import {
  baseSectionVarEntries,
  createDefaultLayer,
  createDefaultStyleSections,
  resolveLayerArgs,
  resolvedLayerArgs,
  resolveVarTemplate,
  sectionHasDedicatedLockupLayer,
  sectionPrimaryBaseLayer,
  templateVarNamesInArg,
} from './style-sections';

describe('style-sections', () => {
  it('resolves variable templates in layer args', () => {
    expect(resolveVarTemplate('{{base}} and {{missing}}', { base: 'cyan' })).toBe(
      'cyan and {{missing}}',
    );
    const layer = createDefaultLayer();
    layer.args = ['{{base}}', '300'];
    expect(resolveLayerArgs(layer, { base: 'red' })).toEqual(['red', '300']);
  });

  it('resolvedLayerArgs fills named-style catalog defaults for preview', () => {
    const layer = createDefaultLayer();
    layer.styleName = 'sine_waves';
    layer.args = ['2400', '0', '8192', '65535'];
    const filled = resolvedLayerArgs(layer, {});
    expect(filled[4]).toBe('-2000');
  });

  it('finds template variable names', () => {
    expect(templateVarNamesInArg('{{base}} {{ext}}')).toEqual(['base', 'ext']);
  });

  it('detects primary base layer and base section vars', () => {
    const section = createDefaultStyleSections().find((entry) => entry.id === 'with_vars')!;
    const base = sectionPrimaryBaseLayer(section);
    expect(base?.styleName).toBeTruthy();
    const entries = baseSectionVarEntries(section);
    expect(entries.some(([key]) => key === 'base')).toBe(true);
  });

  it('detects dedicated lockup layers', () => {
    const layer = createDefaultLayer();
    expect(sectionHasDedicatedLockupLayer({ layers: [layer] })).toBe(false);
    layer.styleName = 'lockup';
    expect(sectionHasDedicatedLockupLayer({ layers: [layer] })).toBe(true);
  });
});
