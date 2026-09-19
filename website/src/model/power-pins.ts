/**
 * Pure helpers for NeoPixel **power pin** lists on a single blade.
 *
 * Editing keeps empty row slots; export uses {@link exportablePowerPins} to omit blanks.
 * All functions return new arrays — no mutation.
 *
 * Cross-blade usage: {@link masterUsedPresetPins} and {@link usedPresetsForPicker} ensure
 * each FET pin is only assigned once across the whole wiring table.
 *
 * @module model/power-pins
 */
import type { BladeDefinition } from './blades';
import pinOptions from '../catalog/pin-options.json';
import { MAX_POWER_PINS } from '../validation/limits';

/**
 * Returns true if `value` is one of the six preset FET names in `pin-options.json`.
 */
export function isPresetPowerPin(value: string): boolean {
  return pinOptions.powerPins.includes(value.trim());
}

/**
 * Trim each entry and cap length at {@link MAX_POWER_PINS}.
 * Does **not** remove empty strings — used while the user is still editing rows.
 */
export function normalizePowerPinList(pins: string[]): string[] {
  return pins.map((s) => s.trim()).slice(0, MAX_POWER_PINS);
}

/**
 * Pin list for UI binding. Returns at least one row (`['']`) when undefined/empty.
 */
export function effectivePowerPins(pins: string[] | undefined): string[] {
  return pins?.length ? [...pins] : [''];
}

/**
 * Compare two in-editor pin lists (including empty row slots).
 */
export function powerPinListsEqual(
  a: string[] | undefined,
  b: string[] | undefined,
): boolean {
  return JSON.stringify(effectivePowerPins(a)) === JSON.stringify(effectivePowerPins(b));
}

/**
 * Append a blank power pin row, preserving existing selections.
 * No-op when already at {@link MAX_POWER_PINS}.
 */
export function addPowerPinRow(pins: string[]): string[] {
  if (pins.length >= MAX_POWER_PINS) {
    return normalizePowerPinList(pins);
  }
  return normalizePowerPinList([...pins, '']);
}

/** Replace one row's value without affecting sibling indices. */
export function updatePowerPinRow(pins: string[], index: number, value: string): string[] {
  const next = [...pins];
  next[index] = value;
  return normalizePowerPinList(next);
}

/** Remove a row. Always keeps at least one row in the editor. */
export function removePowerPinRow(pins: string[], index: number): string[] {
  if (pins.length <= 1) {
    return normalizePowerPinList(pins);
  }
  return normalizePowerPinList(pins.filter((_, i) => i !== index));
}

/**
 * Preset pins selected on **other** rows of the same blade.
 * Used to disable duplicate picks in sibling dropdowns.
 */
export function usedPresetsOnOtherRows(pins: string[], rowIndex: number): Set<string> {
  const used = new Set<string>();
  pins.forEach((pin, index) => {
    if (index === rowIndex) {
      return;
    }
    const trimmed = pin.trim();
    if (trimmed && isPresetPowerPin(trimmed)) {
      used.add(trimmed);
    }
  });
  return used;
}

/**
 * All preset FET pins in use on NeoPixel blades (master list for the wiring table).
 */
export function masterUsedPresetPins(blades: BladeDefinition[]): Set<string> {
  const used = new Set<string>();
  for (const blade of blades) {
    if (blade.type !== 'ws2811') {
      continue;
    }
    for (const pin of exportablePowerPins(blade.powerPins)) {
      if (isPresetPowerPin(pin)) {
        used.add(pin);
      }
    }
  }
  return used;
}

/**
 * Presets that must appear disabled in one picker: other rows on this blade plus
 * all preset pins assigned on **other** NeoPixel blades.
 */
export function usedPresetsForPicker(
  blades: BladeDefinition[],
  bladeIndex: number,
  rowPins: string[],
  rowIndex: number,
): Set<string> {
  const used = usedPresetsOnOtherRows(rowPins, rowIndex);

  for (const blade of blades) {
    if (blade.index === bladeIndex || blade.type !== 'ws2811') {
      continue;
    }
    for (const pin of exportablePowerPins(blade.powerPins)) {
      if (isPresetPowerPin(pin)) {
        used.add(pin);
      }
    }
  }

  return used;
}

/**
 * Non-empty pins only — pass to {@link serializeBladesIni} so blank rows are not exported.
 */
export function exportablePowerPins(pins: string[] | undefined): string[] {
  return (pins ?? []).map((s) => s.trim()).filter(Boolean);
}
