/**
 * Tests for cross-blade power pin usage store.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../model/blades';
import { getUsedPresetsForPicker, wiringWithBladePins } from './power-pin-usage';

const twoBlades: BladeDefinition[] = [
  { index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: ['bladePowerPin1'] },
  { index: 1, type: 'ws2811', dataPin: 'blade2Pin', powerPins: ['bladePowerPin2', ''] },
];

describe('power pin usage store', () => {
  it('getUsedPresetsForPicker includes pins from other blades', () => {
    const used = getUsedPresetsForPicker(1, ['', ''], 0, twoBlades);
    expect(used.has('bladePowerPin1')).toBe(true);
    expect(used.has('bladePowerPin2')).toBe(false);
  });

  it('wiringWithBladePins substitutes in-progress pins for one blade', () => {
    const merged = wiringWithBladePins(twoBlades, 1, ['bladePowerPin3', '']);
    expect(merged[1]?.powerPins).toEqual(['bladePowerPin3', '']);
    expect(merged[0]?.powerPins).toEqual(['bladePowerPin1']);
  });

});
