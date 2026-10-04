/**
 * Parse `config/board.ini` hardware options.
 *
 * @module parse/boardIni
 */
import { DEFAULT_BOARD_FEATURES, type BoardFeaturesState } from '../model/board';
import { meaningfulIniLines, parseButtonCount, parseKeyValue, parseOnOff } from './ini-util';

/** Parse board.ini into {@link BoardFeaturesState} (defaults for omitted keys). */
export function parseBoardIni(text: string): BoardFeaturesState {
  const state: BoardFeaturesState = { ...DEFAULT_BOARD_FEATURES };

  for (const line of meaningfulIniLines(text)) {
    const kv = parseKeyValue(line);
    if (!kv) {
      continue;
    }
    const key = kv.key.toLowerCase();
    if (key === 'buttons') {
      state.buttons = parseButtonCount(kv.value, state.buttons);
    } else if (key === 'oled') {
      state.oled = parseOnOff(kv.value, state.oled);
    } else if (key === 'bluetooth') {
      state.bluetooth = parseOnOff(kv.value, state.bluetooth);
    } else if (key === 'gesture') {
      state.gesture = parseOnOff(kv.value, state.gesture);
    } else if (key === 'twist_on') {
      state.twistOn = parseOnOff(kv.value, state.twistOn);
    } else if (key === 'twist_off') {
      state.twistOff = parseOnOff(kv.value, state.twistOff);
    }
  }

  return state;
}
