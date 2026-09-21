/**
 * Starter recipes for `config/blade_styles.ini` — each is a full layer stack.
 *
 * Same format as sections you edit in the app; presets reference them as
 * `style = config smoke_blade`. See `website/BLADE_STYLES.md` for use cases and
 * copy-paste INI equivalents.
 *
 * @module model/config-styles
 */
import stylesCatalog from '../catalog/config-styles.json';
import {
  createLayerId,
  type LayerBlend,
  type StyleLayer,
  type StyleSection,
} from './style-sections';

export type ConfigStyleLayer = {
  styleName: string;
  args: string[];
  blend?: LayerBlend;
  opacity?: number;
  configSection?: string;
};

export type ConfigStyleDef = {
  id: string;
  label: string;
  description: string;
  vars: Record<string, string>;
  layers: ConfigStyleLayer[];
};

const catalog = stylesCatalog as { styles: ConfigStyleDef[] };

/** Config styles loaded when the editor starts (from bundled catalog). */
export const DEFAULT_CONFIG_STYLE_IDS = [
  'rainbow_strobe',
  'smoke_blade',
  'water_blade',
  'fire_blast',
  'with_vars',
] as const;

/** All bundled config file styles, sorted by section name. */
export function listConfigStyles(): ConfigStyleDef[] {
  return [...catalog.styles].sort((left, right) => left.label.localeCompare(right.label));
}

/** Lookup one bundled config style by `[section]` id. */
export function getConfigStyle(id: string): ConfigStyleDef | undefined {
  return catalog.styles.find((style) => style.id === id);
}

/** Starter sections for a new project. */
export function createDefaultConfigStyles(): StyleSection[] {
  return DEFAULT_CONFIG_STYLE_IDS.map((id) => {
    const style = getConfigStyle(id);
    if (!style) {
      throw new Error(`Missing default config style: ${id}`);
    }
    return instantiateConfigStyle(style, id);
  });
}

/** Pick a unique `[section]` id when adding a catalog style that may already exist. */
export function uniqueConfigStyleId(sections: StyleSection[], preferredId: string): string {
  const ids = new Set(sections.map((section) => section.id));
  if (!ids.has(preferredId)) {
    return preferredId;
  }
  let index = 2;
  while (ids.has(`${preferredId}_${index}`)) {
    index += 1;
  }
  return `${preferredId}_${index}`;
}

/** Materialize a catalog entry into an editable section (fresh layer ids). */
export function instantiateConfigStyle(style: ConfigStyleDef, sectionId: string): StyleSection {
  return {
    id: sectionId,
    vars: { ...style.vars },
    layers: style.layers.map(
      (layer): StyleLayer => ({
        id: createLayerId(),
        styleName: layer.styleName,
        args: [...layer.args],
        blend: layer.blend ?? 'normal',
        opacity: layer.opacity ?? 32768,
        configSection: layer.configSection,
      }),
    ),
  };
}
