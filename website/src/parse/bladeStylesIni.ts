/**
 * Parse `config/blade_styles.ini` style sections.
 *
 * Supports `layer = …` lines (blend, opacity, config nesting). Skips structured
 * `layer.<style>.<slot>` and top-level `include =` directives.
 *
 * @module parse/bladeStylesIni
 */
import { OPACITY_SCALE, parseOpacityScaleToken } from '../model/opacity-scale';
import type { LayerBlend, StyleLayer, StyleSection } from '../model/style-sections';
import { createLayerId } from '../model/style-sections';
import { parseKeyValue } from './ini-util';

const BLEND_KEYWORDS = new Set<LayerBlend>(['normal', 'multiply', 'screen', 'add']);

export type ParsedStyleLayer = Omit<StyleLayer, 'id'>;

/** Parse the value side of a `layer =` line into editor layer fields. */
export function parseLayerLineBody(body: string): ParsedStyleLayer {
  const tokens = body.trim().split(/\s+/).filter(Boolean);
  let index = 0;
  let blend: LayerBlend = 'normal';
  let opacity = OPACITY_SCALE;

  if (tokens[index] && BLEND_KEYWORDS.has(tokens[index] as LayerBlend)) {
    blend = tokens[index] as LayerBlend;
    index += 1;
  }
  if (tokens[index] === 'opacity') {
    index += 1;
    if (tokens[index]) {
      opacity = parseOpacityScaleToken(tokens[index]);
      index += 1;
    }
  }
  if (tokens[index] === 'config') {
    index += 1;
    const configSection = tokens[index] ?? '';
    return {
      styleName: 'config',
      configSection,
      args: [],
      blend,
      opacity,
    };
  }

  const styleName = tokens[index] ?? 'solid';
  index += 1;
  return {
    styleName,
    args: tokens.slice(index),
    blend,
    opacity,
  };
}

function withLayerIds(layers: ParsedStyleLayer[]): StyleLayer[] {
  return layers.map((layer) => ({ ...layer, id: createLayerId() }));
}

/**
 * Parse all `[section]` blocks from blade_styles.ini text.
 *
 * @returns Ordered sections; skips palette-only metadata lines without layers.
 */
export function parseBladeStylesIni(text: string): StyleSection[] {
  const sections: StyleSection[] = [];
  let current: StyleSection | null = null;
  let pendingLayers: ParsedStyleLayer[] = [];

  const flush = (): void => {
    if (!current) {
      return;
    }
    if (pendingLayers.length === 0 && Object.keys(current.vars).length === 0) {
      current = null;
      pendingLayers = [];
      return;
    }
    sections.push({
      id: current.id,
      vars: { ...current.vars },
      layers: withLayerIds(pendingLayers.length > 0 ? pendingLayers : [{ styleName: 'solid', args: ['cyan', '300', '800'], blend: 'normal', opacity: OPACITY_SCALE }]),
    });
    current = null;
    pendingLayers = [];
  };

  for (const raw of text.split(/\r?\n/)) {
    const hash = raw.indexOf('#');
    const line = (hash >= 0 ? raw.slice(0, hash) : raw).trim();
    if (!line) {
      continue;
    }

    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      flush();
      current = { id: sectionMatch[1]!.trim(), vars: {}, layers: [] };
      continue;
    }

    if (!current) {
      continue;
    }

    const kv = parseKeyValue(line);
    if (!kv) {
      continue;
    }

    const key = kv.key.trim();
    const keyLower = key.toLowerCase();

    if (keyLower === 'layer') {
      pendingLayers.push(parseLayerLineBody(kv.value));
      continue;
    }

    if (keyLower.startsWith('layer.') || keyLower === 'include' || keyLower === 'palette') {
      continue;
    }

    if (keyLower === 'version') {
      continue;
    }

    current.vars[key] = kv.value;
  }

  flush();
  return sections;
}
