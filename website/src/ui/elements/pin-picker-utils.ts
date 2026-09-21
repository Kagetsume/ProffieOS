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

/** Power FET pin catalog (id and label are the same). */
export function powerPinCatalog(): PinCatalogEntry[] {
  return pinOptions.powerPins.map((id) => ({ id, label: id }));
}

/** Data / Free pin catalog with human labels. */
export function dataPinCatalog(): PinCatalogEntry[] {
  return listDataPinOptions();
}

export function pinCatalogForMode(mode: PinPickerMode): PinCatalogEntry[] {
  return mode === 'data' ? dataPinCatalog() : powerPinCatalog();
}

export function isPresetPinForMode(value: string, mode: PinPickerMode): boolean {
  return mode === 'data'
    ? listDataPinOptions().some((entry) => entry.id === value.trim())
    : isPresetPowerPin(value);
}

/**
 * Map stored pin string to the select's `value` property.
 * Presets map 1:1; custom values map to {@link CUSTOM_PIN_VALUE}.
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
