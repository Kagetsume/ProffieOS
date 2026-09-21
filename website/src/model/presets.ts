/**
 * Types for `config/presets.ini` — preset list blocks.
 *
 * User guide: `examples/config/presets.ini` header; wiring in `website/BLADES.md`.
 *
 * @module model/presets
 */
import defaultCatalog from '../catalog/presets-default.json';
import type { PresetStyle } from './preset-styles';
import { defaultPresetStyleForSlot, normalizePresetStyles } from './preset-styles';

/** One preset entry (between `new_preset` and the next block or `end`). */
export type PresetDefinition = {
  /** Stable id for editor state (not exported). */
  id: string;
  font: string;
  track: string;
  name: string;
  variation: number;
  /** One style per logical blade index (bottom → top order in INI). */
  styles: PresetStyle[];
  /** Optional user note exported as `#` comment above the block. */
  comment?: string;
};

export type PresetsCatalog = {
  presets: Omit<PresetDefinition, 'id'>[];
};

let presetIdCounter = 1;

/** Create a unique preset id for new rows. */
export function createPresetId(): string {
  const id = `preset_${presetIdCounter}`;
  presetIdCounter += 1;
  return id;
}

/** Materialize catalog entries with fresh ids. */
export function createDefaultPresets(slotCount = 5): PresetDefinition[] {
  const catalog = defaultCatalog as PresetsCatalog;
  return catalog.presets.map((entry) => ({
    ...entry,
    id: createPresetId(),
    styles: normalizePresetStyles(entry.styles, slotCount),
  }));
}

/** Duplicate a preset with a new id and adjusted name. */
export function clonePreset(preset: PresetDefinition, slotCount: number): PresetDefinition {
  return {
    ...preset,
    id: createPresetId(),
    name: preset.name ? `${preset.name} copy` : 'Copy',
    styles: normalizePresetStyles(
      preset.styles.map((style) => ({
        ...style,
        overrides: { ...style.overrides },
      })),
      slotCount,
    ),
  };
}

/** Blank preset using accent-aware defaults per slot. */
export function createEmptyPreset(slotCount: number): PresetDefinition {
  return {
    id: createPresetId(),
    font: 'LiquidStatic',
    track: 'tracks/hum.wav',
    name: 'New preset',
    variation: 0,
    styles: Array.from({ length: slotCount }, (_, index) =>
      defaultPresetStyleForSlot(index, slotCount),
    ),
  };
}
