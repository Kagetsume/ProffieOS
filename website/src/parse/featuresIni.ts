/**
 * Parse `config/features.ini` gesture / twist toggles.
 *
 * @module parse/featuresIni
 */
import type { BoardFeaturesState } from '../model/board';
import { meaningfulIniLines, parseKeyValue, parseOnOff } from './ini-util';

export type FeaturesIniPatch = Pick<BoardFeaturesState, 'gesture' | 'twistOn' | 'twistOff'>;

/** Parse features.ini — only keys present in the file are returned. */
export function parseFeaturesIni(text: string): Partial<FeaturesIniPatch> {
  const patch: Partial<FeaturesIniPatch> = {};

  for (const line of meaningfulIniLines(text)) {
    const kv = parseKeyValue(line);
    if (!kv) {
      continue;
    }
    const key = kv.key.toLowerCase();
    if (key === 'gesture') {
      patch.gesture = parseOnOff(kv.value, true);
    } else if (key === 'twist_on') {
      patch.twistOn = parseOnOff(kv.value, true);
    } else if (key === 'twist_off') {
      patch.twistOff = parseOnOff(kv.value, true);
    }
  }

  return patch;
}
