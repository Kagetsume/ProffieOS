/**
 * Helpers for `catalog/named-styles.json` — INI layer keywords used in `layer = …` lines.
 *
 * @module model/style-catalog
 */
import catalog from '../catalog/named-styles.json';

export type StyleArgDef = {
  slot: string;
  label: string;
  type: 'color' | 'number' | 'text';
  default: string;
};

export type NamedStyleDef = {
  id: string;
  label: string;
  group: string;
  overlay?: boolean;
  args: StyleArgDef[];
};

export type StyleGroupDef = {
  id: string;
  label: string;
};

const styles = catalog.styles as NamedStyleDef[];
const groups = catalog.groups as StyleGroupDef[];

const byId = new Map(styles.map((style) => [style.id, style]));

/** Lookup a named style definition (undefined for unknown ids). */
export function getNamedStyle(id: string): NamedStyleDef | undefined {
  return byId.get(id);
}

/** Human-readable UI label; {@link NamedStyleDef.id} stays the INI/firmware keyword. */
export function styleDisplayLabel(styleId: string): string {
  return getNamedStyle(styleId)?.label ?? styleId;
}

/** Style dropdown text — shows the INI keyword when it differs from the label (e.g. lb). */
export function stylePickerLabel(style: NamedStyleDef): string {
  const normalized = style.label.toLowerCase().replace(/\s+/g, '_');
  if (normalized === style.id) {
    return style.label;
  }
  return `${style.label} (${style.id})`;
}

/** All style groups for dropdown optgroups. */
export function listStyleGroups(): StyleGroupDef[] {
  return groups;
}

/** Styles in a catalog group. */
export function listStylesInGroup(groupId: string): NamedStyleDef[] {
  return styles.filter((style) => style.group === groupId);
}

/** Default positional args for a style id. */
export function defaultArgsForStyle(styleId: string): string[] {
  const def = getNamedStyle(styleId);
  if (!def) {
    return [];
  }
  return def.args.map((arg) => arg.default);
}

/** Human label for a layer row in the recipe stack. */
export function describeLayer(
  styleName: string,
  args: string[],
  blend: string,
  configSection?: string,
): string {
  const name =
    styleName === 'config'
      ? `config ${configSection ?? '?'}`
      : styleDisplayLabel(styleName);
  const argText = args.filter(Boolean).join(' ');
  if (blend !== 'normal') {
    return `${blend} · ${name}${argText ? ` ${argText}` : ''}`;
  }
  return `${name}${argText ? ` ${argText}` : ''}`;
}
