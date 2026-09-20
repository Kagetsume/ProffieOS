/**
 * Tests for cross-blade data pin usage store.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../model/blades';
import { getUsedDataPinsForPicker, wiringWithBladeDataPin } from './data-pin-usage';

const blades: BladeDefinition[] = [
  { index: 0, type: 'ws2811', dataPin: 'bladePin', pixels: 144, powerPins: ['bladePowerPin1'] },
  { index: 1, type: 'simple', dataPin: 'blade5Pin', led: 'CreeXPE2White', activeState: 'high' },
  { index: 2, type: 'simple', dataPin: 'blade6Pin', led: 'CreeXPE2White', activeState: 'high' },
];

describe('data pin usage store', () => {
  it('getUsedDataPinsForPicker includes pins from other blades', () => {
    const used = getUsedDataPinsForPicker(0, blades);
    expect(used.has('blade5Pin')).toBe(true);
    expect(used.has('blade6Pin')).toBe(true);
    expect(used.has('bladePin')).toBe(false);
  });

  it('wiringWithBladeDataPin substitutes in-progress data pin', () => {
    const merged = wiringWithBladeDataPin(blades, 2, 'blade7Pin');
    expect(merged[2]?.dataPin).toBe('blade7Pin');
    expect(merged[1]?.dataPin).toBe('blade6Pin');
  });
});
