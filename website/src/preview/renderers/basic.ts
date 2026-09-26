/**
 * Simplified per-style renderers for approximate blade preview.
 *
 * @module preview/renderers/basic
 */
import { getNamedStyle } from '../../model/style-catalog';
import type { StyleLayer } from '../../model/style-sections';
import { resolvedLayerArgs } from '../../model/style-sections';
import { createPixelBuffer, fillSolid, type PixelBuffer } from '../composite';
import { lerpRgb, parseColor } from '../colors';
import {
  bladeLengthFraction,
  eventIntensity,
  isBaseBladeVisible,
  isOverlayPhaseActive,
  overlayPhaseForStyle,
  PREVIEW_DURATIONS,
  type PreviewSimState,
} from '../simulation';
import { responsiveLockupStrength } from '../responsive-lockup';
import { renderEventOverlay } from './overlays';
import {
  brightnessOverlayFromFlickerArgs,
  brightnessOverlayFromPulseArgs,
  brightnessOverlayFromSwingArgs,
  brightnessOverlayScale,
} from '../uniform-brightness-overlay';
import { renderOs7MonolithicBase, renderOs7TextureLayer } from './os7-layers';

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

/** 1 keeps the firmware scroll (`time * 9/10` up, `time * 5/14` down). */
const SMOKE_FLOW_ROLL_SPEED = 1;

function smokeRollSpeed(raw: string | undefined): number {
  if (raw == null || raw.trim() === '') {
    return SMOKE_FLOW_ROLL_SPEED;
  }
  const speed = Number(raw);
  return Number.isFinite(speed) ? speed : SMOKE_FLOW_ROLL_SPEED;
}

/** Positive ms, or the simulator fallback when the arg is missing or soundfont auto (`-1`). */
function smokeTimingMs(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return Math.max(1, fallback);
  }
  return parsed;
}

/**
 * How far this smoke layer has extended, relative to the blade.
 * Matching extend/retract tracks {@link bladeLengthFraction}. A longer time lags behind.
 */
function smokeFlowLengthFraction(args: string[], timeMs: number, sim: PreviewSimState): number {
  const blade = bladeLengthFraction(sim, timeMs);
  if (sim.transition === 'extending') {
    const extendMs = smokeTimingMs(args[2], sim.extendMs);
    return Math.min(1, blade * (Math.max(1, sim.extendMs) / extendMs));
  }
  if (sim.transition === 'retracting') {
    const retractMs = smokeTimingMs(args[3], sim.retractMs);
    const pulled = (1 - blade) * (Math.max(1, sim.retractMs) / retractMs);
    return Math.max(0, Math.min(1, 1 - pulled));
  }
  return blade;
}

/** smoke_flow: opposing multi-band rolls with spatial width/phase warp. */
function renderSmokeFlowBlend(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const dark = parseColor(args[0] ?? 'black');
  const bright = parseColor(args[1] ?? 'white');
  const luminanceOnly =
    args[0] === args[1] ||
    (bright[0] === dark[0] && bright[1] === dark[1] && bright[2] === dark[2]);
  const speed = smokeRollSpeed(args[4]);
  const downTimeMs = timeMs + 4800;
  const scrollUp = ((timeMs * 9) / 10) * speed;
  const scrollDown = ((downTimeMs * 5) / 14) * speed;
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
  const lit = Math.max(0, Math.min(count, Math.ceil(count * smokeFlowLengthFraction(args, timeMs, sim))));
  for (let i = lit; i < count; i += 1) {
    buffer.a[i] = 0;
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

/** Per-LED random grey mask for multiply — preserves underlying pixel hue when composited. */
/** Hum-reactive uniform grey mask — preview approximates NoisySoundLevelCompat. */
function renderAudioLayer(count: number, timeMs: number): PixelBuffer {
  const hum = (Math.sin(timeMs / 120) + 1) / 2;
  const grey = Math.round(hum * 255);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderPerLedFlicker(count: number, timeMs: number): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const frame = Math.floor(timeMs / 80);
  for (let i = 0; i < count; i += 1) {
    const hash = ((i * 7919 + frame * 104729) ^ (i << 3)) >>> 0;
    const grey = Math.round(((hash % 32769) / 32768) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderBrightnessOverlayMask(
  scale: number,
  count: number,
): PixelBuffer {
  const grey = Math.round(scale * 255);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderBrightnessOverlay(args: string[], count: number, timeMs: number, mode: 'random_hold' | 'sine'): PixelBuffer {
  const config =
    mode === 'random_hold'
      ? brightnessOverlayFromFlickerArgs(args)
      : brightnessOverlayFromPulseArgs(args);
  return renderBrightnessOverlayMask(brightnessOverlayScale(timeMs, config), count);
}

function renderSwingLayer(args: string[], count: number, timeMs: number, sim: PreviewSimState): PixelBuffer {
  const intensity = eventIntensity(sim.swingUntil, timeMs, PREVIEW_DURATIONS.swing);
  const config = brightnessOverlayFromSwingArgs(args, intensity);
  return renderBrightnessOverlayMask(brightnessOverlayScale(timeMs, config), count);
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

const RANDOM_BANDS_SEGMENTS = 16;

function hash32(x: number): number {
  x ^= x >> 16;
  x = Math.imul(x, 0x45d9f3b);
  x ^= x >> 16;
  return x | 0;
}

function buildRandomBandsPattern(scale: number): { segLen: number[]; bandLen: number[]; cycle: number } {
  const s = Math.max(200, scale || 2400);
  const segLen: number[] = [];
  const bandLen: number[] = [];
  let cycle = 0;
  for (let i = 0; i < RANDOM_BANDS_SEGMENTS; i += 1) {
    const h = hash32(i * 2654435761 + s * 17);
    let seg = s + (((h & 0xff) * s) >> 9);
    if (seg < s / 4) seg = s / 4;
    const duty = 35 + ((h >> 8) & 0x3f);
    segLen.push(seg);
    bandLen.push((seg * duty) >> 7);
    cycle += seg;
  }
  return { segLen, bandLen, cycle: cycle || 1 };
}

function isRandomBandAt(coord: number, pattern: ReturnType<typeof buildRandomBandsPattern>): boolean {
  let c = coord % pattern.cycle;
  if (c < 0) c += pattern.cycle;
  let x = 0;
  for (let i = 0; i < RANDOM_BANDS_SEGMENTS; i += 1) {
    if (c < x + pattern.bandLen[i]) return true;
    if (c < x + pattern.segLen[i]) return false;
    x += pattern.segLen[i];
  }
  return false;
}

/** Irregular rolling bands — matches firmware 16-segment repeating pattern. */
function sinAtPhaseInterpolated(phase: number, wavelength: number): number {
  const wl = Math.max(1, wavelength);
  let p = phase;
  while (p < 0) p += wl;
  while (p >= wl) p -= wl;
  const fp = (p * (1 << 20)) / wl;
  const idx = (fp >> 10) & 1023;
  const frac = fp & 1023;
  const s0 = Math.sin((idx / 1024) * Math.PI * 2);
  const s1 = Math.sin(((idx + 1) / 1024) * Math.PI * 2);
  const sinUnit = s0 + ((s1 - s0) * frac) / 1024;
  return Math.round(sinUnit * 32768);
}

type SineWaveParams = {
  period: number;
  phase: number;
  min: number;
  max: number;
  speed: number;
};

/** Integer scroll modulus — matches firmware `MOD()` in common/math.h. */
function modScroll(x: number, m: number): number {
  const xi = Math.trunc(x);
  if (m <= 0) {
    return 0;
  }
  if (xi >= 0) {
    return xi % m;
  }
  return m - 1 - ((-1 - xi) % m);
}

function intSlotArg(raw: string | undefined, defaultText: string): number {
  const text = raw == null || String(raw).trim() === '' ? defaultText : String(raw).trim();
  const n = Number(text);
  return Number.isFinite(n) ? Math.trunc(n) : Number(defaultText) || 0;
}

function parseSineWaveSlots(args: string[]): { waves: SineWaveParams[]; strength: number } {
  const waves: SineWaveParams[] = [];
  for (let w = 0; w < 4; w += 1) {
    const o = w * 5;
    waves.push({
      period: intSlotArg(args[o], w === 0 ? '2400' : '0'),
      phase: intSlotArg(args[o + 1], '0'),
      min: intSlotArg(args[o + 2], '0'),
      max: intSlotArg(args[o + 3], '65535'),
      speed: intSlotArg(args[o + 4], w === 0 ? '-2000' : '0'),
    });
  }
  const strength = intSlotArg(args[20], '65535');
  return { waves, strength };
}

function sineWaveFactorAt(
  wave: SineWaveParams,
  led: number,
  timeMs: number,
): number {
  if (wave.period <= 0) return 65535;
  const period = wave.period;
  const mult = (50000 * 1024) / period;
  const wrap = Math.max(1024, period * 1024);
  const scrollUs = timeMs * 1000;
  const m = modScroll((scrollUs * wave.speed) / 333, wrap);
  const p = (m + wave.phase * 1024 + led * mult) >> 10;
  const sin = sinAtPhaseInterpolated(p, period);
  const minB = Math.max(0, Math.min(65535, wave.min));
  const maxB = Math.max(0, Math.min(65535, wave.max));
  const t = (sin + 32768) / 65536;
  return Math.max(0, Math.min(65535, Math.round(minB + t * (maxB - minB))));
}

/** Up to four sine brightness waves — multiply mask (firmware sin_table). */
function renderSineWaves(args: string[], count: number, timeMs: number): PixelBuffer {
  const { waves, strength } = parseSineWaveSlots(args);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    let f = 65535;
    for (const wave of waves) {
      f = (f * sineWaveFactorAt(wave, i, timeMs)) / 65535;
    }
    if (strength < 65535) {
      f = 65535 - ((65535 - f) * Math.max(0, strength)) / 65535;
    }
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function triAtPhase(phase: number, wavelength: number): number {
  const wl = Math.max(1, wavelength);
  let p = phase;
  while (p < 0) p += wl;
  while (p >= wl) p -= wl;
  const half = Math.max(1, wl >> 1);
  if (p < half) {
    return Math.round((p * 65536) / half - 32768);
  }
  const tail = Math.max(1, wl - half);
  return Math.round(32768 - ((p - half) * 65536) / tail);
}

function sawWaveFactorAt(wave: SineWaveParams, led: number, timeMs: number): number {
  if (wave.period <= 0) return 65535;
  const period = wave.period;
  const mult = (50000 * 1024) / period;
  const wrap = Math.max(1024, period * 1024);
  const scrollUs = timeMs * 1000;
  const m = ((scrollUs * wave.speed) / 333) % wrap;
  const p = (m + wave.phase * 1024 + led * mult) >> 10;
  const tri = triAtPhase(p, period);
  const minB = Math.max(0, Math.min(65535, wave.min));
  const maxB = Math.max(0, Math.min(65535, wave.max));
  const t = (tri + 32768) / 65536;
  return Math.max(0, Math.min(65535, Math.round(minB + t * (maxB - minB))));
}

function renderSawWaves(args: string[], count: number, timeMs: number): PixelBuffer {
  const { waves, strength } = parseSineWaveSlots(args);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    let f = 65535;
    for (const wave of waves) {
      f = (f * sawWaveFactorAt(wave, i, timeMs)) / 65535;
    }
    if (strength < 65535) {
      f = 65535 - ((65535 - f) * Math.max(0, strength)) / 65535;
    }
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function smoothstepUnit(x: number): number {
  if (x <= 0) return 0;
  if (x >= 32768) return 32768;
  return (((x * x) >> 14) * ((3 << 14) - x)) >> 15;
}

function pulseTrainFactorAt(
  period: number,
  speed: number,
  minB: number,
  maxB: number,
  duty: number,
  led: number,
  timeMs: number,
): number {
  if (period <= 0) return 65535;
  const mult = (50000 * 1024) / period;
  const wrap = Math.max(1024, period * 1024);
  const scrollUs = timeMs * 1000;
  const m = ((scrollUs * speed) / 333) % wrap;
  let p = ((m + led * mult) >> 10) % period;
  if (p < 0) p += period;
  const d = Math.max(0, Math.min(32768, duty));
  if (d <= 0) return minB;
  if (d >= 32768) return maxB;
  const threshold = Math.floor((period * d) / 32768);
  return p < threshold ? maxB : minB;
}

function renderPulseTrain(args: string[], count: number, timeMs: number): PixelBuffer {
  const period = Number(args[0] ?? '2400') || 0;
  const speed = Number(args[1] ?? '-2000') || -2000;
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const duty = Number(args[4] ?? '16384') || 16384;
  const buffer = createPixelBuffer(count);
  if (period <= 0) {
    fillSolid(buffer, [255, 255, 255]);
    return buffer;
  }
  for (let i = 0; i < count; i += 1) {
    const f = pulseTrainFactorAt(period, speed, minB, maxB, duty, i, timeMs);
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function localChirpPeriod(periodBase: number, led: number, chirpRate: number): number {
  const p = periodBase + ((led * chirpRate) >> 8);
  return Math.max(64, Math.min(65535, p));
}

function renderChirp(args: string[], count: number, timeMs: number): PixelBuffer {
  const periodBase = Number(args[0] ?? '2400') || 0;
  const speed = Number(args[1] ?? '-2000') || -2000;
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const chirpRate = Number(args[4] ?? '64') || 0;
  const buffer = createPixelBuffer(count);
  if (periodBase <= 0) {
    fillSolid(buffer, [255, 255, 255]);
    return buffer;
  }
  const wrap = Math.max(1024, periodBase * 1024);
  const scrollUs = timeMs * 1000;
  const m = ((scrollUs * speed) / 333) % wrap;
  for (let i = 0; i < count; i += 1) {
    const localPeriod = localChirpPeriod(periodBase, i, chirpRate);
    const mult = (50000 * 1024) / localPeriod;
    const p = (m + i * mult) >> 10;
    const sin = sinAtPhaseInterpolated(p, localPeriod);
    const t = (sin + 32768) / 65536;
    const f = Math.max(0, Math.min(65535, Math.round(minB + t * (maxB - minB))));
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderSmoothstepBands(args: string[], count: number, timeMs: number): PixelBuffer {
  const period = Number(args[0] ?? '2400') || 0;
  const speed = Number(args[1] ?? '-2000') || -2000;
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const edge = Math.max(1, Number(args[4] ?? '400') || 400);
  const buffer = createPixelBuffer(count);
  if (period <= 0) {
    fillSolid(buffer, [255, 255, 255]);
    return buffer;
  }
  const mult = (50000 * 1024) / period;
  const scrollUs = timeMs * 1000;
  const wrap = Math.max(1024, period * 1024);
  const m = ((scrollUs * speed) / 333) % wrap;
  const edgeClamp = Math.min(edge, period >> 1 || 1);
  for (let i = 0; i < count; i += 1) {
    let q = ((m + i * mult) >> 10) % period;
    if (q < 0) q += period;
    const rise = smoothstepUnit((q * 32768) / edgeClamp);
    const fall = smoothstepUnit(((period - q) * 32768) / edgeClamp);
    const bump = Math.min(rise, fall);
    const f = Math.round(minB + (bump * (maxB - minB)) / 32768);
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function noiseAt(coord: number, scale: number, seed: number): number {
  const s = Math.max(32, scale);
  const cell = Math.floor(coord / s);
  const frac = coord - cell * s;
  const t = smoothstepUnit((frac * 32768) / s);
  const a = hash32(cell * 7919 + seed) & 0xffff;
  const b = hash32((cell + 1) * 7919 + seed) & 0xffff;
  return a + ((b - a) * t) >> 15;
}

function renderValueNoise(args: string[], count: number, timeMs: number): PixelBuffer {
  const scale = Number(args[0] ?? '2400') || 0;
  const speed = Number(args[1] ?? '-2000') || -2000;
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const seed = Number(args[4] ?? '0') || 0;
  const buffer = createPixelBuffer(count);
  if (scale <= 0) {
    fillSolid(buffer, [255, 255, 255]);
    return buffer;
  }
  const mult = (50000 * 1024) / scale;
  const scrollUs = timeMs * 1000;
  const wrap = Math.max(1024, scale * 64 * 1024);
  const m = ((scrollUs * speed) / 333) % wrap;
  for (let i = 0; i < count; i += 1) {
    const p = (m + i * mult) >> 10;
    const n = noiseAt(p, scale, seed);
    const f = Math.round(minB + (n * (maxB - minB)) / 65535);
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function fbmAt(coord: number, scale: number): number {
  let v = 0;
  let den = 0;
  let s = Math.max(32, scale);
  for (let o = 0; o < 3; o += 1) {
    const w = 4 >> o;
    v += noiseAt(coord, s, o * 101) * w;
    den += w;
    s = Math.max(32, s >> 1);
  }
  return den > 0 ? Math.round(v / den) : 32768;
}

function renderFbmNoise(args: string[], count: number, timeMs: number): PixelBuffer {
  const scale = Number(args[0] ?? '2400') || 0;
  const speed = Number(args[1] ?? '-2000') || -2000;
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const strength = Number(args[4] ?? '65535') || 65535;
  const buffer = createPixelBuffer(count);
  if (scale <= 0) {
    fillSolid(buffer, [255, 255, 255]);
    return buffer;
  }
  const mult = (50000 * 1024) / scale;
  const scrollUs = timeMs * 1000;
  const wrap = Math.max(1024, scale * 64 * 1024);
  const m = ((scrollUs * speed) / 333) % wrap;
  for (let i = 0; i < count; i += 1) {
    const p = (m + i * mult) >> 10;
    let f = Math.round(minB + (fbmAt(p, scale) * (maxB - minB)) / 65535);
    if (strength < 65535) {
      f = strength <= 0 ? 65535 : 65535 - ((65535 - f) * strength) / 65535;
    }
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderMoireMask(args: string[], count: number, timeMs: number): PixelBuffer {
  const p1 = Number(args[0] ?? '2400') || 0;
  const p2 = Number(args[1] ?? '2450') || 0;
  const s1 = Number(args[2] ?? '-2000') || -2000;
  const s2 = Number(args[3] ?? '2100') || 2100;
  const minB = Math.max(0, Math.min(65535, Number(args[4] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[5] ?? '65535') || 65535));
  const scrollUs = timeMs * 1000;
  const mult1 = p1 > 0 ? (50000 * 1024) / p1 : 0;
  const mult2 = p2 > 0 ? (50000 * 1024) / p2 : 0;
  const m1 = p1 > 0 ? ((scrollUs * s1) / 333) % Math.max(1024, p1 * 1024) : 0;
  const m2 = p2 > 0 ? ((scrollUs * s2) / 333) % Math.max(1024, p2 * 1024) : 0;
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const ramp = (coord: number, period: number) => {
      if (period <= 0) return 65535;
      let q = coord % period;
      if (q < 0) q += period;
      return Math.round((q * 65535) / period);
    };
    const r1 = ramp((m1 + i * mult1) >> 10, p1);
    const r2 = ramp((m2 + i * mult2) >> 10, p2);
    const beat = Math.round((r1 * r2) / 65535);
    const f = Math.round(minB + ((maxB - minB) * beat) / 65535);
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderBladeEnvelope(args: string[], count: number, timeMs: number): PixelBuffer {
  const centerArg = Number(args[0] ?? '16384') || 16384;
  const width = Math.max(1, Number(args[1] ?? '6000') || 6000);
  const minB = Math.max(0, Math.min(65535, Number(args[2] ?? '0') || 0));
  const maxB = Math.max(0, Math.min(65535, Number(args[3] ?? '65535') || 65535));
  const speed = Number(args[4] ?? '0') || 0;
  const scroll = speed !== 0 ? (((timeMs * 1000 * speed) / 333) % (32768 * 1024)) >> 10 : 0;
  const center = (centerArg + scroll) % 32768;
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const pos = count <= 1 ? 0 : Math.round((i * 32768) / (count - 1));
    let dist = Math.abs(pos - center);
    if (dist > 16384) dist = 32768 - dist;
    const t = Math.max(0, 32768 - (dist * 32768) / width);
    const bump = smoothstepUnit(t);
    const f = Math.round(minB + (bump * (maxB - minB)) / 32768);
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function motionEffectivePeriod(
  period: number,
  swingScale: number,
  twistScale: number,
  sim: PreviewSimState,
  timeMs: number,
): number {
  if (period <= 0 || (swingScale === 0 && twistScale === 0)) return period;
  const swing = Math.round(eventIntensity(sim.swingUntil, timeMs, PREVIEW_DURATIONS.swing) * 32768);
  const twist = Math.round(Math.abs(sim.bladeAngleNorm * 2 - 1) * 32768);
  const motion = Math.floor((swingScale * swing) / 32768) + Math.floor((twistScale * twist) / 32768);
  const eff = Math.round((period * 32768) / (32768 + Math.max(0, motion)));
  return Math.max(200, eff);
}

function sineWaveFactorAtMotion(
  wave: SineWaveParams,
  led: number,
  timeMs: number,
  sim: PreviewSimState,
  swingScale: number,
  twistScale: number,
): number {
  if (wave.period <= 0) return 65535;
  const period = motionEffectivePeriod(wave.period, swingScale, twistScale, sim, timeMs);
  const mult = (50000 * 1024) / period;
  const wrap = Math.max(1024, period * 1024);
  const scrollUs = timeMs * 1000;
  const m = ((scrollUs * wave.speed) / 333) % wrap;
  const p = (m + wave.phase * 1024 + led * mult) >> 10;
  const sin = sinAtPhaseInterpolated(p, period);
  const minB = Math.max(0, Math.min(65535, wave.min));
  const maxB = Math.max(0, Math.min(65535, wave.max));
  const t = (sin + 32768) / 65536;
  return Math.max(0, Math.min(65535, Math.round(minB + t * (maxB - minB))));
}

function renderSineWavesSwing(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const { waves, strength } = parseSineWaveSlots(args);
  const swingScale = Number(args[21] ?? '0') || 0;
  const twistScale = Number(args[22] ?? '0') || 0;
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    let f = 65535;
    for (const wave of waves) {
      f = (f * sineWaveFactorAtMotion(wave, i, timeMs, sim, swingScale, twistScale)) / 65535;
    }
    if (strength < 65535) {
      f = 65535 - ((65535 - f) * Math.max(0, strength)) / 65535;
    }
    const grey = Math.round((f / 65535) * 255);
    buffer.r[i] = grey;
    buffer.g[i] = grey;
    buffer.b[i] = grey;
    buffer.a[i] = 1;
  }
  return buffer;
}

function renderRandomBands(args: string[], count: number, timeMs: number): PixelBuffer {
  const speed = Number(args[0] ?? '-2000') || -2000;
  const band = parseColor(args[1] ?? 'green');
  const gap = parseColor(args[2] ?? 'black');
  const scale = Math.max(200, Number(args[3] ?? '2400') || 2400);
  const pattern = buildRandomBandsPattern(scale);
  const mult = (50000 * 1024) / scale;
  const scrollUs = timeMs * 1000;
  const wrap = pattern.cycle * 1024;
  const m = ((scrollUs * speed) / 333) % wrap;
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const p = (m + i * mult) >> 10;
    const [r, g, b] = isRandomBandAt(p, pattern) ? band : gap;
    buffer.r[i] = r;
    buffer.g[i] = g;
    buffer.b[i] = b;
    buffer.a[i] = 1;
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

type PixelSequenceStep = {
  pixel: number;
  rgb: [number, number, number];
  brightness: number;
  ms: number;
};

function parsePixelSequenceSteps(spec: string): PixelSequenceStep[] {
  const steps: PixelSequenceStep[] = [];
  for (const part of spec.split('|')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const fields = trimmed.split(',').map((field) => field.trim());
    if (fields.length < 6) {
      continue;
    }
    const pixel = Number(fields[0]);
    const r = Number(fields[1]);
    const g = Number(fields[2]);
    const b = Number(fields[3]);
    const brightness = Number(fields[4]);
    const ms = Number(fields[5]);
    if (!Number.isFinite(pixel) || !Number.isFinite(ms) || ms <= 0) {
      continue;
    }
    steps.push({
      pixel,
      rgb: [
        Math.max(0, Math.min(255, r || 0)),
        Math.max(0, Math.min(255, g || 0)),
        Math.max(0, Math.min(255, b || 0)),
      ],
      brightness: Math.max(0, Math.min(255, brightness || 0)),
      ms,
    });
  }
  return steps;
}

function renderPixelSequence(args: string[], count: number, timeMs: number): PixelBuffer {
  const defaultSpec = '0,0,255,0,60,150|0,255,0,0,60,150';
  const steps = parsePixelSequenceSteps(args[0] ?? defaultSpec);
  const buffer = createPixelBuffer(count);
  if (steps.length === 0) {
    return buffer;
  }
  const cycleMs = steps.reduce((sum, step) => sum + step.ms, 0);
  let t = cycleMs > 0 ? timeMs % cycleMs : 0;
  let active = steps[0]!;
  for (const step of steps) {
    if (t < step.ms) {
      active = step;
      break;
    }
    t -= step.ms;
  }
  const index = Math.max(0, Math.min(count - 1, active.pixel));
  const scale = active.brightness / 255;
  writePixel(buffer, index, [
    Math.round(active.rgb[0] * scale),
    Math.round(active.rgb[1] * scale),
    Math.round(active.rgb[2] * scale),
  ]);
  return buffer;
}

function writePixel(buffer: PixelBuffer, index: number, rgb: [number, number, number]): void {
  buffer.r[index] = rgb[0];
  buffer.g[index] = rgb[1];
  buffer.b[index] = rgb[2];
  buffer.a[index] = 1;
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
  const args = resolvedLayerArgs(layer, vars);
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
    case 'flicker':
    case 'sparkle_blade':
      return renderStandardLike(args, count);
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
    case 'cylon': {
      const os7 = renderOs7MonolithicBase(style, args, count, now, sim);
      if (os7) {
        return os7;
      }
      return renderStandardLike(args, count);
    }
    case 'unstable_stripes':
    case 'thunder_loop_layer':
    case 'responsive_flame_layer':
    case 'water_flow_layer':
    case 'darksaber_layer':
    case 'static_electricity_layer':
    case 'power_wave_layer':
    case 'fallen_order_layer':
    case 'shimmer_blade_layer':
    case 'rotoscope_layer':
    case 'pulse_stripes_layer':
    case 'kinetic_charge_layer':
    case 'rotating_pulse_layer':
    case 'trickle_blade_layer':
    case 'cylon_layer':
    case 'sparktip_layer': {
      const layer = renderOs7TextureLayer(style, args, count, now, sim);
      if (layer) {
        return layer;
      }
      return renderStandardLike(args, count);
    }
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
      return renderSmokeFlowBlend(args, count, timeMs, sim);
    case 'strobe':
      return renderStrobe(args, count, timeMs);
    case 'pulse':
      return renderPulse(args, count, timeMs);
    case 'random_bands':
      return renderRandomBands(args, count, timeMs);
    case 'sine_waves':
      return renderSineWaves(args, count, timeMs);
    case 'saw_waves':
      return renderSawWaves(args, count, timeMs);
    case 'pulse_train':
      return renderPulseTrain(args, count, timeMs);
    case 'chirp':
      return renderChirp(args, count, timeMs);
    case 'smoothstep_bands':
      return renderSmoothstepBands(args, count, timeMs);
    case 'value_noise':
      return renderValueNoise(args, count, timeMs);
    case 'fbm_noise':
      return renderFbmNoise(args, count, timeMs);
    case 'moire_mask':
      return renderMoireMask(args, count, timeMs);
    case 'blade_envelope':
      return renderBladeEnvelope(args, count, timeMs);
    case 'sine_waves_swing':
      return renderSineWavesSwing(args, count, timeMs, sim);
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
    case 'base_flicker':
      return renderBrightnessOverlay(args, count, timeMs, 'random_hold');
    case 'pulse_layer':
      return renderBrightnessOverlay(args, count, timeMs, 'sine');
    case 'swing_layer':
      return renderSwingLayer(args, count, timeMs, sim);
    case 'per_led_flicker':
      return renderPerLedFlicker(count, timeMs);
    case 'audio_layer':
      return renderAudioLayer(count, timeMs);
    case 'gradient_layer':
      return renderGradient(args, count);
    case 'rainbow_layer':
      return renderRainbow(args, count, timeMs);
    case 'pixel_sequence':
      return renderPixelSequence(args, count, timeMs);
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
