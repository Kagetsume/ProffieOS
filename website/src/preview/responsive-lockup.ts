/**
 * Approximate {@link ResponsiveLockupL} for blade preview.
 *
 * Firmware uses Bump at Scale&lt;BladeAngle, TOP, BOTTOM&gt; with audio flicker.
 * Preview keeps geometry stable: only {@link PreviewSimState.bladeAngleNorm} moves the zone.
 *
 * @module preview/responsive-lockup
 */

const PROFFIE_SCALE = 32768;

/** Defaults from ResponsiveLockupL in styles/responsive_styles.h */
const LOCKUP_TOP_LOW = 4000;
const LOCKUP_TOP_HIGH = 26000;
const LOCKUP_BOTTOM = 6000;
const LOCKUP_SIZE_MID = (9000 + 14000) / 2;

/** Overall lockup preview gain (alpha reaches full white more often). */
const LOCKUP_BRIGHTNESS = 1.45;

/** Lockup zone center along the blade, 0 = hilt, 1 = tip. */
export function responsiveLockupCenter(bladeAngleNorm: number): number {
  const angle = Math.max(0, Math.min(1, bladeAngleNorm));
  const top = (LOCKUP_TOP_LOW + (LOCKUP_TOP_HIGH - LOCKUP_TOP_LOW) * angle) / PROFFIE_SCALE;
  const bottom = LOCKUP_BOTTOM / PROFFIE_SCALE;
  return bottom + (top - bottom) * angle;
}

/** Half-width of the lockup bump in normalized blade space (fixed mid size). */
export function responsiveLockupHalfWidth(): number {
  return LOCKUP_SIZE_MID / PROFFIE_SCALE / 2;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  if (x <= edge0) {
    return 0;
  }
  if (x >= edge1) {
    return 1;
  }
  const t = (x - edge0) / (edge1 - edge0);
  return t * t * (3 - 2 * t);
}

/** Bump mask 0…1 at normalized position t along the blade. */
export function responsiveLockupBump(t: number, bladeAngleNorm: number): number {
  const center = responsiveLockupCenter(bladeAngleNorm);
  const half = Math.max(0.04, responsiveLockupHalfWidth());
  const inner = center - half * 0.55;
  const outer = center + half;
  const rise = smoothStep(inner, center, t);
  const fall = 1 - smoothStep(center, outer, t);
  return Math.max(0, Math.min(1, rise * fall));
}

function previewNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Audio-reactive burst envelope — used by lightning-block preview only. */
export function lockupBurst(timeMs: number, rate = 55): number {
  const phase = (timeMs / rate) % 1;
  if (phase < 0.12) {
    return 1;
  }
  if (phase < 0.28) {
    return 0.45;
  }
  return 0.7 + previewNoise(timeMs / 90) * 0.3;
}

/** Per-pixel brightness jitter for crackling lockup color (not zone position). */
export function responsiveLockupColorScale(
  pixelIndex: number,
  timeMs: number,
  strength: number,
): number {
  if (strength >= 0.72) {
    return 1;
  }
  const frame = Math.floor(timeMs / 42);
  return 0.9 + previewNoise(pixelIndex * 3.7 + frame * 11.3) * 0.1;
}

/**
 * Lockup intensity within the bump: blade angle sets zone position;
 * time adds localized static/crackle (zone does not drift on its own).
 */
export function responsiveLockupStrength(
  t: number,
  pixelIndex: number,
  bladeAngleNorm: number,
  timeMs: number,
): number {
  const bump = responsiveLockupBump(t, bladeAngleNorm);
  if (bump <= 0) {
    return 0;
  }

  const frame = Math.floor(timeMs / 42);
  const sparkFrame = Math.floor(timeMs / 95);
  const grain = previewNoise(pixelIndex * 2.11 + frame * 17.3);
  const crackle = previewNoise(pixelIndex * 4.07 + frame * 31.7);
  const spark =
    previewNoise(pixelIndex * 7.13 + sparkFrame * 23.1) > 0.74
      ? 0.55 + previewNoise(frame * 5.9 + pixelIndex) * 0.45
      : 0;

  const envelope = 0.82 + lockupBurst(timeMs, 70) * 0.18;
  const flicker = 0.5 + grain * 0.3 + crackle * 0.28 + spark;
  return Math.min(1, bump * flicker * envelope * LOCKUP_BRIGHTNESS);
}
