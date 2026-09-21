import { describe, expect, it, beforeEach } from 'vitest';
import { MAX_PRESETS } from '../validation/limits';
import {
  $presets,
  activePresetChanged,
  getActivePreset,
  presetAdded,
  presetDuplicated,
  presetRemoved,
  presetStyleUpdated,
  presetUpdated,
  presetsResetToDefaults,
} from './presets';
import { bladeAdded } from './wiring';

describe('presets store', () => {
  beforeEach(() => {
    presetsResetToDefaults();
  });

  it('changes active preset when id exists', () => {
    const state = $presets.getState();
    const next = state.presets[1]!.id;
    activePresetChanged(next);
    expect($presets.getState().activePresetId).toBe(next);
    activePresetChanged('missing');
    expect($presets.getState().activePresetId).toBe(next);
  });

  it('adds, duplicates, and removes presets', () => {
    const initialCount = $presets.getState().presets.length;
    presetAdded();
    expect($presets.getState().presets).toHaveLength(initialCount + 1);

    const added = getActivePreset($presets.getState())!;
    presetDuplicated(added.id);
    expect($presets.getState().presets).toHaveLength(initialCount + 2);

    presetRemoved(added.id);
    expect($presets.getState().presets.some((preset) => preset.id === added.id)).toBe(false);
  });

  it('does not remove the last preset', () => {
    const only = $presets.getState().presets[0]!;
    while ($presets.getState().presets.length > 1) {
      presetRemoved($presets.getState().presets.at(-1)!.id);
    }
    presetRemoved(only.id);
    expect($presets.getState().presets).toHaveLength(1);
  });

  it('updates preset fields and slot styles', () => {
    const active = getActivePreset($presets.getState())!;
    presetUpdated({ id: active.id, patch: { name: 'Renamed' } });
    expect(getActivePreset($presets.getState())?.name).toBe('Renamed');

    presetStyleUpdated({
      presetId: active.id,
      slotIndex: 0,
      style: {
        kind: 'named',
        ref: 'rainbow',
        args: [],
        overrides: {},
        customLine: '',
      },
    });
    expect(getActivePreset($presets.getState())?.styles[0]?.ref).toBe('rainbow');
  });

  it('syncs style slot count when wiring changes', () => {
    presetsResetToDefaults();
    const before = getActivePreset($presets.getState())!.styles.length;
    bladeAdded();
    expect(getActivePreset($presets.getState())!.styles.length).toBeGreaterThanOrEqual(before);
  });

  it('respects max preset count', () => {
    presetsResetToDefaults();
    while ($presets.getState().presets.length < MAX_PRESETS) {
      presetAdded();
    }
    const count = $presets.getState().presets.length;
    presetAdded();
    expect($presets.getState().presets).toHaveLength(count);
    presetDuplicated('missing-id');
    presetDuplicated(getActivePreset($presets.getState())!.id);
    expect($presets.getState().presets).toHaveLength(count);
  });
});
