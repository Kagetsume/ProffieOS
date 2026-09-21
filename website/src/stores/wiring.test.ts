import { describe, expect, it } from 'vitest';
import { MAX_BLADES } from '../validation/limits';
import { $wiring, applyProfileDefaults, bladeAdded, bladeRemoved, bladeUpdated } from './wiring';

describe('wiring store', () => {
  it('updates a blade by index', () => {
    const before = $wiring.getState();
    const target = before[0]!;
    bladeUpdated({ index: target.index, patch: { pixels: 200 } });
    expect($wiring.getState().find((blade) => blade.index === target.index)?.pixels).toBe(200);
  });

  it('adds and removes blades', () => {
    const start = $wiring.getState().length;
    bladeAdded();
    expect($wiring.getState().length).toBe(start + 1);

    const added = $wiring.getState().at(-1)!;
    bladeRemoved(added.index);
    expect($wiring.getState().some((blade) => blade.index === added.index)).toBe(false);
  });

  it('does not exceed max blades', () => {
    applyProfileDefaults();
    while ($wiring.getState().length < MAX_BLADES) {
      bladeAdded();
    }
    const count = $wiring.getState().length;
    bladeAdded();
    expect($wiring.getState().length).toBe(count);
  });

  it('reloads profile defaults', () => {
    bladeUpdated({ index: 0, patch: { pixels: 1 } });
    applyProfileDefaults();
    expect($wiring.getState()[0]?.pixels).not.toBe(1);
  });
});
