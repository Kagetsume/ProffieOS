/**
 * Tests for unified recipe / layer style picker helpers.
 */
import { describe, expect, it } from 'vitest';
import { getConfigStyle, listConfigStyles } from './config-styles';
import {
  decodePresetStylePickerValue,
  decodeStylePickerValue,
  encodeFileRecipe,
  encodeLayerStyle,
  encodeLibraryRecipe,
  encodeNestedRecipe,
  encodePresetConfigRecipe,
  encodePresetLibraryRecipe,
  encodePresetNamedStyle,
  layerStylePickerValue,
  listLayerStylePickerOptions,
  listPresetStylePickerOptions,
  listRecipePickerOptions,
  presetStylePickerValue,
  recipeDescription,
  resolveRecipePickerSelection,
  summarizeRecipeLayers,
} from './style-picker';
import { defaultNeoPixelStyle } from './preset-styles';
import type { StyleSection } from './style-sections';

describe('style-picker', () => {
  it('lists in-file recipes separately from library imports', () => {
    const sections: StyleSection[] = [
      { id: 'smoke_blade', vars: {}, layers: [{ id: 'l1', styleName: 'standard', args: [], blend: 'normal', opacity: 32768 }] },
    ];
    const { inFile, library } = listRecipePickerOptions(sections, listConfigStyles());
    expect(inFile).toHaveLength(1);
    expect(inFile[0]?.value).toBe('smoke_blade');
    expect(library.some((entry) => entry.label === 'water_blade')).toBe(true);
    expect(library.some((entry) => entry.label === 'smoke_blade')).toBe(false);
  });

  it('resolves recipe picker values from section ids and legacy prefixes', () => {
    const sections: StyleSection[] = [
      { id: 'smoke_laser', vars: {}, layers: [] },
      { id: 'rainbow_strobe', vars: {}, layers: [] },
    ];
    expect(resolveRecipePickerSelection('rainbow_strobe', sections)).toEqual({
      kind: 'file',
      id: 'rainbow_strobe',
    });
    expect(resolveRecipePickerSelection(encodeFileRecipe('rainbow_strobe'), sections)).toEqual({
      kind: 'file',
      id: 'rainbow_strobe',
    });
    expect(resolveRecipePickerSelection('rainbow_strobe · 2 layers', sections)).toEqual({
      kind: 'file',
      id: 'rainbow_strobe',
    });
    expect(resolveRecipePickerSelection('In file · rainbow_strobe · 2 layers', sections)).toEqual({
      kind: 'file',
      id: 'rainbow_strobe',
    });
    expect(resolveRecipePickerSelection(encodeLibraryRecipe('water_blade'), sections)).toEqual({
      kind: 'library',
      id: 'water_blade',
    });
  });

  it('lists layer style picker options including nested recipes', () => {
    const sections: StyleSection[] = [
      { id: 'nested', vars: {}, layers: [{ id: 'l1', styleName: 'solid', args: [], blend: 'normal', opacity: 32768 }] },
    ];
    const options = listLayerStylePickerOptions(sections);
    expect(options.some((option) => option.value === encodeLayerStyle('fire'))).toBe(true);
    expect(options.some((option) => option.value === encodeNestedRecipe('nested'))).toBe(true);
    const baseLabels = options
      .filter((option) => option.group === 'Base blades')
      .map((option) => option.label);
    const sortedBase = [...baseLabels].sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );
    expect(baseLabels).toEqual(sortedBase);
  });

  it('sorts nested recipe options case-insensitively', () => {
    const sections: StyleSection[] = [
      { id: 'zeta', vars: {}, layers: [] },
      { id: 'Alpha', vars: {}, layers: [] },
      { id: 'mid', vars: {}, layers: [] },
    ];
    const nested = listLayerStylePickerOptions(sections).filter(
      (option) => option.group === 'Nest recipe (layer = config …)',
    );
    expect(nested.map((option) => option.label)).toEqual(['Alpha', 'mid', 'zeta']);
  });

  it('decodes recipe and layer picker values', () => {
    expect(decodeStylePickerValue(encodeFileRecipe('smoke_blade'))).toEqual({
      kind: 'file',
      id: 'smoke_blade',
    });
    expect(decodeStylePickerValue(encodeLibraryRecipe('water_blade'))).toEqual({
      kind: 'library',
      id: 'water_blade',
    });
    expect(decodeStylePickerValue(encodeLayerStyle('fire'))).toEqual({
      kind: 'layer',
      id: 'fire',
    });
    expect(decodeStylePickerValue(encodeNestedRecipe('nested'))).toEqual({
      kind: 'config',
      id: 'nested',
    });
    expect(decodeStylePickerValue('invalid')).toBeNull();
  });

  it('encodes layer picker values from layer rows', () => {
    expect(layerStylePickerValue({ styleName: 'fire' })).toBe(encodeLayerStyle('fire'));
    expect(layerStylePickerValue({ styleName: 'config', configSection: 'smoke_blade' })).toBe(
      encodeNestedRecipe('smoke_blade'),
    );
  });

  it('returns catalog description for active recipe', () => {
    const sections: StyleSection[] = [
      { id: 'smoke_blade', vars: {}, layers: [{ id: 'l1', styleName: 'solid', args: [], blend: 'normal', opacity: 32768 }] },
    ];
    expect(recipeDescription(sections[0], listConfigStyles())).toBeTruthy();
    expect(recipeDescription(undefined, listConfigStyles())).toBeUndefined();
  });

  it('lists preset style options from blade_styles.ini recipes and named styles', () => {
    const sections: StyleSection[] = [
      {
        id: 'smoke_blade',
        vars: {},
        layers: [{ id: 'l1', styleName: 'standard', args: [], blend: 'normal', opacity: 32768 }],
      },
    ];
    const options = listPresetStylePickerOptions(sections, listConfigStyles());
    expect(options.some((option) => option.value === encodePresetConfigRecipe('smoke_blade'))).toBe(
      true,
    );
    expect(options.some((option) => option.value === encodePresetLibraryRecipe('water_blade'))).toBe(
      true,
    );
    expect(options.some((option) => option.value === encodePresetNamedStyle('standard'))).toBe(true);
  });

  it('decodes preset style picker values', () => {
    expect(decodePresetStylePickerValue(encodePresetNamedStyle('fire'))).toEqual({
      source: 'named',
      ref: 'fire',
    });
    expect(decodePresetStylePickerValue(encodePresetConfigRecipe('smoke_blade'))).toEqual({
      source: 'config',
      ref: 'smoke_blade',
    });
    expect(decodePresetStylePickerValue(encodePresetLibraryRecipe('rainbow_strobe'))).toEqual({
      source: 'library',
      ref: 'rainbow_strobe',
    });
  });

  it('maps preset editor state to unified picker values', () => {
    const sections: StyleSection[] = [
      {
        id: 'smoke_blade',
        vars: {},
        layers: [{ id: 'l1', styleName: 'standard', args: [], blend: 'normal', opacity: 32768 }],
      },
    ];
    expect(presetStylePickerValue(defaultNeoPixelStyle(), sections)).toBe(
      encodePresetNamedStyle('standard'),
    );
    expect(
      presetStylePickerValue(
        { kind: 'config', ref: 'smoke_blade', args: [], overrides: {}, customLine: '' },
        sections,
      ),
    ).toBe(encodePresetConfigRecipe('smoke_blade'));
    expect(
      presetStylePickerValue(
        { kind: 'config', ref: 'rainbow_strobe', args: [], overrides: {}, customLine: '' },
        sections,
      ),
    ).toBe(encodePresetLibraryRecipe('rainbow_strobe'));
  });

  it('summarizes a recipe as its layer style names', () => {
    const style = getConfigStyle('smoke_blade');
    expect(style).toBeDefined();
    const summary = summarizeRecipeLayers({
      id: 'smoke_blade',
      vars: style!.vars,
      layers: style!.layers.map((layer, index) => ({
        id: `l${index}`,
        styleName: layer.styleName,
        args: layer.args,
        blend: layer.blend ?? 'normal',
        opacity: layer.opacity ?? 32768,
      })),
    });
    expect(summary).toContain('Solid');
    expect(summary).toContain('Drag');
  });
});
