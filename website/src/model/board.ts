/**
 * Board and feature toggles for `config/board.ini` and `config/features.ini`.
 *
 * @module model/board
 */

export type ButtonCount = 1 | 2 | 3;

/** Hardware + gesture fields edited in the app. */
export type BoardFeaturesState = {
  buttons: ButtonCount;
  oled: boolean;
  bluetooth: boolean;
  gesture: boolean;
  twistOn: boolean;
  twistOff: boolean;
};

export const DEFAULT_BOARD_FEATURES: BoardFeaturesState = {
  buttons: 2,
  oled: true,
  bluetooth: true,
  gesture: true,
  twistOn: true,
  twistOff: true,
};
