/**
 * Pure helpers for {@link PoPinPicker} — wa-select option setup without innerHTML rebuild.
 *
 * @module ui/elements/pin-picker-utils
 */
import pinOptions from '../../catalog/pin-options.json';
import { isPresetPowerPin } from '../../model/power-pins';

export { isPresetPowerPin };

/** `wa-select` value when user chooses free-form pin entry. */
export const CUSTOM_PIN_VALUE = '__custom__';

/** Dataset flag: preset `<wa-option>` nodes were created for this select. */
const PIN_OPTIONS_INIT = 'pinOptionsInit';

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

/**
 * Map stored pin string to the select's `value` property.
 * Presets map 1:1; custom values map to {@link CUSTOM_PIN_VALUE}.
 */
export function selectValueForPin(value: string): string {
  if (!value) {
    return '';
  }
  if (isPresetPowerPin(value)) {
    return value;
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
): void {
  if (select.dataset[PIN_OPTIONS_INIT] !== 'true') {
    if (!select.placeholder) {
      select.placeholder = 'Select power pin…';
    }

    for (const pin of pinOptions.powerPins) {
      select.appendChild(createWaPinOption(pin, pin));
    }

    select.appendChild(
      createWaPinOption(CUSTOM_PIN_VALUE, 'Custom (type pin name or number)'),
    );

    select.dataset[PIN_OPTIONS_INIT] = 'true';
  }

  applyUsedPresetOptionStatesToSelect(select, usedPresets);
}

/**
 * Toggle `disabled` on existing preset options. Does not recreate nodes or change `value`.
 */
export function applyUsedPresetOptionStatesToSelect(
  select: Element,
  usedPresets: ReadonlySet<string>,
): void {
  select.querySelectorAll('wa-option').forEach((el) => {
    const opt = el as WaOptionElement;
    const val = opt.value;
    if (!val || val === CUSTOM_PIN_VALUE) {
      return;
    }
    if (!isPresetPowerPin(val)) {
      return;
    }

    const inUse = usedPresets.has(val);
    opt.disabled = inUse;
    opt.textContent = inUse ? `${val} (already used)` : val;
  });
}
