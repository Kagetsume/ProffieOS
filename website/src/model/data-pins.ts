/**
 * Data pin helpers for `config/blades.ini` — names from `common/blade_config_pin_names.h`.
 *
 * @module model/data-pins
 */
import type { BladeDefinition } from './blades';
import pinOptions from '../catalog/pin-options.json';

export type DataPinOption = {
  id: string;
  label: string;
};

const DATA_PIN_CATALOG: DataPinOption[] = pinOptions.dataPins;

const dataPinIds = new Set(DATA_PIN_CATALOG.map((entry) => entry.id));

/** Catalog entries for blade data / Free pins (Proffieboard SaberPins names). */
export function listDataPinOptions(): DataPinOption[] {
  return DATA_PIN_CATALOG;
}

/** True when `value` is a known board data pin name from the catalog. */
export function isPresetDataPin(value: string): boolean {
  return dataPinIds.has(value.trim());
}

/**
 * Human-readable board silkscreen reference for a data pin.
 * Matches labels printed on the Proffieboard (Free 1, Data 2, etc.).
 */
export function boardPinReferenceLabel(dataPin: string): string {
  const trimmed = dataPin.trim();
  if (!trimmed) {
    return '';
  }
  const entry = DATA_PIN_CATALOG.find((option) => option.id === trimmed);
  return entry?.label ?? trimmed;
}

/**
 * Preset data pins assigned on other blades — disable them in this blade's picker.
 */
export function usedDataPinsForPicker(
  blades: BladeDefinition[],
  bladeIndex: number,
): Set<string> {
  const used = new Set<string>();
  for (const blade of blades) {
    if (blade.index === bladeIndex) {
      continue;
    }
    const pin = blade.dataPin?.trim() ?? '';
    if (pin && isPresetDataPin(pin)) {
      used.add(pin);
    }
  }
  return used;
}

/** All preset data pins in use across the wiring table. */
export function masterUsedDataPins(blades: BladeDefinition[]): Set<string> {
  const used = new Set<string>();
  for (const blade of blades) {
    const pin = blade.dataPin?.trim() ?? '';
    if (pin && isPresetDataPin(pin)) {
      used.add(pin);
    }
  }
  return used;
}
