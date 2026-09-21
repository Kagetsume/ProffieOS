/**
 * Tests for pin picker pure helpers.
 */
import { describe, expect, it } from 'vitest';
import {
  CUSTOM_PIN_VALUE,
  dataPinCatalog,
  isPresetPinForMode,
  pinCatalogForMode,
  powerPinCatalog,
  selectValueForPin,
} from './pin-picker-utils';

describe('pin-picker-utils', () => {
  it('lists power and data catalogs', () => {
    expect(powerPinCatalog().some((entry) => entry.id === 'bladePowerPin1')).toBe(true);
    expect(dataPinCatalog().some((entry) => entry.id === 'bladePin')).toBe(true);
    expect(pinCatalogForMode('power')).toEqual(powerPinCatalog());
    expect(pinCatalogForMode('data')).toEqual(dataPinCatalog());
  });

  it('maps stored values to select values', () => {
    expect(selectValueForPin('bladePowerPin1', 'power')).toBe('bladePowerPin1');
    expect(selectValueForPin('42', 'power')).toBe(CUSTOM_PIN_VALUE);
    expect(selectValueForPin('', 'data')).toBe('');
  });

  it('detects preset pins per mode', () => {
    expect(isPresetPinForMode('bladePin', 'data')).toBe(true);
    expect(isPresetPinForMode('99', 'data')).toBe(false);
  });
});
