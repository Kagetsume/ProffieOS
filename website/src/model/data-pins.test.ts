import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from './blades';
import {
  boardPinReferenceLabel,
  isPresetDataPin,
  listDataPinOptions,
  masterUsedDataPins,
  usedDataPinsForPicker,
} from './data-pins';

const blades: BladeDefinition[] = [
  { index: 0, type: 'ws2811', dataPin: 'bladePin', pixels: 144, powerPins: ['bladePowerPin1'] },
  { index: 1, type: 'simple', dataPin: 'blade5Pin', led: 'CreeXPE2White', activeState: 'high' },
  { index: 2, type: 'simple', dataPin: 'blade6Pin', led: 'CreeXPE2White', activeState: 'high' },
];

describe('data-pins', () => {
  it('boardPinReferenceLabel maps preset pins to silkscreen text', () => {
    expect(boardPinReferenceLabel('blade5Pin')).toBe('Free 1 / accent PWM (blade5Pin)');
    expect(boardPinReferenceLabel('20')).toBe('20');
    expect(boardPinReferenceLabel('')).toBe('');
  });

  it('lists Proffie board data pin names with labels', () => {
    const ids = listDataPinOptions().map((entry) => entry.id);
    expect(ids).toContain('bladePin');
    expect(ids).toContain('blade5Pin');
    expect(isPresetDataPin('blade7Pin')).toBe(true);
    expect(isPresetDataPin('99')).toBe(false);
  });

  it('marks data pins used on other blades', () => {
    expect(usedDataPinsForPicker(blades, 0)).toEqual(new Set(['blade5Pin', 'blade6Pin']));
    expect(usedDataPinsForPicker(blades, 1)).toEqual(new Set(['bladePin', 'blade6Pin']));
  });

  it('masterUsedDataPins lists every assigned preset pin', () => {
    expect(masterUsedDataPins(blades)).toEqual(
      new Set(['bladePin', 'blade5Pin', 'blade6Pin']),
    );
  });
});
