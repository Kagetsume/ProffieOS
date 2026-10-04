/**
 * Parse `config/presets.ini` preset blocks.
 *
 * @module parse/presetsIni
 */
import { createPresetId, type PresetDefinition } from '../model/presets';
import { parsePresetStyleLine } from '../model/preset-styles';
import { parseKeyValue, stripIniComment } from './ini-util';

type PresetDraft = Omit<PresetDefinition, 'id'>;

/**
 * Parse preset list from presets.ini text.
 *
 * @returns Presets in file order with fresh editor ids.
 */
export function parsePresetsIni(text: string): PresetDefinition[] {
  const presets: PresetDefinition[] = [];
  let draft: PresetDraft | null = null;
  let pendingComment: string | undefined;

  for (const raw of text.split(/\r?\n/)) {
    const commentMatch = raw.trim().match(/^#\s*(.+)$/);
    if (commentMatch && !draft) {
      pendingComment = commentMatch[1]!.trim();
      continue;
    }

    const line = stripIniComment(raw);
    if (!line) {
      continue;
    }
    if (line === 'end') {
      if (draft) {
        presets.push({ ...draft, id: createPresetId() });
        draft = null;
      }
      break;
    }

    if (line === 'new_preset') {
      if (draft) {
        presets.push({ ...draft, id: createPresetId() });
      }
      draft = {
        font: 'LiquidStatic',
        track: 'tracks/hum.wav',
        name: 'Imported preset',
        variation: 0,
        styles: [],
        comment: pendingComment,
      };
      pendingComment = undefined;
      continue;
    }

    const kv = parseKeyValue(line);
    if (!kv) {
      continue;
    }

    const key = kv.key.toLowerCase();

    if (!draft) {
      continue;
    }

    if (key === 'font') {
      draft.font = kv.value;
    } else if (key === 'voice') {
      draft.voice = kv.value;
    } else if (key === 'track') {
      draft.track = kv.value;
    } else if (key === 'name') {
      draft.name = kv.value;
    } else if (key === 'variation') {
      const variation = Number.parseInt(kv.value, 10);
      draft.variation = Number.isFinite(variation) ? variation : 0;
    } else if (key === 'style') {
      draft.styles = [...draft.styles, parsePresetStyleLine(kv.value)];
    }
  }

  if (draft) {
    presets.push({ ...draft, id: createPresetId() });
  }

  return presets.filter((preset) => preset.styles.length > 0 || preset.name.trim().length > 0);
}
