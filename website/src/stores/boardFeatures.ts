/**
 * Board + feature toggles (Effector) — `board.ini` and `features.ini`.
 *
 * @module stores/boardFeatures
 */
import { createEvent, createStore } from 'effector';
import { DEFAULT_BOARD_FEATURES, type BoardFeaturesState } from '../model/board';

export const boardFeaturesChanged = createEvent<Partial<BoardFeaturesState>>();

export const $boardFeatures = createStore<BoardFeaturesState>(DEFAULT_BOARD_FEATURES).on(
  boardFeaturesChanged,
  (state, patch) => ({ ...state, ...patch }),
);
