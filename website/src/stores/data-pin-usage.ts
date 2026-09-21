/**
 * Cross-blade data pin usage — derived from `$wiring`.
 *
 * Used by `<po-pin-picker mode="data">` on blade cards to disable pins assigned on other blades.
 *
 * @module stores/data-pin-usage
 */
import type { BladeDefinition } from '../model/blades';
import { masterUsedDataPins, usedDataPinsForPicker } from '../model/data-pins';
import { $wiring } from './wiring';

/** All preset data pins currently assigned on any blade. */
export const $masterUsedDataPins = $wiring.map((blades) => [...masterUsedDataPins(blades)]);

/**
 * Wiring table with one blade's in-progress data pin substituted.
 * Keeps disable logic accurate before the store commit propagates.
 */
export function wiringWithBladeDataPin(
  blades: BladeDefinition[],
  bladeIndex: number,
  dataPin: string,
): BladeDefinition[] {
  return blades.map((blade) =>
    blade.index === bladeIndex ? { ...blade, dataPin } : blade,
  );
}

/**
 * Preset data pins that must be disabled in one blade's picker (other blades only).
 *
 * @param bladeIndex - Blade being edited
 * @param blades - Optional wiring snapshot; defaults to `$wiring.getState()`
 * @param pendingDataPin - Optional in-progress value for this blade
 */
export function getUsedDataPinsForPicker(
  bladeIndex: number,
  blades: BladeDefinition[] = $wiring.getState(),
  pendingDataPin?: string,
): Set<string> {
  const snapshot =
    pendingDataPin !== undefined
      ? wiringWithBladeDataPin(blades, bladeIndex, pendingDataPin)
      : blades;
  return usedDataPinsForPicker(snapshot, bladeIndex);
}
