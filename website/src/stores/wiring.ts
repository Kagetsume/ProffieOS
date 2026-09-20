/**
 * Blade wiring table (Effector).
 *
 * `$wiring` is the source of truth for `config/blades.ini` content.
 * UI pages dispatch events; `$export` derives INI text from this store.
 *
 * @module stores/wiring
 */
import { createEvent, createStore, sample } from 'effector';
import type { BladeDefinition } from '../model/blades';
import { MAX_BLADES } from '../validation/limits';
import { $boardProfileId, getProfileBlades } from './project';

/** Merge a partial patch into the blade with the given index. */
export const bladeUpdated = createEvent<{ index: number; patch: Partial<BladeDefinition> }>();

/** Append a new default NeoPixel blade (empty power pin row). */
export const bladeAdded = createEvent<void>();

/** Remove blade by index. */
export const bladeRemoved = createEvent<number>();

/** Replace entire wiring table from the active board profile catalog entry. */
export const applyProfileDefaults = createEvent<void>();

/** All blade definitions, initially loaded from `proffie_v3` profile. */
export const $wiring = createStore<BladeDefinition[]>(getProfileBlades('proffie_v3'))
  .on(bladeUpdated, (blades, { index, patch }) =>
    blades.map((b) => (b.index === index ? { ...b, ...patch } : b)),
  )
  .on(bladeRemoved, (blades, index) => blades.filter((b) => b.index !== index))
  .on(bladeAdded, (blades) => {
    if (blades.length >= MAX_BLADES) {
      return blades;
    }
    const used = new Set(blades.map((b) => b.index));
    let nextIndex = 0;
    while (used.has(nextIndex) && nextIndex < MAX_BLADES) {
      nextIndex += 1;
    }
    if (nextIndex >= MAX_BLADES) {
      return blades;
    }
    return [
      ...blades,
      {
        index: nextIndex,
        type: 'ws2811',
        dataPin: 'bladePin',
        pixels: 144,
        powerPins: [''],
      },
    ];
  });

sample({
  clock: applyProfileDefaults,
  source: $boardProfileId,
  fn: (profileId) => getProfileBlades(profileId),
  target: $wiring,
});
