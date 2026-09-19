/**
 * Unit tests for {@link module:model/power-pins} — add/remove/update rules and export filtering.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from './blades';
import {
  addPowerPinRow,
  exportablePowerPins,
  masterUsedPresetPins,
  normalizePowerPinList,
  removePowerPinRow,
  updatePowerPinRow,
  powerPinListsEqual,
  usedPresetsForPicker,
  usedPresetsOnOtherRows,
} from './power-pins';

describe('power pin list model', () => {
  it('addPowerPinRow preserves existing selections and appends an empty slot', () => {
    expect(addPowerPinRow(['bladePowerPin1', 'bladePowerPin2'])).toEqual([
      'bladePowerPin1',
      'bladePowerPin2',
      '',
    ]);
  });

  it('addPowerPinRow does not drop filled rows when a new row is added', () => {
    const before = ['bladePowerPin1'];
    const after = addPowerPinRow(before);
    expect(after[0]).toBe('bladePowerPin1');
    expect(after).toHaveLength(2);
    expect(after[1]).toBe('');
  });

  it('updatePowerPinRow changes only the targeted index', () => {
    expect(updatePowerPinRow(['bladePowerPin1', ''], 1, 'bladePowerPin2')).toEqual([
      'bladePowerPin1',
      'bladePowerPin2',
    ]);
  });

  it('removePowerPinRow removes one row without altering others', () => {
    expect(removePowerPinRow(['bladePowerPin1', 'bladePowerPin2', ''], 1)).toEqual([
      'bladePowerPin1',
      '',
    ]);
  });

  it('normalizePowerPinList keeps empty slots for in-progress editing', () => {
    expect(normalizePowerPinList([' bladePowerPin1 ', ''])).toEqual(['bladePowerPin1', '']);
  });

  it('usedPresetsOnOtherRows disables presets picked on sibling rows only', () => {
    const used = usedPresetsOnOtherRows(['bladePowerPin1', 'bladePowerPin2', ''], 2);
    expect(used).toEqual(new Set(['bladePowerPin1', 'bladePowerPin2']));
  });

  it('usedPresetsOnOtherRows ignores the current row selection', () => {
    const used = usedPresetsOnOtherRows(['bladePowerPin1', 'bladePowerPin2'], 1);
    expect(used.has('bladePowerPin2')).toBe(false);
    expect(used.has('bladePowerPin1')).toBe(true);
  });

  it('exportablePowerPins strips blank entries for INI export', () => {
    expect(exportablePowerPins(['bladePowerPin1', '', 'bladePowerPin3'])).toEqual([
      'bladePowerPin1',
      'bladePowerPin3',
    ]);
  });

  it('powerPinListsEqual treats undefined as one empty row', () => {
    expect(powerPinListsEqual(undefined, [''])).toBe(true);
  });

  it('masterUsedPresetPins unions preset pins across NeoPixel blades', () => {
    const blades: BladeDefinition[] = [
      { index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: ['bladePowerPin1', ''] },
      { index: 1, type: 'ws2811', dataPin: 'blade2Pin', powerPins: ['bladePowerPin2'] },
      { index: 2, type: 'simple', dataPin: 'blade3Pin', led: 'CreeXPE2White' },
    ];
    expect(masterUsedPresetPins(blades)).toEqual(new Set(['bladePowerPin1', 'bladePowerPin2']));
  });

  it('usedPresetsForPicker includes pins from other blades', () => {
    const blades: BladeDefinition[] = [
      { index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: ['bladePowerPin1'] },
      { index: 1, type: 'ws2811', dataPin: 'blade2Pin', powerPins: ['bladePowerPin2', ''] },
    ];
    const used = usedPresetsForPicker(blades, 1, ['bladePowerPin2', ''], 1);
    expect(used.has('bladePowerPin1')).toBe(true);
    expect(used.has('bladePowerPin2')).toBe(false);
  });
});
