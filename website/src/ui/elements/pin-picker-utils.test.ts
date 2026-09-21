/**
 * Tests for programmatic wa-select / wa-option setup per Web Awesome docs.
 */
import { describe, expect, it } from 'vitest';
import {
  applyUsedPresetOptionStatesToSelect,
  createWaPinOption,
  CUSTOM_PIN_VALUE,
  initPinSelectOptions,
  powerPinCatalog,
  selectValueForPin,
} from './pin-picker-utils';

describe('pin-picker-utils', () => {
  it('maps custom values to the custom select option', () => {
    expect(selectValueForPin('20')).toBe(CUSTOM_PIN_VALUE);
    expect(selectValueForPin('bladePowerPin2')).toBe('bladePowerPin2');
    expect(selectValueForPin('blade5Pin', 'data')).toBe('blade5Pin');
    expect(selectValueForPin('')).toBe('');
  });

  it('creates wa-option elements once and sets disabled via property', () => {
    const row = document.createElement('div');
    row.innerHTML =
      '<wa-select class="pin-picker-select" placeholder="Select power pin…"></wa-select>';
    const select = row.querySelector('wa-select.pin-picker-select')!;

    initPinSelectOptions(select as HTMLElement & { value: string; placeholder: string; dataset: DOMStringMap }, new Set(['bladePowerPin1']), 'power');
    expect(select.querySelectorAll('wa-option').length).toBeGreaterThan(0);

    initPinSelectOptions(select as HTMLElement & { value: string; placeholder: string; dataset: DOMStringMap }, new Set(['bladePowerPin1', 'bladePowerPin2']), 'power');
    const countAfterSecondInit = select.querySelectorAll('wa-option').length;

    initPinSelectOptions(select as HTMLElement & { value: string; placeholder: string; dataset: DOMStringMap }, new Set(['bladePowerPin1']), 'power');
    expect(select.querySelectorAll('wa-option').length).toBe(countAfterSecondInit);

    const pin1 = Array.from(select.querySelectorAll('wa-option')).find(
      (o) => (o as HTMLElement & { value: string }).value === 'bladePowerPin1',
    ) as HTMLElement & { disabled: boolean };
    expect(pin1.disabled).toBe(true);
  });

  it('applyUsedPresetOptionStatesToSelect does not remove option nodes', () => {
    const select = document.createElement('wa-select');
    select.appendChild(createWaPinOption('bladePowerPin1', 'bladePowerPin1'));
    select.appendChild(createWaPinOption('bladePowerPin2', 'bladePowerPin2'));
    (select as HTMLElement & { dataset: DOMStringMap }).dataset.pinOptionsInitPower = 'true';

    const before = select.querySelectorAll('wa-option').length;
    applyUsedPresetOptionStatesToSelect(select, powerPinCatalog(), new Set(['bladePowerPin1']));
    expect(select.querySelectorAll('wa-option').length).toBe(before);
  });
});
