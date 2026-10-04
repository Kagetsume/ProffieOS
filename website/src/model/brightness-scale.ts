/**
 * Multiply-mask brightness scale used by texture layer min/max/strength (matches firmware).
 *
 * @module model/brightness-scale
 */

export const BRIGHTNESS65535_SCALE = 65535;

/** Parse INI token: `%` suffix (decimals OK), or n>100 raw scale, or n<=100 as percent. */
export function parseBrightness65535Token(token: string): number {
  const trimmed = token.trim();
  if (!trimmed) return 0;

  let hasPercent = false;
  let core = trimmed;
  if (core.endsWith('%')) {
    hasPercent = true;
    core = core.slice(0, -1).trim();
  }

  const n = Number.parseFloat(core);
  if (!Number.isFinite(n)) return 0;

  if (hasPercent) {
    const pct = Math.max(0, Math.min(100, n));
    return Math.round((pct * BRIGHTNESS65535_SCALE) / 100);
  }
  if (n > 100) {
    return Math.max(0, Math.min(BRIGHTNESS65535_SCALE, Math.trunc(n)));
  }
  const pct = Math.max(0, n);
  return Math.round((pct * BRIGHTNESS65535_SCALE) / 100);
}

/** Internal scale → nearest whole percent for UI (0–100). */
export function brightness65535ToPercent(internal: number): number {
  const clamped = Math.max(0, Math.min(BRIGHTNESS65535_SCALE, internal));
  return Math.round((clamped / BRIGHTNESS65535_SCALE) * 100);
}

/** Serialize internal value for `blade_styles.ini` as a percent token. */
export function formatBrightness65535Export(internal: number): string {
  const clamped = Math.max(0, Math.min(BRIGHTNESS65535_SCALE, internal));
  if (clamped >= BRIGHTNESS65535_SCALE) return '100%';
  const pct = (clamped / BRIGHTNESS65535_SCALE) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) {
    return `${Math.round(rounded)}%`;
  }
  return `${rounded}%`;
}
