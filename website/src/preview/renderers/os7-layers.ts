/**
 * Approximate preview renderers for OS7 idle texture layers (`*_layer` named styles).
 *
 * Simplified sine/stripe/fire approximations — not bit-accurate vs firmware templates.
 *
 * @module preview/renderers/os7-layers
 */
import { lerpRgb, parseColor } from '../colors';

type Rgb = [number, number, number];
import { createPixelBuffer, fillSolid, type PixelBuffer } from '../composite';
import { eventIntensity, PREVIEW_DURATIONS, type PreviewSimState } from '../simulation';

function positionT(index: number, count: number): number {
  if (count <= 1) {
    return 0;
  }
  return index / (count - 1);
}

function dimRgb(color: Rgb, mix: number): Rgb {
  return lerpRgb([0, 0, 0], color, Math.max(0, Math.min(1, mix)));
}

function scrollPhase(timeMs: number, speed: number): number {
  return (timeMs / 1000) * (speed / 1000);
}

function perLedHash(index: number, timeMs: number, seed = 0): number {
  const frame = Math.floor(timeMs / 90);
  const hash = ((index * 7919 + frame * 104729 + seed * 1337) ^ (index << 3)) >>> 0;
  return (hash % 32769) / 32768;
}

function writePixel(buffer: PixelBuffer, index: number, color: Rgb, alpha = 1): void {
  buffer.r[index] = color[0];
  buffer.g[index] = color[1];
  buffer.b[index] = color[2];
  buffer.a[index] = alpha;
}

/** Multi-band moving stripes (Stripes / StripesX approximation). */
function renderMovingStripes(
  base: Rgb,
  count: number,
  timeMs: number,
  width: number,
  speed: number,
  bandMixes: number[],
): PixelBuffer {
  const buffer = createPixelBuffer(count);
  const scroll = scrollPhase(timeMs, speed);
  const bands = bandMixes.map((mix) => (mix <= 0 ? base : dimRgb(base, mix)));
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const wave = Math.sin(t * width * 0.002 + scroll);
    const idx = Math.min(bands.length - 1, Math.floor(((wave + 1) / 2) * bands.length));
    writePixel(buffer, i, bands[idx]!);
  }
  return buffer;
}

function swingMotion(sim: PreviewSimState, now: number): number {
  const swing = eventIntensity(sim.swingUntil, now, PREVIEW_DURATIONS.swing);
  return Math.max(swing, sim.bladeAngleNorm * 0.35);
}

function kineticChargeLevel(sim: PreviewSimState, now: number): number {
  if (sim.lockupActive) {
    return 1;
  }
  const clash = eventIntensity(sim.clashUntil, now, PREVIEW_DURATIONS.clash);
  if (clash > 0) {
    return Math.max(0.75, clash);
  }
  return swingMotion(sim, now) * 0.35;
}

function staticChargeLevel(sim: PreviewSimState, now: number): number {
  return Math.min(1, swingMotion(sim, now) * 1.4);
}

export function renderUnstableStripes(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'silver');
  const buffer = renderMovingStripes(base, count, timeMs, 6000, -2400, [1, 0.08, 0.05, 0.5, 1, 0.08]);
  for (let i = 0; i < count; i += 1) {
    const flicker = perLedHash(i, timeMs, 17);
    const [r, g, b] = lerpRgb(
      [buffer.r[i]!, buffer.g[i]!, buffer.b[i]!],
      dimRgb(base, 0.15 + flicker * 0.35),
      0.35 + flicker * 0.25,
    );
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderThunderLoopLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const cycleMs = 4200;
  const phase = (timeMs % cycleMs) / cycleMs;
  const bounce = phase < 0.15 ? Math.sin((phase / 0.15) * Math.PI) : phase > 0.85 ? 0 : 0.65;
  const wide = renderMovingStripes(base, count, timeMs, 10000, 100, [0.5, 0.15, 0.78, 1]);
  const fast = renderMovingStripes(base, count, timeMs, 8000, -200, [1, 0.3]);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const mix = 0.35 + bounce * 0.55;
    const [r, g, b] = lerpRgb(
      [wide.r[i]!, wide.g[i]!, wide.b[i]!],
      [fast.r[i]!, fast.g[i]!, fast.b[i]!],
      mix,
    );
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderResponsiveFlameLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'red');
  const hot = dimRgb(base, 0.55);
  const buffer = createPixelBuffer(count);
  const angle = sim.bladeAngleNorm;
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const flameLen = 0.35 + angle * 0.55;
    const heat =
      Math.max(0, 1 - t / Math.max(0.15, flameLen)) *
      ((Math.sin(t * 16 + timeMs / 160) + 1) / 2) *
      (0.45 + angle * 0.4);
    const [r, g, b] = lerpRgb(base, hot, heat);
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderWaterFlowLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const motion = swingMotion(sim, timeMs);
  const width = 15000 + sim.bladeAngleNorm * 8000;
  const speed = motion > 0.2 ? 1200 : -1000;
  return renderMovingStripes(base, count, timeMs, width, speed, [1, 0.5, 0.78, 0.3, 0.65]);
}

export function renderDarkSaberLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'silver');
  const gleam = parseColor('white');
  const stripes = renderMovingStripes(base, count, timeMs, 5000, -300, [0.3, 0.05, 0.5, 1]);
  const hum = (Math.sin(timeMs / 120) + 1) / 2;
  const swing = swingMotion(sim, timeMs);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    let [r, g, b] = lerpRgb(
      [stripes.r[i]!, stripes.g[i]!, stripes.b[i]!],
      dimRgb(base, 0.4 + hum * 0.25),
      0.25 + hum * 0.2,
    );
    if (swing > 0.1) {
      [r, g, b] = lerpRgb([r, g, b], gleam, swing * 0.35 * (1 - positionT(i, count) * 0.5));
    }
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderStaticElectricityLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'deepskyblue');
  const charge = staticChargeLevel(sim, timeMs);
  const speed = -100 - charge * 2900;
  const stripes = renderMovingStripes(base, count, timeMs, 6000, speed, [0.35, 1, 0.55]);
  const buffer = createPixelBuffer(count);
  const spark = parseColor('white');
  for (let i = 0; i < count; i += 1) {
    const flicker = perLedHash(i, timeMs, 42) * charge;
    const [r, g, b] = lerpRgb(
      [stripes.r[i]!, stripes.g[i]!, stripes.b[i]!],
      spark,
      flicker * 0.55,
    );
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderPowerWaveLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'silver');
  return renderMovingStripes(base, count, timeMs, 12000, -1800, [1, 0.37, 1, 0.43]);
}

export function renderFallenOrderLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'silver');
  const pulse = (Math.sin((timeMs / 800) * Math.PI * 2) + 1) / 2;
  const mid = dimRgb(base, 0.45 + pulse * 0.25);
  const buffer = renderMovingStripes(base, count, timeMs, 16000, -1000, [1, 0.35, 1]);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    if (t > 0.35 && t < 0.65) {
      const [r, g, b] = lerpRgb([buffer.r[i]!, buffer.g[i]!, buffer.b[i]!], mid, 0.35 + pulse * 0.3);
      writePixel(buffer, i, [r, g, b]);
    }
  }
  return buffer;
}

export function renderShimmerBladeLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'cyan');
  const motion = swingMotion(sim, timeMs);
  const speed = -100 - motion * 2900;
  const stripes = renderMovingStripes(base, count, timeMs, 16000, speed, [0.75, 1, 0.32]);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const shimmer = perLedHash(i, timeMs, 9) * (0.25 + motion * 0.55);
    const [r, g, b] = lerpRgb([stripes.r[i]!, stripes.g[i]!, stripes.b[i]!], base, shimmer);
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderRotoscopeLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'silver');
  const motion = swingMotion(sim, timeMs);
  const speed = -200 - motion * 3000;
  const stripes = renderMovingStripes(base, count, timeMs, 15000, speed, [1, 1, 0.3, 1, 0.59]);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const flicker = perLedHash(i, timeMs, 31) * motion;
    const [r, g, b] = lerpRgb([stripes.r[i]!, stripes.g[i]!, stripes.b[i]!], dimRgb(base, 0.2), flicker * 0.4);
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderPulseStripesLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const surge = (Math.sin(timeMs / 3000) + 1) / 2;
  const width = 8000 - surge * 5000;
  const speed = -2600 - surge * 1000;
  const pulse = (Math.sin((timeMs / 1400) * Math.PI * 2) + 1) / 2;
  const buffer = renderMovingStripes(base, count, timeMs, width, speed, [1, 0.37, 0.5]);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    if (t > 0.4 && t < 0.6) {
      const [r, g, b] = lerpRgb(
        [buffer.r[i]!, buffer.g[i]!, buffer.b[i]!],
        dimRgb(base, 0.5),
        0.25 + pulse * 0.35,
      );
      writePixel(buffer, i, [r, g, b]);
    }
  }
  return buffer;
}

export function renderKineticChargeLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const kinetic = parseColor(args[1] ?? 'purple');
  const charge = kineticChargeLevel(sim, timeMs);
  const idle = renderMovingStripes(base, count, timeMs, 20000, -200, [0.31, 1, 0.55]);
  const charged = renderMovingStripes(kinetic, count, timeMs, 15000, -3000, [0.31, 0.55, 1]);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const [r, g, b] = lerpRgb(
      [idle.r[i]!, idle.g[i]!, idle.b[i]!],
      [charged.r[i]!, charged.g[i]!, charged.b[i]!],
      charge,
    );
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

export function renderRotatingPulseLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const base = parseColor(args[0] ?? 'blue');
  const saw = (timeMs / 2000) % 1;
  const speed = saw < 0.5 ? -3000 + saw * 6200 : 3200 - (saw - 0.5) * 12400;
  return renderMovingStripes(base, count, timeMs, 12000, speed, [1, 0.5, 1, 0.27]);
}

export function renderTrickleBladeLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const base = parseColor(args[0] ?? 'green');
  const hot = dimRgb(base, 0.65);
  const motion = swingMotion(sim, timeMs);
  const stripes = renderMovingStripes(base, count, timeMs, 14000, -25 - sim.bladeAngleNorm * 25, [1, motion * 0.6]);
  const buffer = createPixelBuffer(count);
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    const trickle = Math.max(0, (t - 0.55) / 0.45) * ((Math.sin(t * 20 - timeMs / 200) + 1) / 2);
    const [r, g, b] = lerpRgb([stripes.r[i]!, stripes.g[i]!, stripes.b[i]!], hot, trickle * 0.65);
    writePixel(buffer, i, [r, g, b]);
  }
  return buffer;
}

/** Spark tip at extension front — black elsewhere (stack with add over solid_bend). */
export function renderSparkTipLayer(
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer {
  const spark = parseColor(args[0] ?? 'white');
  const extMs = Math.max(1, Number(args[1] ?? '300') || 300);
  const buffer = createPixelBuffer(count);
  fillSolid(buffer, [0, 0, 0]);

  if (sim.transition !== 'extending') {
    return buffer;
  }

  const elapsed = Math.max(0, timeMs - sim.transitionStartedAt);
  const progress = Math.min(1, elapsed / extMs);
  const extCalc = Math.round(progress * 32768);
  const thres = (extCalc * (count + 4)) >> 7;
  if (thres <= 1024) {
    return buffer;
  }

  for (let i = 0; i < count; i += 1) {
    const sparkMix = Math.max(0, Math.min(255, thres - 1024 - i * 256));
    if (sparkMix <= 0) {
      continue;
    }
    writePixel(buffer, i, lerpRgb([0, 0, 0], spark, sparkMix / 255));
  }
  return buffer;
}

export function renderCylonLayer(args: string[], count: number, timeMs: number): PixelBuffer {
  const scan = parseColor(args[0] ?? 'red');
  const percent = Math.max(5, Math.min(100, Number(args[1] ?? '25') || 25));
  const rpm = Math.max(10, Number(args[2] ?? '200') || 200);
  const band = percent / 100;
  const buffer = createPixelBuffer(count);
  fillSolid(buffer, [0, 0, 0]);
  const periodMs = 60000 / rpm;
  const progress = (timeMs % periodMs) / periodMs;
  // Keep a visible band at wrap (head=0 would zero the fade at the hilt).
  const head = progress * (1 + band) + band * 0.08;
  const tail = head - band;
  for (let i = 0; i < count; i += 1) {
    const t = positionT(i, count);
    if (t >= tail && t <= head) {
      const edge = Math.min(t - tail, head - t) / Math.max(0.001, band * 0.35);
      const fade = Math.max(0, Math.min(1, edge));
      writePixel(buffer, i, lerpRgb([0, 0, 0], scan, fade));
    } else {
      buffer.a[i] = 1;
    }
  }
  return buffer;
}

/** Dispatch OS7 texture layer by style id. */
export function renderOs7TextureLayer(
  style: string,
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer | undefined {
  switch (style) {
    case 'unstable_stripes':
      return renderUnstableStripes(args, count, timeMs);
    case 'thunder_loop_layer':
      return renderThunderLoopLayer(args, count, timeMs);
    case 'responsive_flame_layer':
      return renderResponsiveFlameLayer(args, count, timeMs, sim);
    case 'water_flow_layer':
      return renderWaterFlowLayer(args, count, timeMs, sim);
    case 'darksaber_layer':
      return renderDarkSaberLayer(args, count, timeMs, sim);
    case 'static_electricity_layer':
      return renderStaticElectricityLayer(args, count, timeMs, sim);
    case 'power_wave_layer':
      return renderPowerWaveLayer(args, count, timeMs);
    case 'fallen_order_layer':
      return renderFallenOrderLayer(args, count, timeMs);
    case 'shimmer_blade_layer':
      return renderShimmerBladeLayer(args, count, timeMs, sim);
    case 'rotoscope_layer':
      return renderRotoscopeLayer(args, count, timeMs, sim);
    case 'pulse_stripes_layer':
      return renderPulseStripesLayer(args, count, timeMs);
    case 'kinetic_charge_layer':
      return renderKineticChargeLayer(args, count, timeMs, sim);
    case 'rotating_pulse_layer':
      return renderRotatingPulseLayer(args, count, timeMs);
    case 'trickle_blade_layer':
      return renderTrickleBladeLayer(args, count, timeMs, sim);
    case 'cylon_layer':
      return renderCylonLayer(args, count, timeMs);
    case 'sparktip_layer':
      return renderSparkTipLayer(args, count, timeMs, sim);
    default:
      return undefined;
  }
}

/** Monolithic OS7 base styles share the same idle approximations (first arg = base color). */
export function renderOs7MonolithicBase(
  style: string,
  args: string[],
  count: number,
  timeMs: number,
  sim: PreviewSimState,
): PixelBuffer | undefined {
  const baseArgs = args.length ? args : ['cyan'];
  switch (style) {
    case 'water_flow':
      return renderWaterFlowLayer(baseArgs, count, timeMs, sim);
    case 'darksaber':
      return renderDarkSaberLayer(baseArgs, count, timeMs, sim);
    case 'static_electricity':
      return renderStaticElectricityLayer(baseArgs, count, timeMs, sim);
    case 'power_wave':
      return renderPowerWaveLayer(baseArgs, count, timeMs);
    case 'unstable_blades':
      return renderUnstableStripes(baseArgs, count, timeMs);
    case 'fallen_order':
      return renderFallenOrderLayer(baseArgs, count, timeMs);
    case 'thunder_loop':
      return renderThunderLoopLayer(baseArgs, count, timeMs);
    case 'responsive_flame':
      return renderResponsiveFlameLayer(baseArgs, count, timeMs, sim);
    case 'shimmer_blade':
      return renderShimmerBladeLayer(baseArgs, count, timeMs, sim);
    case 'rotoscope':
      return renderRotoscopeLayer(baseArgs, count, timeMs, sim);
    case 'pulse_stripes':
      return renderPulseStripesLayer(baseArgs, count, timeMs);
    case 'kinetic_charge':
      return renderKineticChargeLayer(
        baseArgs.length > 1 ? baseArgs : [baseArgs[0] ?? 'blue', 'purple'],
        count,
        timeMs,
        sim,
      );
    case 'rotating_pulse':
      return renderRotatingPulseLayer(baseArgs, count, timeMs);
    case 'trickle_blade':
      return renderTrickleBladeLayer(baseArgs, count, timeMs, sim);
    case 'cylon':
      return renderCylonLayer(
        args.length >= 3 ? args : [args[0] ?? 'red', args[1] ?? '25', args[2] ?? '200'],
        count,
        timeMs,
      );
    default:
      return undefined;
  }
}
