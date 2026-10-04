/**
 * Shared helpers for parsing ProffieOS SD config INI text.
 *
 * @module parse/ini-util
 */

/** Strip inline `#` comments and trim. */
export function stripIniComment(line: string): string {
  const hash = line.indexOf('#');
  const core = hash >= 0 ? line.slice(0, hash) : line;
  return core.trim();
}

/** Split file into non-empty, non-comment lines (trimmed). */
export function meaningfulIniLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(stripIniComment)
    .filter((line) => line.length > 0);
}

/** Parse `key = value` (first `=` only). */
export function parseKeyValue(line: string): { key: string; value: string } | null {
  const eq = line.indexOf('=');
  if (eq < 0) {
    return null;
  }
  const key = line.slice(0, eq).trim();
  const value = line.slice(eq + 1).trim();
  if (!key) {
    return null;
  }
  return { key, value };
}

/** True for generated board header comments (`# ---- … ----`). */
export function isBoardHeaderComment(rawLine: string): boolean {
  const trimmed = rawLine.trim();
  return trimmed.startsWith('# ----') && trimmed.endsWith('----');
}

/** User `#` note line (not a board header). */
export function parseUserCommentLine(rawLine: string): string | null {
  const trimmed = rawLine.trim();
  if (!trimmed.startsWith('#')) {
    return null;
  }
  if (isBoardHeaderComment(rawLine)) {
    return null;
  }
  return trimmed.slice(1).trim();
}

/** Parse firmware on/off tokens. */
export function parseOnOff(value: string, fallback: boolean): boolean {
  const token = value.trim().toLowerCase();
  if (token === 'on') {
    return true;
  }
  if (token === 'off') {
    return false;
  }
  return fallback;
}

/** Parse button count (1–3). */
export function parseButtonCount(value: string, fallback: 1 | 2 | 3): 1 | 2 | 3 {
  const n = Number.parseInt(value.trim(), 10);
  if (n === 1 || n === 2 || n === 3) {
    return n;
  }
  return fallback;
}
