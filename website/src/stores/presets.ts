/**
 * Presets store (Effector) — `config/presets.ini`.
 *
 * @module stores/presets
 */
import { createEvent, createStore, sample } from 'effector';
import { contextLogger } from '../logger';
import {
  clonePreset,
  createDefaultPresets,
  createEmptyPreset,
  type PresetDefinition,
} from '../model/presets';
import { normalizePresetStyles, type PresetStyle } from '../model/preset-styles';
import { totalLogicalBladeSlots } from '../model/sub-blades';
import { MAX_PRESETS } from '../validation/limits';
import { $wiring } from './wiring';

export type PresetsState = {
  presets: PresetDefinition[];
  activePresetId: string;
};

const defaultSlotCount = 4;
const defaultPresets = createDefaultPresets(defaultSlotCount);

export const activePresetChanged = createEvent<string>();
export const presetAdded = createEvent<void>();
export const presetDuplicated = createEvent<string>();
export const presetRemoved = createEvent<string>();
export const presetUpdated = createEvent<{ id: string; patch: Partial<Omit<PresetDefinition, 'id'>> }>();
export const presetStyleUpdated = createEvent<{
  presetId: string;
  slotIndex: number;
  style: PresetStyle;
}>();
export const presetsResetToDefaults = createEvent<void>();
export const presetStyleSlotsSynced = createEvent<number>();

function findPreset(presets: PresetDefinition[], id: string): PresetDefinition | undefined {
  return presets.find((preset) => preset.id === id);
}

function slotCountFromWiring(): number {
  return Math.max(1, totalLogicalBladeSlots($wiring.getState()));
}

export const $presets = createStore<PresetsState>({
  presets: defaultPresets,
  activePresetId: defaultPresets[0]!.id,
})
  .on(activePresetChanged, (state, id) => {
    if (!findPreset(state.presets, id)) {
      return state;
    }
    return { ...state, activePresetId: id };
  })
  .on(presetAdded, (state) => {
    if (state.presets.length >= MAX_PRESETS) {
      return state;
    }
    const slotCount = slotCountFromWiring();
    const preset = createEmptyPreset(slotCount);
    return {
      presets: [...state.presets, preset],
      activePresetId: preset.id,
    };
  })
  .on(presetDuplicated, (state, id) => {
    if (state.presets.length >= MAX_PRESETS) {
      return state;
    }
    const source = findPreset(state.presets, id);
    if (!source) {
      return state;
    }
    const slotCount = slotCountFromWiring();
    const preset = clonePreset(source, slotCount);
    return {
      presets: [...state.presets, preset],
      activePresetId: preset.id,
    };
  })
  .on(presetRemoved, (state, id) => {
    if (state.presets.length <= 1) {
      return state;
    }
    const presets = state.presets.filter((preset) => preset.id !== id);
    const activePresetId =
      state.activePresetId === id ? presets[0]!.id : state.activePresetId;
    return { presets, activePresetId };
  })
  .on(presetUpdated, (state, { id, patch }) => {
    return {
      ...state,
      presets: state.presets.map((preset) =>
        preset.id === id ? { ...preset, ...patch } : preset,
      ),
    };
  })
  .on(presetStyleUpdated, (state, { presetId, slotIndex, style }) => {
    return {
      ...state,
      presets: state.presets.map((preset) => {
        if (preset.id !== presetId) {
          return preset;
        }
        const styles = [...preset.styles];
        styles[slotIndex] = style;
        return { ...preset, styles };
      }),
    };
  })
  .on(presetsResetToDefaults, () => {
    const slotCount = slotCountFromWiring();
    const presets = createDefaultPresets(slotCount);
    return {
      presets,
      activePresetId: presets[0]!.id,
    };
  })
  .on(presetStyleSlotsSynced, (state, slotCount) => {
    const count = Math.max(1, slotCount);
    return {
      ...state,
      presets: state.presets.map((preset) => ({
        ...preset,
        styles: normalizePresetStyles(preset.styles, count),
      })),
    };
  });

sample({
  clock: $wiring,
  fn: (blades) => totalLogicalBladeSlots(blades),
  target: presetStyleSlotsSynced,
});

/** Active preset for editor panels. */
export function getActivePreset(state: PresetsState): PresetDefinition | undefined {
  return findPreset(state.presets, state.activePresetId);
}

activePresetChanged.watch((id) => {
  contextLogger('presets', 'activePresetChanged').debug('dispatched', { id });
});
presetAdded.watch(() => {
  contextLogger('presets', 'presetAdded').debug('dispatched');
});
presetDuplicated.watch((id) => {
  contextLogger('presets', 'presetDuplicated').debug('dispatched', { id });
});
presetRemoved.watch((id) => {
  contextLogger('presets', 'presetRemoved').debug('dispatched', { id });
});
presetUpdated.watch(({ id, patch }) => {
  contextLogger('presets', 'presetUpdated').debug('dispatched', {
    id,
    patchKeys: Object.keys(patch),
  });
});
presetStyleUpdated.watch((payload) => {
  contextLogger('presets', 'presetStyleUpdated').debug('dispatched', payload);
});
presetsResetToDefaults.watch(() => {
  contextLogger('presets', 'presetsResetToDefaults').debug('dispatched');
});
