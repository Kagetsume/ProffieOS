/**
 * Board + feature toggles (Effector) — `board.ini` and `features.ini`.
 *
 * @module stores/boardFeatures
 */
import { createEvent, createStore } from 'effector';
import { contextLogger } from '../logger';
import { DEFAULT_BOARD_FEATURES, type BoardFeaturesState } from '../model/board';

export const boardFeaturesChanged = createEvent<Partial<BoardFeaturesState>>();

export const $boardFeatures = createStore<BoardFeaturesState>(DEFAULT_BOARD_FEATURES).on(
  boardFeaturesChanged,
  (state, patch) => ({ ...state, ...patch }),
);

boardFeaturesChanged.watch((patch) => {
  contextLogger('boardFeatures', 'boardFeaturesChanged').debug('dispatched', {
    patchKeys: Object.keys(patch),
  });
});
