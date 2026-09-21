/**
 * Tests for unified recipe / layer style picker helpers.
 */
import { describe, expect, it } from 'vitest';
import { getConfigStyle, listConfigStyles } from './config-styles';
import {
  decodeStylePickerValue,
  encodeFileRecipe,
  encodeLayerStyle,
  encodeLibraryRecipe,
  encodeNestedRecipe,
  layerStylePickerValue,
  listLayerStylePickerOptions,
  listRecipePickerOptions,
  recipeDescription,
  summarizeRecipeLayers,
} from './style-picker';
import type { StyleSection } from './style-sections';

describe('style-picker', () => {
  it('lists in-file recipes separately from library imports', () => {
    const sections: StyleSection[] = [
      { id: 'smoke_blade', vars: {}, layers: [{ id: 'l1', styleName: 'standard', args: [], blend: 'normal', opacity: 32768 }] },
    ];
    const { inFile, library } = listRecipePickerOptions(sections, listConfigStyles());
    expect(inFile).toHaveLength(1);
    expect(library.some((entry) => entry.label === 'water_blade')).toBe(true);
    expect(library.some((entry) => entry.label === 'smoke_blade')).toBe(false);
  });

  it('lists layer style picker options including nested recipes', () => {
    const sections: StyleSection[] = [
      { id: 'nested', vars: {}, layers: [{ id: 'l1', styleName: 'solid', args: [], blend: 'normal', opacity: 32768 }] },
    ];
    const options = listLayerStylePickerOptions(sections);
    expect(options.some((option) => option.value === encodeLayerStyle('fire'))).toBe(true);
    expect(options.some((option) => option.value === encodeNestedRecipe('nested'))).toBe(true);
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
