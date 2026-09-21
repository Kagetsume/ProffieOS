/**
 * Cross-blade power pin usage — derived from `$wiring`.
 *
 * @module stores/power-pin-usage
 */
import type { BladeDefinition } from '../model/blades';
import { masterUsedPresetPins, usedPresetsForPicker } from '../model/power-pins';
import { $wiring } from './wiring';

/** All preset FET pins currently assigned on any NeoPixel blade. */
export const $masterUsedPresetPins = $wiring.map((blades) => [...masterUsedPresetPins(blades)]);

/**
 * Wiring table with one blade's in-progress pin list substituted.
 * Used so a picker sees its own row's latest values before the store commit propagates.
 */
export function wiringWithBladePins(
  blades: BladeDefinition[],
  bladeIndex: number,
  pins: string[],
): BladeDefinition[] {
  return blades.map((blade) =>
    blade.index === bladeIndex ? { ...blade, powerPins: pins } : blade,
  );
}

/**
 * Presets that must be disabled in one picker (sibling rows + other blades).
 *
 * @param bladeIndex - Blade being edited
 * @param rowPins - Current pin list for that blade (may include empty slots)
 * @param rowIndex - Row index within the blade
 * @param blades - Optional wiring snapshot; defaults to `$wiring.getState()`
 */
export function getUsedPresetsForPicker(
  bladeIndex: number,
  rowPins: string[],
  rowIndex: number,
  blades: BladeDefinition[] = $wiring.getState(),
): Set<string> {
  return usedPresetsForPicker(
    wiringWithBladePins(blades, bladeIndex, rowPins),
    bladeIndex,
    rowPins,
    rowIndex,
  );
}
