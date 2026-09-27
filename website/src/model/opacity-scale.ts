/**
 * Fixed-point opacity / brightness scale used by config layer compositing (matches firmware).
 *
 * @module model/opacity-scale
 */

export const OPACITY_SCALE = 32768;

/** Parse INI token: `%` suffix, or n>100 raw scale, or n<=100 as percent (100 = full). */
export function parseOpacityScaleToken(token: string): number {
  const trimmed = token.trim();
  if (!trimmed) return 0;

  let hasPercent = false;
  let core = trimmed;
  if (core.endsWith('%')) {
    hasPercent = true;
    core = core.slice(0, -1).trim();
  }

  const n = Number.parseInt(core, 10);
  if (!Number.isFinite(n)) return 0;

  if (hasPercent) {
    const pct = Math.max(0, Math.min(100, n));
    return Math.round((pct * OPACITY_SCALE) / 100);
  }
  if (n > 100) {
    return Math.max(0, Math.min(OPACITY_SCALE, n));
  }
  const pct = Math.max(0, n);
  return Math.round((pct * OPACITY_SCALE) / 100);
}

/** Internal scale → nearest whole percent for UI (0–100). */
export function opacityScaleToPercent(internal: number): number {
  const clamped = Math.max(0, Math.min(OPACITY_SCALE, internal));
  return Math.round((clamped / OPACITY_SCALE) * 100);
}

/** Serialize internal value for `blade_styles.ini` as a percent token. */
export function formatOpacityScaleExport(internal: number): string {
  const clamped = Math.max(0, Math.min(OPACITY_SCALE, internal));
  if (clamped >= OPACITY_SCALE) return '100';
  return `${opacityScaleToPercent(clamped)}%`;
}

/** Parse user percent input (0–100) to internal scale. */
export function percentToOpacityScale(percent: number): number {
  const pct = Math.max(0, Math.min(100, percent));
  return Math.round((pct * OPACITY_SCALE) / 100);
}
