/**
 * Pure helpers for {@link PoPinPicker} — wa-select option setup without innerHTML rebuild.
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

/** Dataset keys — must be valid `data-*` names (camelCase in `dataset`). */
export const PIN_OPTIONS_INIT_KEYS: Record<PinPickerMode, 'pinOptionsInitPower' | 'pinOptionsInitData'> = {
  power: 'pinOptionsInitPower',
  data: 'pinOptionsInitData',
};

/** Clear cached option lists so a select can rebuild after mode changes. */
export function clearPinSelectOptionInit(
  select: Element & { dataset: DOMStringMap },
  mode?: PinPickerMode,
): void {
  if (mode) {
    delete select.dataset[PIN_OPTIONS_INIT_KEYS[mode]];
    return;
  }
  delete select.dataset.pinOptionsInitPower;
  delete select.dataset.pinOptionsInitData;
}

type WaOptionElement = HTMLElement & {
  value: string;
  disabled: boolean;
  textContent: string;
};

type WaSelectElement = HTMLElement & {
  value: string;
  placeholder: string;
  dataset: DOMStringMap;
};

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

export function placeholderForMode(mode: PinPickerMode): string {
  return mode === 'data' ? 'Select data pin…' : 'Select power pin…';
}

export function isPresetPinForMode(value: string, mode: PinPickerMode): boolean {
  return mode === 'data' ? listDataPinOptions().some((e) => e.id === value.trim()) : isPresetPowerPin(value);
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

/** Create one `<wa-option>` with properties (not markup strings). */
export function createWaPinOption(
  value: string,
  label: string,
  disabled = false,
): WaOptionElement {
  const opt = document.createElement('wa-option') as WaOptionElement;
  opt.value = value;
  opt.textContent = label;
  opt.disabled = disabled;
  return opt;
}

/**
 * Ensure preset + custom `<wa-option>` children exist on a `wa-select` (once per select).
 */
export function initPinSelectOptions(
  select: WaSelectElement,
  usedPresets: ReadonlySet<string>,
  mode: PinPickerMode = 'power',
): void {
  const catalog = pinCatalogForMode(mode);
  const initKey = PIN_OPTIONS_INIT_KEYS[mode];

  if (select.dataset[initKey] !== 'true') {
    select.replaceChildren();
    select.placeholder = placeholderForMode(mode);

    for (const entry of catalog) {
      select.appendChild(createWaPinOption(entry.id, entry.label));
    }

    select.appendChild(
      createWaPinOption(CUSTOM_PIN_VALUE, 'Custom (type pin name or number)'),
    );

    select.dataset[initKey] = 'true';
  }

  applyUsedPresetOptionStatesToSelect(select, catalog, usedPresets);
}

/**
 * Toggle `disabled` on existing preset options. Does not recreate nodes or change `value`.
 */
export function applyUsedPresetOptionStatesToSelect(
  select: Element,
  catalog: PinCatalogEntry[],
  usedPresets: ReadonlySet<string>,
): void {
  const labels = new Map(catalog.map((entry) => [entry.id, entry.label]));

  select.querySelectorAll('wa-option').forEach((el) => {
    const opt = el as WaOptionElement;
    const val = opt.value;
    if (!val || val === CUSTOM_PIN_VALUE) {
      return;
    }
    const baseLabel = labels.get(val);
    if (!baseLabel) {
      return;
    }

    const inUse = usedPresets.has(val);
    opt.disabled = inUse;
    opt.textContent = inUse ? `${baseLabel} (in use)` : baseLabel;
  });
}
