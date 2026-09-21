import { describe, expect, it } from 'vitest';
import { $boardFeatures, boardFeaturesChanged } from './boardFeatures';

describe('boardFeatures store', () => {
  it('merges partial feature updates', () => {
    const before = $boardFeatures.getState();
    boardFeaturesChanged({ bluetooth: !before.bluetooth });
    expect($boardFeatures.getState().bluetooth).toBe(!before.bluetooth);
    boardFeaturesChanged({ bluetooth: before.bluetooth });
  });
});
