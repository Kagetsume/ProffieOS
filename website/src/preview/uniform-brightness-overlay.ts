/**
 * Shared uniform whole-blade brightness overlay — preview mirror of firmware
 * {@link functions/uniform_brightness_overlay.h}.
 *
 * @module preview/uniform-brightness-overlay
 */

export const UNIFORM_BRIGHTNESS_MIX_CENTER = 32768;
export const UNIFORM_BRIGHTNESS_WAVE_CENTER = 16384;

export type BrightnessOverlayWaveMode = 'random_hold' | 'sine' | 'swing';

export type BrightnessOverlayConfig =
  | {
      mode: 'random_hold';
      deltaPercent: number;
      minPeriodMs: number;
      maxPeriodMs: number;
    }
  | {
      mode: 'sine';
      deltaPercent: number;
      pulseMs: number;
    }
  | {
      mode: 'swing';
      deltaPercent: number;
      speedThreshold: number;
      /** 0–1 swing intensity (preview maps from swingUntil). */
      intensity: number;
    };

/** Map wave (0–32768, center 16384) to normalized mix scale (0–1). */
export function uniformBrightnessMix(wave: number, deltaPercent: number): number {
  const delta = Math.round(
    UNIFORM_BRIGHTNESS_MIX_CENTER * (Math.max(0, Math.min(100, deltaPercent)) / 100),
  );
  const centered = wave - UNIFORM_BRIGHTNESS_WAVE_CENTER;
  const mix = UNIFORM_BRIGHTNESS_MIX_CENTER + (centered * delta) / UNIFORM_BRIGHTNESS_WAVE_CENTER;
  const clamped = Math.max(0, Math.min(UNIFORM_BRIGHTNESS_MIX_CENTER, mix));
  return clamped / UNIFORM_BRIGHTNESS_MIX_CENTER;
}

function randomHoldWave(timeMs: number, minPeriodMs: number, maxPeriodMs: number): number {
  let t = 0;
  let wave = UNIFORM_BRIGHTNESS_WAVE_CENTER;
  let seed = 0x13572468;
  const rand = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed;
  };
  while (t <= timeMs) {
    const span = Math.max(0, maxPeriodMs - minPeriodMs);
    const hold = minPeriodMs + (span > 0 ? (rand() % (span + 1)) : 0);
    if (timeMs < t + hold) {
      return wave;
    }
    wave = rand() & 1 ? UNIFORM_BRIGHTNESS_MIX_CENTER : 0;
    t += hold;
  }
  return wave;
}

function sineWave(timeMs: number, pulseMs: number): number {
  const period = Math.max(1, pulseMs);
  const pos = (timeMs / period) % 1;
  return ((Math.sin(pos * Math.PI * 2) + 1) / 2) * UNIFORM_BRIGHTNESS_MIX_CENTER;
}

/** Idle = 1.0, full swing = 1 + deltaPercent/100 (matches firmware SwingBoostOverlayF). */
export function swingBrightnessScale(intensity: number, deltaPercent: number): number {
  const boost = Math.max(0, Math.min(100, deltaPercent)) / 100;
  return 1 + Math.max(0, Math.min(1, intensity)) * boost;
}

/** Normalized brightness scale (0–1) for a configured overlay at timeMs. */
export function brightnessOverlayScale(timeMs: number, config: BrightnessOverlayConfig): number {
  if (config.mode === 'swing') {
    return swingBrightnessScale(config.intensity, config.deltaPercent);
  }
  const wave =
    config.mode === 'random_hold'
      ? randomHoldWave(timeMs, config.minPeriodMs, config.maxPeriodMs)
      : sineWave(timeMs, config.pulseMs);
  return uniformBrightnessMix(wave, config.deltaPercent);
}

/** Build overlay config from base_flicker layer args. */
export function brightnessOverlayFromFlickerArgs(args: string[]): BrightnessOverlayConfig {
  const deltaPercent = Number(args[0] ?? '10') || 10;
  const minPeriodMs = Math.max(1, Number(args[1] ?? '300') || 300);
  const maxPeriodMs = Math.max(minPeriodMs, Number(args[2] ?? '500') || 500);
  return { mode: 'random_hold', deltaPercent, minPeriodMs, maxPeriodMs };
}

/** Build overlay config from pulse_layer args. */
export function brightnessOverlayFromPulseArgs(args: string[]): BrightnessOverlayConfig {
  return {
    mode: 'sine',
    deltaPercent: 10,
    pulseMs: Math.max(1, Number(args[0] ?? '3000') || 3000),
  };
}

/** Build overlay config from swing_layer args and preview swing intensity (0–1). */
export function brightnessOverlayFromSwingArgs(
  args: string[],
  intensity: number,
): BrightnessOverlayConfig {
  return {
    mode: 'swing',
    deltaPercent: Number(args[0] ?? '10') || 10,
    speedThreshold: Math.max(1, Number(args[1] ?? '200') || 200),
    intensity: Math.max(0, Math.min(1, intensity)),
  };
}
