import { describe, expect, it } from 'vitest';
import {
  brightnessOverlayScale,
  uniformBrightnessMix,
  UNIFORM_BRIGHTNESS_MIX_CENTER,
  UNIFORM_BRIGHTNESS_WAVE_CENTER,
} from './uniform-brightness-overlay';

describe('uniform-brightness-overlay', () => {
  it('maps wave center to full mix scale', () => {
    expect(uniformBrightnessMix(UNIFORM_BRIGHTNESS_WAVE_CENTER, 10)).toBe(1);
  });

  it('maps wave endpoints for +/- delta', () => {
    const dim = uniformBrightnessMix(0, 10);
    const bright = uniformBrightnessMix(UNIFORM_BRIGHTNESS_MIX_CENTER, 10);
    expect(dim).toBeLessThan(1);
    expect(bright).toBe(1);
  });

  it('flicker mode holds then changes scale', () => {
    expect(brightnessOverlayScale(0, { mode: 'random_hold', deltaPercent: 10, minPeriodMs: 300, maxPeriodMs: 500 })).toBe(1);
    expect(
      brightnessOverlayScale(2500, { mode: 'random_hold', deltaPercent: 10, minPeriodMs: 300, maxPeriodMs: 500 }),
    ).not.toBe(1);
  });

  it('sine mode oscillates smoothly', () => {
    const low = brightnessOverlayScale(1500, { mode: 'sine', deltaPercent: 10, pulseMs: 2000 });
    const high = brightnessOverlayScale(500, { mode: 'sine', deltaPercent: 10, pulseMs: 2000 });
    expect(low).toBeLessThan(high);
  });

  it('swing mode boosts from idle to full swing', () => {
    expect(
      brightnessOverlayScale(0, { mode: 'swing', deltaPercent: 10, speedThreshold: 200, intensity: 0 }),
    ).toBe(1);
    expect(
      brightnessOverlayScale(0, { mode: 'swing', deltaPercent: 10, speedThreshold: 200, intensity: 1 }),
    ).toBeCloseTo(1.1);
  });
});
