/**
 * Simplified per-style renderers for approximate blade preview.
 *
 * @module preview/renderers/basic
 */
import { getNamedStyle } from '../../model/style-catalog';
import type { StyleLayer } from '../../model/style-sections';
import { resolveLayerArgs } from '../../model/style-sections';
import { createPixelBuffer, fillSolid, type PixelBuffer } from '../composite';
import { lerpRgb, parseColor } from '../colors';
import {
  isBaseBladeVisible,
  isOverlayPhaseActive,
  overlayPhaseForStyle,
  type PreviewSimState,
} from '../simulation';
import { responsiveLockupStrength } from '../responsive-lockup';
import { renderEventOverlay } from './overlays';

function positionT(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return index / (count - 1);
}

function renderTransparentOverlay(count: number): PixelBuffer {
  return createPixelBuffer(count);
}

function renderStandardLike(args: string[], count: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'cyan');
  const tip = lerpRgb(base, parseColor(args[1] ?? 'white'), 0.35);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const [r, g, b] = lerpRgb(base, tip, t);
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderSolidBase(args: string[], count: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'cyan');
  const buffer = createPixelBuffer(count);
  fillSolid(buffer, base);
  return buffer;
}

/** Built-in standard lockup: ResponsiveLockupL-style localized bump + flicker. */
function applyStandardResponsiveLockup(
  buffer: PixelBuffer,
  args: string[],
  count: number,
  bladeAngleNorm: number,
  timeMs: number,
): PixelBuffer {
  const flicker = parseColor(args[4] ?? args[1] ?? 'white');
  for (let i = 0; i < buffer.r.length; i += 1) {
    const t = positionT(i, count);
    const mix = responsiveLockupStrength(t, i, bladeAngleNorm, timeMs);
    if (mix <= 0) {
      continue;
    }
    const [r, g, b] = lerpRgb([buffer.r[i]!, buffer.g[i]!, buffer.b[i]!], flicker, mix);
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
  }
  return buffer;
}

function renderRainbow(_args: string[], count: number, timeMs: number): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const phase = (timeMs / 40) % 360;
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const hue = (phase + t * 120) % 360;
    const [r, g, b] = hslToRgb(hue, 0.85, 0.5);
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

/** Slow organic smoke band — varying blob sizes, one scroll direction. */
function renderSmokeFlowMask(
  args: string[],
  count: number,
  timeMs: number,
  direction: 1 | -1,
): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const dark = parseColor(args[0] ?? 'black');
  const bright = parseColor(args[1] ?? 'white');
  const luminanceOnly =
    args[0] === args[1] ||
    (bright[0] === dark[0] && bright[1] === dark[1] && bright[2] === dark[2]);
  const phase = (direction * timeMs) / 1800;
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const bandA = (Math.sin(t * 0.85 - phase) + 1) / 2;
    const bandB = (Math.sin(t * 0.55 + phase * 0.62 + 1.2) + 1) / 2;
    const blob = Math.max(bandA, bandB * 0.8);
    let heat = blob;
    const clearCutoff = 0.74;
    if (heat > clearCutoff) {
      heat = 1;
    } else {
      heat /= clearCutoff;
    }
    if (luminanceOnly) {
      const shade = Math.round(heat * 255);
      buffer.r[i] = shade;
      buffer.g[i] = shade;
      buffer.b[i] = shade;
    } else {
      const [r, g, b] = lerpRgb(dark, bright, heat);
      buffer.r[i] = r;
      buffer.g[i] = g;
      buffer.b[i] = b;
    }
    buffer.a[i] = 1;
  }
  return buffer;
}

/** smoke_flow: opposing multi-band rolls with spatial width/phase warp. */
function renderSmokeFlowBlend(args: string[], count: number, timeMs: number): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const dark = parseColor(args[0] ?? 'black');
  const bright = parseColor(args[1] ?? 'white');
  const luminanceOnly =
    args[0] === args[1] ||
    (bright[0] === dark[0] && bright[1] === dark[1] && bright[2] === dark[2]);
  const downTimeMs = timeMs + 4800;
  const scrollUp = (timeMs * 9) / 10;
  const scrollDown = (downTimeMs * 5) / 14;
  for (let i = 0; i < count; i += 1) {
    const pos = Math.round(positionT(i, count) * 32768);
    const heat = rollFlowShade(pos, scrollUp, scrollDown, timeMs, downTimeMs);
    if (luminanceOnly) {
      const shade = Math.round(heat * 255);
      buffer.r[i] = shade;
      buffer.g[i] = shade;
      buffer.b[i] = shade;
    } else {
      const [r, g, b] = lerpRgb(dark, bright, heat);
      buffer.r[i] = r;
      buffer.g[i] = g;
      buffer.b[i] = b;
    }
    buffer.a[i] = 1;
  }
  return buffer;
}

function flowWavelength(base: number, pos: number, bandSeed: number, timeIdx: number): number {
  const sp = ((pos >> 4) + bandSeed) & 1023;
  const sp2 = ((pos >> 7) + bandSeed * 13) & 1023;
  return (
    base +
    Math.sin(sp * 0.006135923) * 4096 +
    Math.sin(sp2 * 0.006135923) * 2048 +
    Math.sin(timeIdx * 0.006135923) * 2048
  );
}

function flowPhaseWarp(pos: number, seed: number): number {
  const sp = ((pos >> 5) + seed) & 1023;
  const sp2 = ((pos >> 9) + seed * 17) & 1023;
  return Math.sin(sp * 0.006135923) * 2048 + Math.sin(sp2 * 0.006135923) * 1024;
}

function rollFlowShade(
  pos: number,
  scrollUp: number,
  scrollDown: number,
  timeMs: number,
  downTimeMs: number,
): number {
  const tUp = (timeMs >> 5) & 1023;
  const tDn = ((downTimeMs >> 5) + 512) & 1023;
  const creep = (downTimeMs * 1000) >> 12;
  const warpUp = flowPhaseWarp(pos, 117);
  const warpDn = flowPhaseWarp(pos, 503);
  const phaseUp = pos - scrollUp + warpUp;
  const phaseDn = pos + scrollDown + creep + warpDn;
  const wUp1 = flowWavelength(26000, pos, 11, tUp);
  const wUp2 = flowWavelength(18000, pos, 29, (tUp + 171) & 1023);
  const wDn1 = flowWavelength(21000, pos, 47, (tDn + 85) & 1023);
  const wDn2 = flowWavelength(15500, pos, 73, (tDn + 341) & 1023);
  const sUp1 = Math.sin((phaseUp / wUp1) * Math.PI * 2);
  const sUp2 = Math.sin((phaseUp / wUp2) * Math.PI * 2);
  const sDn1 = Math.sin((phaseDn / wDn1) * Math.PI * 2);
  const sDn2 = Math.sin((phaseDn / wDn2) * Math.PI * 2);
  const bright = 0.5 + 0.21 * sUp1 + 0.07 * sUp2 + 0.07 * sDn1 + 0.035 * sDn2;
  return Math.max(0.22, Math.min(0.92, bright));
}

/** Grayscale rolling heat — used by smoke recipes (`fire white white` in multiply). */
function renderRollingHeatMask(count: number, timeMs: number): PixelBuffer {
  return renderSmokeFlowMask(['white', 'white'], count, timeMs, 1);
}

function isGrayscaleFireArgs(args: string[]): boolean {
  if (args.length < 2) {
    return false;
  }
  if (args[0] === args[1]) {
    return true;
  }
  const warm = parseColor(args[0] ?? 'red');
  const hot = parseColor(args[1] ?? 'yellow');
  return warm[0] === hot[0] && warm[1] === hot[1] && warm[2] === hot[2];
}

function renderFire(args: string[], count: number, timeMs: number): PixelBuffer {
  if (isGrayscaleFireArgs(args)) {
    return renderRollingHeatMask(count, timeMs);
  }

  const warm = parseColor(args[0] ?? 'red');
  const hot = parseColor(args[1] ?? 'yellow');
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const wave = (Math.sin(t * 14 + timeMs / 180) + 1) / 2;
    const heat = (Math.sin(t * 6 - timeMs / 260) + 1) / 2;
    const mix = Math.max(0, Math.min(1, t * 0.55 + wave * 0.35 + heat * 0.2));
    const [r, g, b] = lerpRgb(warm, hot, mix);
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderStrobe(args: string[], count: number, timeMs: number): PixelBuffer {
  const standby = parseColor(args[0] ?? 'black');
  const flash = parseColor(args[1] ?? 'white');
  const freq = Number(args[2] ?? '15') || 15;
  const buffer = createPixelBuffer(count);
  const on = Math.sin((timeMs / 1000) * freq * Math.PI * 2) > 0;
  fillSolid(buffer, on ? flash : standby);
  return buffer;
}

function renderPulse(args: string[], count: number, timeMs: number): PixelBuffer {
  const color = parseColor(args[0] ?? 'white');
  const pulseMs = Number(args[1] ?? '3000') || 3000;
  const buffer = createPixelBuffer(count);
  const wave = (Math.sin((timeMs / pulseMs) * Math.PI * 2) + 1) / 2;
  for (let i = 0; i < count; i += 1) {
    buffer.r[i] = color[0];
    buffer.g[i] = color[1];
    buffer.b[i] = color[2];
    buffer.a[i] = 0.25 + wave * 0.75;
  }
  return buffer;
}

function renderStripes(args: string[], count: number, timeMs: number): PixelBuffer {
  const c1 = parseColor(args[2] ?? 'white');
  const c2 = parseColor(args[3] ?? 'black');
  const speed = Number(args[1] ?? '-3000') || -3000;
  const width = Math.max(200, Number(args[0] ?? '2500') || 2500);
  const buffer = createPixelBuffer(count);
  const scroll = (timeMs / 1000) * (speed / 1000);
  for (let i = 0; i < count; i += 1) {
    const phase = Math.sin((i / count) * width * 0.002 + scroll);
    const [r, g, b] = phase > 0 ? c1 : c2;
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderGradient(args: string[], count: number): PixelBuffer {
  const hilt = parseColor(args[0] ?? 'red');
  const tip = parseColor(args[1] ?? 'blue');
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const [r, g, b] = lerpRgb(hilt, tip, positionT(i, count));
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderAudio(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const flicker = parseColor(args[1] ?? 'white');
  const buffer = createPixelBuffer(count);
  const hum = (Math.sin(timeMs / 120) + 1) / 2;
  for (let i = 0; i < count; i += 1) {
    const [r, g, b] = lerpRgb(base, flicker, hum * 0.45);
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
  }
  return buffer;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function isTextureStyle(style: string): boolean {
  return getNamedStyle(style)?.group === 'texture';
}

export type LayerRenderOptions = {
  /** Section includes lockup / responsive_lockup overlay — skip standard built-in lockup. */
  dedicatedLockupLayer?: boolean;
};

/** Render one layer to a pixel buffer (count = LED pixels). */
export function renderLayerPixels(
  layer: StyleLayer,
  vars: Record<string, string>,
  count: number,
  timeMs: number,
  sim: PreviewSimState,
  options: LayerRenderOptions = {},
): PixelBuffer {
  const args = resolveLayerArgs(layer, vars);
  const style = layer.styleName;
  const now = timeMs;
  const phase = overlayPhaseForStyle(style);

  if (phase) {
    if (!isOverlayPhaseActive(phase, sim, now)) {
      return renderTransparentOverlay(count);
    }
    const eventOverlay = renderEventOverlay(style, args, count, now, sim);
    if (eventOverlay) {
      return eventOverlay;
    }
    if (phase === 'idle_on') {
      return renderTransparentOverlay(count);
    }
    return renderTransparentOverlay(count);
  }

  if (!isBaseBladeVisible(sim, now) && !isTextureStyle(style)) {
    return renderTransparentOverlay(count);
  }

  if (isTextureStyle(style) && !isBaseBladeVisible(sim, now)) {
    return renderTransparentOverlay(count);
  }

  switch (style) {
    case 'standard':
    case 'standard_bend': {
      const base = renderStandardLike(args, count);
      if (sim.lockupActive && !options.dedicatedLockupLayer) {
        return applyStandardResponsiveLockup(base, args, count, sim.bladeAngleNorm, timeMs);
      }
      return base;
    }
    case 'solid':
    case 'solid_bend':
      return renderSolidBase(args, count);
    case 'sparktip':
    case 'water_flow':
    case 'darksaber':
    case 'static_electricity':
    case 'power_wave':
    case 'unstable_blades':
    case 'fallen_order':
    case 'thunder_loop':
    case 'responsive_flame':
    case 'shimmer_blade':
    case 'rotoscope':
    case 'pulse_stripes':
    case 'kinetic_charge':
    case 'rotating_pulse':
    case 'trickle_blade':
    case 'flicker':
    case 'sparkle_blade':
      return renderStandardLike(args, count);
    case 'rainbow':
      return renderRainbow(args, count, timeMs);
    case 'fire':
    case 'fire_mask':
      return renderFire(args, count, timeMs);
    case 'smoke_up':
      return renderSmokeFlowMask(args, count, timeMs, 1);
    case 'smoke_down':
      return renderSmokeFlowMask(args, count, timeMs, -1);
    case 'smoke_flow':
      return renderSmokeFlowBlend(args, count, timeMs);
    case 'strobe':
      return renderStrobe(args, count, timeMs);
    case 'pulse':
      return renderPulse(args, count, timeMs);
    case 'stripes':
    case 'hard_stripes':
      return renderStripes(args, count, timeMs);
    case 'gradient':
      return renderGradient(args, count);
    case 'audio':
      return renderAudio(args, count, timeMs);
    case 'pulse_blade': {
      const off = parseColor(args[0] ?? 'black');
      const on = parseColor(args[1] ?? 'white');
      const pulseMs = Number(args[2] ?? '3000') || 3000;
      const wave = (Math.sin((timeMs / pulseMs) * Math.PI * 2) + 1) / 2;
      const buffer = createPixelBuffer(count);
      const color = lerpRgb(off, on, wave);
      fillSolid(buffer, color);
      return buffer;
    }
    case 'noise_flicker': {
      const base = parseColor(args[0] ?? 'black');
      const flicker = parseColor(args[1] ?? 'white');
      const buffer = createPixelBuffer(count);
      for (let i = 0; i < count; i += 1) {
        const n = (Math.sin(i * 13 + timeMs / 90) + Math.sin(i * 7 - timeMs / 130)) / 2;
        const [r, g, b] = lerpRgb(base, flicker, (n + 1) / 2);
        buffer.r[i] = r;
        buffer.g[i] = g;
        buffer.b[i] = b;
        buffer.a[i] = 1;
      }
      return buffer;
    }
    default:
      return renderStandardLike(args.length ? args : ['cyan', 'white'], count);
  }
}
