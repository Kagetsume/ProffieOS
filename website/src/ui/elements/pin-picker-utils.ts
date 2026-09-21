/**
 * Pure helpers for {@link PoPinPicker} — catalog lookup and value mapping.
 *
 * @module ui/elements/pin-picker-utils
 */
import { listDataPinOptions } from '../../model/data-pins';
import { isPresetPowerPin } from '../../model/power-pins';
import pinOptions from '../../catalog/pin-options.json';

export { isPresetPowerPin };

export type PinCatalogEntry = {
  id: string;
  label: string;
};

export type PinPickerMode = 'power' | 'data';

/** `wa-select` value when user chooses free-form pin entry. */
export const CUSTOM_PIN_VALUE = '__custom__';

/**
 * Builds the power FET pin catalog from static pin options.
 *
 * Each entry uses the pin id as both `id` and `label`.
 *
 * @returns Array of power pin catalog entries for preset selection.
 */
export function powerPinCatalog(): PinCatalogEntry[] {
  return pinOptions.powerPins.map((id) => ({ id, label: id }));
}

/**
 * Builds the data / Free pin catalog with human-readable labels.
 *
 * @returns Array of data pin catalog entries from the data-pins model.
 */
export function dataPinCatalog(): PinCatalogEntry[] {
  return listDataPinOptions();
}

/**
 * Returns the pin catalog appropriate for the given picker mode.
 *
 * @param mode - `'power'` for FET pins, `'data'` for blade data pins.
 * @returns Power or data pin catalog entries matching the mode.
 */
export function pinCatalogForMode(mode: PinPickerMode): PinCatalogEntry[] {
  return mode === 'data' ? dataPinCatalog() : powerPinCatalog();
}

/**
 * Checks whether a stored pin string matches a preset entry for the given mode.
 *
 * @param value - Raw pin string from config or user input.
 * @param mode - `'power'` or `'data'` catalog to search.
 * @returns `true` when `value` (trimmed for data mode) is a known preset pin.
 */
export function isPresetPinForMode(value: string, mode: PinPickerMode): boolean {
  return mode === 'data'
    ? listDataPinOptions().some((entry) => entry.id === value.trim())
    : isPresetPowerPin(value);
}

/**
 * Maps a stored pin string to the `wa-select` `value` property.
 *
 * Preset pins map one-to-one to their id; non-preset (custom) values map to
 * {@link CUSTOM_PIN_VALUE} so the picker shows the custom input branch.
 *
 * @param value - Stored pin string from blade or power config.
 * @param mode - Catalog mode used to resolve presets; defaults to `'power'`.
 * @returns Preset pin id, empty string when `value` is falsy, or
 *   {@link CUSTOM_PIN_VALUE} for free-form pins.
 */
export function selectValueForPin(value: string, mode: PinPickerMode = 'power'): string {
  if (!value) {
    return '';
  }
  if (isPresetPinForMode(value, mode)) {
    return value.trim();
  }
  return CUSTOM_PIN_VALUE;
}
