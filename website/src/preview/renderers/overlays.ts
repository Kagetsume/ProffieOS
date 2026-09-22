/**
 * Event-triggered overlay renderers for approximate blade preview.
 *
 * @module preview/renderers/overlays
 */
import {
  eventIntensity,
  isPostoffActive,
  isPreonActive,
  PREVIEW_DURATIONS,
  transitionProgress,
  type PreviewSimState,
} from '../simulation';
import { createPixelBuffer, type PixelBuffer } from '../composite';
import { parseColor } from '../colors';
import {
  lockupBurst,
  responsiveLockupColorScale,
  responsiveLockupStrength,
} from '../responsive-lockup';

function positionT(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return index / (count - 1);
}

function fillColor(buffer: PixelBuffer, color: [number, number, number], alpha: number): void {
  for (let i = 0; i < buffer.r.length; i += 1) {
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = alpha;
  }
}

/** Cheap 1D noise for preview flicker (not cryptographically random). */
function previewNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function renderBlastOverlay(
  args: string[],
  count: number,
  intensity: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  fillColor(buffer, color, intensity);
  return buffer;
}

export function renderBlastWaveOverlay(
  args: string[],
  count: number,
  intensity: number,
  timeMs: number,
  anchorIndex?: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  const waveTravel = ((timeMs / 12) % (count + 20)) - 10;
  const waveCenter =
    anchorIndex === undefined ? waveTravel : anchorIndex + waveTravel * 0.25;
  for (let i = 0; i < count; i += 1) {
    const dist = Math.abs(i - waveCenter);
    const band = Math.max(0, 1 - dist / 8);
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = intensity * band;
  }
  return buffer;
}

/** Gaussian-ish falloff approximating firmware clash_hump (localized clash only). */
function localizedClashFalloff(distNorm: number): number {
  const x = Math.max(0, Math.min(1, distNorm));
  return Math.exp(-x * x * 6);
}

function renderLocalizedClashOverlay(
  color: [number, number, number],
  count: number,
  intensity: number,
  centerIndex: number,
  halfWidth: number,
): PixelBuffer {
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const dist = Math.abs(i - centerIndex) / Math.max(1, halfWidth);
    const alpha = intensity * localizedClashFalloff(dist);
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = alpha;
  }
  return buffer;
}

export function renderClashOverlay(
  args: string[],
  count: number,
  intensity: number,
  style: string,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);

  // SimpleClashL: full-blade flash (clash layer + built-in standard clash).
  if (style === 'clash') {
    fillColor(buffer, color, intensity);
    return buffer;
  }

  // LocalizedClashL: band in the middle half of the blade (~50% width default).
  if (style === 'localized_clash') {
    const center = Math.floor(count * 0.5);
    const halfWidth = Math.max(2, Math.floor(count * 0.25));
    return renderLocalizedClashOverlay(color, count, intensity, center, halfWidth);
  }

  // RealClash V1: wider angle-reactive bump (approximate).
  const center = Math.floor(count * 0.55);
  const halfWidth = Math.max(4, Math.floor(count * 0.18));
  return renderLocalizedClashOverlay(color, count, intensity, center, halfWidth);
}

export function renderSwingOverlay(
  args: string[],
  count: number,
  intensity: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const edge = 0.35 + t * 0.65;
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = intensity * edge;
  }
  return buffer;
}

export function renderPreonGlow(args: string[], count: number, progress: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'blue');
  const buffer = createPixelBuffer(count);
  const alpha = Math.sin(progress * Math.PI) * 0.95;
  fillColor(buffer, color, alpha);
  return buffer;
}

export function renderPreonWipe(args: string[], count: number, progress: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'green');
  const buffer = createPixelBuffer(count);
  const edge = progress * count;
  for (let i = 0; i < count; i += 1) {
    if (i <= edge) {
      buffer.r[i] = color[0];
      buffer.g[i] = color[1];
      buffer.b[i] = color[2];
      buffer.a[i] = 0.9;
    }
  }
  return buffer;
}

export function renderPreonSputter(args: string[], count: number, progress: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'blue');
  const buffer = createPixelBuffer(count);
  const lit = Math.floor(count * progress);
  for (let i = 0; i < lit; i += 1) {
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = 0.85;
  }
  return buffer;
}

export function renderPostoffGlow(args: string[], count: number, progress: number): PixelBuffer {
  return renderPreonGlow(args, count, 1 - progress);
}

export function renderPostoffWipe(args: string[], count: number, progress: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  const edge = (1 - progress) * count;
  for (let i = 0; i < count; i += 1) {
    if (i >= edge) {
      buffer.r[i] = color[0];
      buffer.g[i] = color[1];
      buffer.b[i] = color[2];
      buffer.a[i] = 0.85;
    }
  }
  return buffer;
}

export function renderPostoffSputter(
  args: string[],
  count: number,
  progress: number,
): PixelBuffer {
  return renderPreonSputter(args, count, 1 - progress);
}

export function renderIgnitionFlash(
  args: string[],
  count: number,
  intensity: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  fillColor(buffer, color, intensity);
  return buffer;
}

/** Full-blade Force glow — hum-modulated (approximates SmoothSoundLevel). */
export function renderForceGlow(
  args: string[],
  count: number,
  intensity: number,
  timeMs: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  const hum = 0.55 + ((Math.sin(timeMs / 90) + 1) / 2) * 0.45;
  fillColor(buffer, color, intensity * hum);
  return buffer;
}

export function renderLockupOverlay(
  args: string[],
  count: number,
  intensity: number,
  bladeAngleNorm: number,
  timeMs: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);

  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const strength = responsiveLockupStrength(t, i, bladeAngleNorm, timeMs);
    if (strength <= 0) {
      continue;
    }
    const alpha = intensity * strength;
    const dim = responsiveLockupColorScale(i, timeMs, strength);
    const hotBoost = strength >= 0.72 ? 48 : 0;
    buffer.r[i] = Math.min(255, Math.round(color[0] * dim + hotBoost));
    buffer.g[i] = Math.min(255, Math.round(color[1] * dim + hotBoost));
    buffer.b[i] = Math.min(255, Math.round(color[2] * dim + hotBoost));
    buffer.a[i] = alpha;
  }
  return buffer;
}

/** SmoothStep band near the tip — approximates ResponsiveDragL LOCATION ~32000. */
function dragTipMask(t: number, band: number): number {
  const tip = 1;
  const start = tip - band;
  if (t <= start) {
    return 0;
  }
  if (t >= tip) {
    return 1;
  }
  const u = (t - start) / band;
  return u * u * (3 - 2 * u);
}

export function renderDragOverlay(
  args: string[],
  count: number,
  intensity: number,
  timeMs: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'orange');
  const buffer = createPixelBuffer(count);
  const twistBand = 0.14 + ((Math.sin(timeMs / 180) + 1) / 2) * 0.1;
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const tip = dragTipMask(t, twistBand);
    const shimmer = 0.75 + previewNoise(i * 2.3 + timeMs / 65) * 0.25;
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = intensity * tip * shimmer;
  }
  return buffer;
}

export function renderMeltOverlay(
  args: string[],
  count: number,
  intensity: number,
  timeMs: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'orange');
  const buffer = createPixelBuffer(count);
  const drip = (Math.sin(timeMs / 200) + 1) / 2;
  for (let i = 0; i < count; i += 1) {
    const t = i / Math.max(1, count - 1);
    const hot = Math.max(0, 1 - Math.abs(t - (0.65 + drip * 0.15)) * 6);
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = intensity * hot;
  }
  return buffer;
}

export function renderLbOverlay(
  args: string[],
  count: number,
  intensity: number,
  timeMs: number,
): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  const burst = lockupBurst(timeMs, 40);
  const zones = [
    (Math.sin(timeMs / 320) + 1) / 2,
    (Math.sin(timeMs / 470 + 1.2) + 1) / 2,
    (Math.sin(timeMs / 610 + 2.4) + 1) / 2,
  ];

  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    let zone = 0;
    for (const center of zones) {
      const dist = Math.abs(t - center);
      zone = Math.max(zone, Math.max(0, 1 - dist * 12));
    }
    const spark = previewNoise(i * 3.1 + timeMs / 28) > 0.72 ? 1 : 0.2;
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = intensity * zone * spark * burst * 0.85;
  }
  return buffer;
}

export function renderSparkleOverlay(args: string[], count: number, timeMs: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const spark = Math.sin(i * 17 + timeMs / 80) > 0.92 ? 0.7 : 0;
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = spark;
  }
  return buffer;
}

export function renderEventOverlay(
  styleName: string,
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer | null {
  const now = timeMs;

  switch (styleName) {
    case 'blast': {
      const intensity = eventIntensity(sim.blastUntil, now, PREVIEW_DURATIONS.blast);
      return intensity > 0 ? renderBlastOverlay(args, count, intensity) : null;
    }
    case 'blast_wave_random': {
      const intensity = eventIntensity(sim.blastUntil, now, PREVIEW_DURATIONS.blast);
      return intensity > 0 ? renderBlastWaveOverlay(args, count, intensity, now) : null;
    }
    case 'responsive_blast': {
      const intensity = eventIntensity(sim.blastUntil, now, PREVIEW_DURATIONS.blast);
      if (intensity <= 0) {
        return null;
      }
      const anchor = Math.round(sim.bladeAngleNorm * Math.max(0, count - 1));
      return renderBlastWaveOverlay(args, count, intensity, now, anchor);
    }
    case 'clash':
    case 'localized_clash':
    case 'real_clash': {
      const intensity = eventIntensity(sim.clashUntil, now, PREVIEW_DURATIONS.clash);
      return intensity > 0 ? renderClashOverlay(args, count, intensity, styleName) : null;
    }
    case 'responsive_clash': {
      const intensity = eventIntensity(sim.clashUntil, now, PREVIEW_DURATIONS.clash);
      if (intensity <= 0) {
        return null;
      }
      const color = parseColor(args[0] ?? 'white');
      const center = Math.round(sim.bladeAngleNorm * Math.max(0, count - 1));
      const halfWidth = Math.max(3, Math.floor(count * 0.15));
      return renderLocalizedClashOverlay(color, count, intensity, center, halfWidth);
    }
    case 'swing': {
      const intensity = eventIntensity(sim.swingUntil, now, PREVIEW_DURATIONS.swing);
      return intensity > 0 ? renderSwingOverlay(args, count, intensity) : null;
    }
    case 'preon_glow':
      return isPreonActive(sim, now)
        ? renderPreonGlow(args, count, transitionProgress(sim, now))
        : null;
    case 'preon_wipe':
      return isPreonActive(sim, now)
        ? renderPreonWipe(args, count, transitionProgress(sim, now))
        : null;
    case 'preon_sputter':
      return isPreonActive(sim, now)
        ? renderPreonSputter(args, count, transitionProgress(sim, now))
        : null;
    case 'postoff_glow':
      return isPostoffActive(sim, now)
        ? renderPostoffGlow(args, count, transitionProgress(sim, now))
        : null;
    case 'postoff_wipe':
      return isPostoffActive(sim, now)
        ? renderPostoffWipe(args, count, transitionProgress(sim, now))
        : null;
    case 'postoff_sputter':
      return isPostoffActive(sim, now)
        ? renderPostoffSputter(args, count, transitionProgress(sim, now))
        : null;
    case 'ignition_flash': {
      if (sim.transition === 'extending') {
        const duration = sim.transitionUntil - sim.transitionStartedAt;
        const elapsed = duration > 0 ? (now - sim.transitionStartedAt) / duration : 1;
        const intensity = Math.max(0, 1 - Math.min(1, elapsed));
        return intensity > 0 ? renderIgnitionFlash(args, count, intensity) : null;
      }
      const intensity = eventIntensity(sim.ignitionUntil, now, PREVIEW_DURATIONS.ignition);
      return intensity > 0 ? renderIgnitionFlash(args, count, intensity) : null;
    }
    case 'sparkle':
      return sim.powered && sim.transition === 'none'
        ? renderSparkleOverlay(args, count, now)
        : null;
    case 'force_glow': {
      const intensity = eventIntensity(sim.forceUntil, now, PREVIEW_DURATIONS.force);
      return intensity > 0 ? renderForceGlow(args, count, intensity, now) : null;
    }
    case 'lockup':
    case 'responsive_lockup':
      return sim.lockupActive
        ? renderLockupOverlay(args, count, 1, sim.bladeAngleNorm, now)
        : null;
    case 'drag':
      return sim.dragActive ? renderDragOverlay(args, count, 1, now) : null;
    case 'lb':
      return sim.lbActive ? renderLbOverlay(args, count, 1, now) : null;
    case 'melt':
      return sim.meltActive ? renderMeltOverlay(args, count, 1, now) : null;
    default:
      return null;
  }
}

