/**
 * Sub-blade range helpers for splitting one NeoPixel strip into logical blades.
 *
 * Matches `sub_blade = first, last` in `config/blades.ini` and compiled `SubBlade()`.
 *
 * @module model/sub-blades
 */
import type { BladeDefinition, SubBladeRange } from './blades';
import { MAX_SUB_BLADES } from '../validation/limits';

/** LED count in one inclusive range. */
export function subBladeLedCount(range: SubBladeRange): number {
  if (range.last < range.first) {
    return 0;
  }
  return range.last - range.first + 1;
}

/** True when `first`/`last` fit within a strip of `pixelCount` pixels. */
export function isValidSubBladeRange(range: SubBladeRange, pixelCount: number): boolean {
  if (pixelCount <= 0) {
    return false;
  }
  return range.first >= 0 && range.last >= range.first && range.last < pixelCount;
}

/** Ranges safe to export — valid and within pixel count. */
export function exportableSubBlades(
  subBlades: SubBladeRange[] | undefined,
  pixelCount: number,
): SubBladeRange[] {
  return (subBlades ?? []).filter((range) => isValidSubBladeRange(range, pixelCount));
}

export function addSubBladeRow(subBlades: SubBladeRange[] | undefined): SubBladeRange[] {
  const rows = [...(subBlades ?? [])];
  if (rows.length >= MAX_SUB_BLADES) {
    return rows;
  }
  const lastRow = rows.at(-1);
  const nextFirst = lastRow ? lastRow.last + 1 : 0;
  return [...rows, { first: nextFirst, last: nextFirst }];
}

export function updateSubBladeRow(
  subBlades: SubBladeRange[],
  index: number,
  patch: Partial<SubBladeRange>,
): SubBladeRange[] {
  return subBlades.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

export function removeSubBladeRow(subBlades: SubBladeRange[], index: number): SubBladeRange[] {
  return subBlades.filter((_, i) => i !== index);
}

/**
 * Logical blade slots consumed by one wiring entry.
 * Full strip = 1; each sub-blade range = 1 preset style line.
 */
export function logicalBladeSlots(blade: BladeDefinition): number {
  const ranges = blade.subBlades ?? [];
  return ranges.length > 0 ? ranges.length : 1;
}

/** Total logical blade count across the wiring table (for NUM_BLADES hints). */
export function totalLogicalBladeSlots(blades: BladeDefinition[]): number {
  return blades.reduce((sum, blade) => sum + logicalBladeSlots(blade), 0);
}
