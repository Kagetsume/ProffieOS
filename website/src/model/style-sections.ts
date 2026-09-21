/**
 * Types for `config/blade_styles.ini` sections (variables + layer stack).
 *
 * User guide with functional examples: `website/BLADE_STYLES.md`.
 *
 * @module model/style-sections
 */
import { createDefaultConfigStyles } from './config-styles';

/** Layer compositing mode — matches blade_styles.ini blend keywords. */
export type LayerBlend = 'normal' | 'multiply' | 'screen' | 'add';

/** One composited layer in a style section (bottom → top). */
export type StyleLayer = {
  id: string;
  /** Layer keyword (`standard`, `fire`, …) or `config` for nested `[section]` references. */
  styleName: string;
  /** Positional args after the style name (may contain `{{var}}` templates). */
  args: string[];
  /** Target section when `styleName === 'config'`. */
  configSection?: string;
  blend: LayerBlend;
  /** 0–32768; 32768 = fully opaque (omit opacity in export when normal). */
  opacity: number;
};

/** A `[section_id]` block in blade_styles.ini. */
export type StyleSection = {
  id: string;
  vars: Record<string, string>;
  layers: StyleLayer[];
};

/** Resolve `{{name}}` templates using section variables. */
export function resolveVarTemplate(value: string, vars: Record<string, string>): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => vars[name] ?? `{{${name}}}`);
}

/** Resolve all args on a layer for export or preview. */
export function resolveLayerArgs(layer: StyleLayer, vars: Record<string, string>): string[] {
  return layer.args.map((arg) => resolveVarTemplate(arg, vars));
}

const DEDICATED_LOCKUP_LAYER_NAMES = new Set(['lockup', 'responsive_lockup']);

/** Bottom opaque blade styles — only these may consume "base blade" section variables. */
const PRIMARY_BASE_LAYER_STYLES = new Set([
  'solid',
  'solid_bend',
  'standard',
  'standard_bend',
  'pulse_blade',
  'rainbow',
  'strobe',
  'gradient',
  'audio',
  'flicker',
  'sparktip',
  'sparkle_blade',
  'cylon',
  'water_flow',
  'darksaber',
  'static_electricity',
  'power_wave',
  'unstable_blades',
  'fallen_order',
  'thunder_loop',
  'responsive_flame',
  'shimmer_blade',
  'rotoscope',
  'pulse_stripes',
  'kinetic_charge',
  'rotating_pulse',
  'trickle_blade',
  'fire',
]);

const BASE_SECTION_VAR_KEYS = new Set(['base', 'ext', 'ret', 'extend_ms', 'retract_ms']);

/** Variable names referenced as `{{name}}` in a layer arg. */
export function templateVarNamesInArg(arg: string): string[] {
  const names: string[] = [];
  for (const match of arg.matchAll(/\{\{(\w+)\}\}/g)) {
    names.push(match[1]!);
  }
  return names;
}

/** First normal full-opacity base layer in the stack (bottom → top). */
export function sectionPrimaryBaseLayer(section: StyleSection): StyleLayer | undefined {
  for (const layer of section.layers) {
    if (
      layer.blend === 'normal' &&
      layer.opacity >= 32768 &&
      PRIMARY_BASE_LAYER_STYLES.has(layer.styleName)
    ) {
      return layer;
    }
  }
  return undefined;
}

/** Section variables that belong to the base blade (color + in/out), not overlay effects. */
export function baseSectionVarEntries(section: StyleSection): [string, string][] {
  const names = new Set(BASE_SECTION_VAR_KEYS);
  const baseLayer = sectionPrimaryBaseLayer(section);
  if (baseLayer) {
    for (const arg of baseLayer.args) {
      for (const name of templateVarNamesInArg(arg)) {
        names.add(name);
      }
    }
  }
  return Object.entries(section.vars).filter(([key]) => names.has(key));
}

/** True when the section stacks an explicit lockup overlay (not standard built-in lockup). */
export function sectionHasDedicatedLockupLayer(section: Pick<StyleSection, 'layers'>): boolean {
  return section.layers.some((layer) => DEDICATED_LOCKUP_LAYER_NAMES.has(layer.styleName));
}

let nextLayerId = 1;

/** Create a unique layer id for new rows. */
export function createLayerId(): string {
  nextLayerId += 1;
  return `layer-${nextLayerId}`;
}

/** Default starter sections from bundled config file styles. */
export function createDefaultStyleSections(): StyleSection[] {
  return createDefaultConfigStyles();
}

/** Blank layer for “Add layer”. */
export function createDefaultLayer(): StyleLayer {
  return {
    id: createLayerId(),
    styleName: 'solid',
    args: ['cyan', '300', '800'],
    blend: 'normal',
    opacity: 32768,
  };
}
