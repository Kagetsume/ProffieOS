/**
 * Parse `config/blades.ini` into {@link BladeDefinition} rows.
 *
 * @module parse/bladesIni
 */
import type { ActiveState, BladeDefinition, BladeType, SubBladeRange } from '../model/blades';
import { isBoardHeaderComment, parseKeyValue, parseUserCommentLine } from './ini-util';

function parseSubBladeValue(value: string): SubBladeRange | null {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2) {
    return null;
  }
  const first = Number.parseInt(parts[0]!, 10);
  const last = Number.parseInt(parts[1]!, 10);
  if (!Number.isFinite(first) || !Number.isFinite(last)) {
    return null;
  }
  return { first, last };
}

type BladeDraft = {
  index: number;
  type: BladeType;
  dataPin: string;
  pixels?: number;
  powerPins: string[];
  subBlades: SubBladeRange[];
  led?: string;
  activeState?: ActiveState;
  comment?: string;
};

function finalizeDraft(draft: BladeDraft): BladeDefinition {
  const blade: BladeDefinition = {
    index: draft.index,
    type: draft.type,
    dataPin: draft.dataPin,
  };
  if (draft.comment?.trim()) {
    blade.comment = draft.comment.trim();
  }
  if (draft.type === 'simple') {
    if (draft.led) {
      blade.led = draft.led;
    }
    if (draft.activeState) {
      blade.activeState = draft.activeState;
    }
    return blade;
  }
  if (draft.pixels != null) {
    blade.pixels = draft.pixels;
  }
  const pins = draft.powerPins.filter((pin) => pin.trim().length > 0);
  if (pins.length > 0) {
    blade.powerPins = pins.length === 1 ? pins : [...draft.powerPins];
  }
  if (draft.subBlades.length > 0) {
    blade.subBlades = draft.subBlades;
  }
  return blade;
}

/**
 * Best-effort parse of blades.ini body (comments and `end` tolerated).
 *
 * @returns Blade list sorted by index; empty when no valid blocks found.
 */
export function parseBladesIni(text: string): BladeDefinition[] {
  const rawLines = text.split(/\r?\n/);
  const blades: BladeDefinition[] = [];
  let draft: BladeDraft | null = null;
  let pendingComment: string | undefined;

  const flush = (): void => {
    if (!draft) {
      return;
    }
    if (!draft.dataPin.trim()) {
      draft = null;
      return;
    }
    blades.push(finalizeDraft(draft));
    draft = null;
    pendingComment = undefined;
  };

  for (const raw of rawLines) {
    const userComment = parseUserCommentLine(raw);
    if (userComment != null && !draft) {
      pendingComment = userComment;
      continue;
    }
    if (isBoardHeaderComment(raw)) {
      continue;
    }

    const line = stripAndComment(raw);
    if (!line) {
      continue;
    }
    if (line === 'end') {
      flush();
      break;
    }

    const kv = parseKeyValue(line);
    if (!kv) {
      continue;
    }

    const key = kv.key.toLowerCase();
    if (key === 'blade') {
      flush();
      const index = Number.parseInt(kv.value, 10);
      if (!Number.isFinite(index)) {
        continue;
      }
      draft = {
        index,
        type: 'ws2811',
        dataPin: '',
        powerPins: [],
        subBlades: [],
        comment: pendingComment,
      };
      pendingComment = undefined;
      continue;
    }

    if (!draft) {
      continue;
    }

    if (key === 'type' && kv.value.toLowerCase() === 'simple') {
      draft.type = 'simple';
    } else if (key === 'data_pin' || key === 'datapin') {
      draft.dataPin = kv.value;
    } else if (key === 'pixels') {
      const pixels = Number.parseInt(kv.value, 10);
      if (Number.isFinite(pixels)) {
        draft.pixels = pixels;
      }
    } else if (key === 'power_pin') {
      draft.powerPins = [kv.value];
    } else if (/^power_pin\d+$/.test(key)) {
      const slot = Number.parseInt(key.slice('power_pin'.length), 10);
      if (Number.isFinite(slot) && slot >= 1) {
        while (draft.powerPins.length < slot) {
          draft.powerPins.push('');
        }
        draft.powerPins[slot - 1] = kv.value;
      }
    } else if (key === 'sub_blade') {
      const range = parseSubBladeValue(kv.value);
      if (range) {
        draft.subBlades.push(range);
      }
    } else if (key === 'led') {
      draft.led = kv.value;
    } else if (key === 'active_state' || key === 'active_state1') {
      const token = kv.value.toLowerCase();
      if (token === 'high' || token === 'low') {
        draft.activeState = token;
      }
    }
  }

  flush();
  return blades.sort((a, b) => a.index - b.index);
}

function stripAndComment(raw: string): string {
  const hash = raw.indexOf('#');
  const core = hash >= 0 ? raw.slice(0, hash) : raw;
  return core.trim();
}

/** Quick validity check without throwing. */
export function bladesIniHasContent(text: string): boolean {
  return parseBladesIni(text).length > 0;
}
