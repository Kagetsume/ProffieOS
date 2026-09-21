/**
 * Unified style picker — recipes (blade_styles.ini sections) and layer styles (stack building blocks).
 *
 * A **recipe** is a `[section]` in blade_styles.ini. It is a stack of **layer styles**
 * (`standard`, `fire`, `blast`, …). Presets use the whole recipe: `style = config smoke_blade`.
 * A layer line can also nest another recipe: `layer = config other_section`.
 *
 * Examples: `website/BLADE_STYLES.md`.
 *
 * @module model/style-picker
 */
import type { ConfigStyleDef } from './config-styles';
import {
  listStyleGroups,
  listStylesInGroup,
  styleDisplayLabel,
  stylePickerLabel,
} from './style-catalog';
import type { StyleSection } from './style-sections';

export type RecipePickerOption = {
  value: string;
  label: string;
  hint?: string;
};

export type LayerStylePickerOption = {
  value: string;
  label: string;
  group: string;
};

const FILE_PREFIX = 'file:';
const LIBRARY_PREFIX = 'library:';
const LAYER_PREFIX = 'layer:';
const CONFIG_PREFIX = 'config:';

export function encodeFileRecipe(sectionId: string): string {
  return `${FILE_PREFIX}${sectionId}`;
}

export function encodeLibraryRecipe(recipeId: string): string {
  return `${LIBRARY_PREFIX}${recipeId}`;
}

export function encodeLayerStyle(styleId: string): string {
  return `${LAYER_PREFIX}${styleId}`;
}

export function encodeNestedRecipe(sectionId: string): string {
  return `${CONFIG_PREFIX}${sectionId}`;
}

export function decodeStylePickerValue(value: string): {
  kind: 'file' | 'library' | 'layer' | 'config';
  id: string;
} | null {
  if (value.startsWith(FILE_PREFIX)) {
    return { kind: 'file', id: value.slice(FILE_PREFIX.length) };
  }
  if (value.startsWith(LIBRARY_PREFIX)) {
    return { kind: 'library', id: value.slice(LIBRARY_PREFIX.length) };
  }
  if (value.startsWith(LAYER_PREFIX)) {
    return { kind: 'layer', id: value.slice(LAYER_PREFIX.length) };
  }
  if (value.startsWith(CONFIG_PREFIX)) {
    return { kind: 'config', id: value.slice(CONFIG_PREFIX.length) };
  }
  return null;
}

/** Options for the page-level recipe picker (in-file sections + library to import). */
export function listRecipePickerOptions(
  sections: StyleSection[],
  catalog: ConfigStyleDef[],
): { inFile: RecipePickerOption[]; library: RecipePickerOption[] } {
  const fileIds = new Set(sections.map((section) => section.id));

  const inFile = sections.map((section) => {
    const catalogEntry = catalog.find((entry) => entry.id === section.id);
    const layerCount = section.layers.length;
    return {
      value: encodeFileRecipe(section.id),
      label: `${section.id} · ${layerCount} layer${layerCount === 1 ? '' : 's'}`,
      hint: catalogEntry?.description,
    };
  });

  const library = catalog
    .filter((entry) => !fileIds.has(entry.id))
    .map((entry) => ({
      value: encodeLibraryRecipe(entry.id),
      label: entry.label,
      hint: entry.description,
    }));

  return { inFile, library };
}

/** Layer-style options for one row in a recipe stack (named styles + nest another recipe). */
export function listLayerStylePickerOptions(sections: StyleSection[]): LayerStylePickerOption[] {
  const options: LayerStylePickerOption[] = [];

  for (const group of listStyleGroups()) {
    for (const style of listStylesInGroup(group.id)) {
      options.push({
        value: encodeLayerStyle(style.id),
        label: stylePickerLabel(style),
        group: group.label,
      });
    }
  }

  for (const section of sections) {
    options.push({
      value: encodeNestedRecipe(section.id),
      label: section.id,
      group: 'Nest recipe (layer = config …)',
    });
  }

  return options;
}

export function layerStylePickerValue(layer: {
  styleName: string;
  configSection?: string;
}): string {
  if (layer.styleName === 'config') {
    return encodeNestedRecipe(layer.configSection ?? '');
  }
  return encodeLayerStyle(layer.styleName);
}

/** Comma-separated layer style names for recipe summary text. */
export function summarizeRecipeLayers(section: StyleSection): string {
  return section.layers
    .map((layer) =>
      layer.styleName === 'config'
        ? `config ${layer.configSection ?? '?'}`
        : styleDisplayLabel(layer.styleName),
    )
    .join(', ');
}

/** Description for the active recipe, from catalog when available. */
export function recipeDescription(
  section: StyleSection | undefined,
  catalog: ConfigStyleDef[],
): string | undefined {
  if (!section) {
    return undefined;
  }
  return catalog.find((entry) => entry.id === section.id)?.description;
}
