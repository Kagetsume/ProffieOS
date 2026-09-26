/**
 * Preset `style =` line helpers — parse, format, and defaults per blade slot.
 *
 * @module model/preset-styles
 */
import { defaultArgsForStyle } from './style-catalog';

export type PresetStyleKind = 'named' | 'config' | 'custom';

/** One logical blade's style assignment in a preset. */
export type PresetStyle = {
  kind: PresetStyleKind;
  /** Named style id or config `[section]` id. */
  ref: string;
  /** Positional args for named styles (after the style keyword). */
  args: string[];
  /** `key=value` tokens after `config section` (preset-only overrides). */
  overrides: Record<string, string>;
  /** Full line body when kind is `custom` (everything after `style =`). */
  customLine: string;
};

/** Default accent lines for the Proffie V3 four-blade profile (indices 1–3). */
const ACCENT_DEFAULTS: PresetStyle[] = [
  {
    kind: 'named',
    ref: 'accent_pulse',
    args: ['1500'],
    overrides: {},
    customLine: '',
  },
  {
    kind: 'named',
    ref: 'accent_sound_on',
    args: ['white', '4096'],
    overrides: {},
    customLine: '',
  },
  {
    kind: 'named',
    ref: 'accent_glow',
    args: [],
    overrides: {},
    customLine: '',
  },
];

/** NeoPixel main/secondary default. */
export function defaultNeoPixelStyle(): PresetStyle {
  return {
    kind: 'named',
    ref: 'standard',
    args: defaultArgsForStyle('standard').slice(0, 4),
    overrides: {},
    customLine: '',
  };
}

/** Default style for logical blade slot `index` when `slotCount` blades are configured. */
export function defaultPresetStyleForSlot(index: number, slotCount: number): PresetStyle {
  if (slotCount >= 5 && index >= 2) {
    return { ...ACCENT_DEFAULTS[index - 2]! };
  }
  if (slotCount >= 4 && index >= 1) {
    return { ...ACCENT_DEFAULTS[index - 1]! };
  }
  return defaultNeoPixelStyle();
}

/** Pad or trim style rows to match logical blade count. */
export function normalizePresetStyles(styles: PresetStyle[], slotCount: number): PresetStyle[] {
  const next = styles.map((style) => ({
    ...style,
    overrides: { ...style.overrides },
  }));
  while (next.length < slotCount) {
    next.push(defaultPresetStyleForSlot(next.length, slotCount));
  }
  return next.slice(0, slotCount);
}

/** Serialize one preset style to the INI value (without `style =`). */
export function formatPresetStyleLine(style: PresetStyle): string {
  if (style.kind === 'custom') {
    return style.customLine.trim();
  }
  if (style.kind === 'config') {
    const overrideTokens = Object.entries(style.overrides)
      .filter(([key, value]) => key.trim() && value.trim())
      .map(([key, value]) => `${key}=${value.trim()}`);
    return ['config', style.ref.trim(), ...overrideTokens].filter(Boolean).join(' ');
  }
  const args = style.args.map((arg) => arg.trim()).filter((arg) => arg.length > 0);
  return [style.ref.trim(), ...args].filter(Boolean).join(' ');
}

/** Best-effort parse of one `style =` line body into editor state. */
export function parsePresetStyleLine(line: string): PresetStyle {
  const trimmed = line.trim();
  if (!trimmed) {
    return defaultNeoPixelStyle();
  }

  if (trimmed.startsWith('config ')) {
    const rest = trimmed.slice(7).trim();
    const tokens = rest.split(/\s+/);
    const ref = tokens[0] ?? '';
    const overrides: Record<string, string> = {};
    for (const token of tokens.slice(1)) {
      const eq = token.indexOf('=');
      if (eq > 0) {
        overrides[token.slice(0, eq)] = token.slice(eq + 1);
      }
    }
    return { kind: 'config', ref, args: [], overrides, customLine: '' };
  }

  const tokens = trimmed.split(/\s+/);
  const ref = tokens[0] ?? 'standard';
  return {
    kind: 'named',
    ref,
    args: tokens.slice(1),
    overrides: {},
    customLine: '',
  };
}

/** Human label for a logical blade slot in the preset editor. */
export function presetSlotLabel(index: number, slotCount: number): string {
  if (slotCount >= 5) {
    if (index === 0) {
      return 'Blade 0 · main strip';
    }
    if (index === 1) {
      return 'Blade 1 · second strip';
    }
    if (index === 2) {
      return 'Blade 2 · accent Free1';
    }
    if (index === 3) {
      return 'Blade 3 · accent Free2';
    }
    if (index === 4) {
      return 'Blade 4 · accent Free3';
    }
  }
  if (slotCount >= 4) {
    if (index === 0) {
      return 'Blade 0 · main strip';
    }
    if (index === 1) {
      return 'Blade 1 · accent Free1';
    }
    if (index === 2) {
      return 'Blade 2 · accent Free2';
    }
    if (index === 3) {
      return 'Blade 3 · accent Free3';
    }
  }
  return `Blade ${index}`;
}
