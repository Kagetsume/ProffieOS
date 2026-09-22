import { describe, expect, it } from 'vitest';
import type { StyleLayer } from '../../model/style-sections';
import { createInitialPreviewSim, previewSetLockup } from '../simulation';
import { brightnessOverlayScale } from '../uniform-brightness-overlay';
import { renderLayerPixels } from './basic';
import { compositeLayer, createPixelBuffer, fillSolid } from '../composite';

function layer(styleName: string, args: string[] = []): StyleLayer {
  return {
    id: 'layer-1',
    styleName,
    args,
    blend: 'normal',
    opacity: 32768,
  };
}

describe('renderLayerPixels', () => {
  const sim = createInitialPreviewSim();

  it('renders standard and solid base styles', () => {
    const standard = renderLayerPixels(layer('standard', ['cyan', 'white']), {}, 32, 1000, sim);
    expect(standard.r.some((value) => value > 0)).toBe(true);
    const solid = renderLayerPixels(layer('solid', ['red']), {}, 16, 1000, sim);
    expect(solid.r.every((value) => value === solid.r[0])).toBe(true);
  });

  it('renders animated styles', () => {
    const rainbow = renderLayerPixels(layer('rainbow'), {}, 24, 1000, sim);
    const rainbowLater = renderLayerPixels(layer('rainbow'), {}, 24, 2000, sim);
    expect(rainbow.r.some((value, index) => value !== rainbowLater.r[index])).toBe(true);

    const fire = renderLayerPixels(layer('fire', ['red', 'yellow']), {}, 24, 1500, sim);
    expect(fire.a.every((alpha) => alpha === 1)).toBe(true);

    for (const styleName of [
      'strobe',
      'pulse',
      'stripes',
      'gradient',
      'audio',
      'pulse_blade',
      'noise_flicker',
      'base_flicker',
      'pulse_layer',
      'per_led_flicker',
      'audio_layer',
      'gradient_layer',
      'swing_layer',
      'sparktip',
      'cylon',
    ]) {
      const buffer = renderLayerPixels(layer(styleName), {}, 16, 1200, sim);
      expect(buffer.r.length).toBe(16);
    }
  });

  it('pulse_layer breathes uniformly via multiply', () => {
    const base = createPixelBuffer(4);
    fillSolid(base, [200, 100, 50]);
    const low = renderLayerPixels(layer('pulse_layer', ['2000']), {}, 4, 500, sim);
    const high = renderLayerPixels(layer('pulse_layer', ['2000']), {}, 4, 1500, sim);
    compositeLayer(base, low, 'multiply', 32768);
    const lowR = base.r[0]!;
    fillSolid(base, [200, 100, 50]);
    compositeLayer(base, high, 'multiply', 32768);
    expect(lowR).not.toBe(base.r[0]);
    expect(
      brightnessOverlayScale(1500, { mode: 'sine', deltaPercent: 10, pulseMs: 2000 }),
    ).toBeLessThan(brightnessOverlayScale(500, { mode: 'sine', deltaPercent: 10, pulseMs: 2000 }));
  });

  it('gradient_layer mixes with base via normal opacity', () => {
    const base = createPixelBuffer(8);
    fillSolid(base, [0, 0, 200]);
    const gradient = renderLayerPixels(layer('gradient_layer', ['red', 'yellow']), {}, 8, 0, sim);
    compositeLayer(base, gradient, 'normal', 3277);
    expect(base.r[0]).toBeGreaterThan(0);
    expect(base.r[0]).toBeLessThan(255);
    expect(base.b[0]).toBeGreaterThan(100);
  });

  it('rainbow_layer mixes with base via normal opacity and animates', () => {
    const base = createPixelBuffer(8);
    fillSolid(base, [0, 0, 200]);
    const tinted = createPixelBuffer(8);
    fillSolid(tinted, [0, 0, 200]);
    const rainbowEarly = renderLayerPixels(layer('rainbow_layer'), {}, 8, 0, sim);
    const rainbowLater = renderLayerPixels(layer('rainbow_layer'), {}, 8, 2000, sim);
    compositeLayer(tinted, rainbowEarly, 'normal', 3277);
    expect(tinted.r[0]).toBeGreaterThan(0);
    expect(tinted.b[0]).toBeGreaterThan(100);
    expect(rainbowEarly.r.some((value, index) => value !== rainbowLater.r[index])).toBe(true);
  });

  it('per_led_flicker varies brightness independently per LED', () => {
    const overlay = renderLayerPixels(layer('per_led_flicker'), {}, 16, 1200, sim);
    expect(new Set(overlay.r).size).toBeGreaterThan(1);
  });

  it('swing_layer brightens uniformly when swing is active', () => {
    const idleSim = { ...sim, swingUntil: 0 };
    const swingSim = { ...sim, swingUntil: 5000 };
    const idle = renderLayerPixels(layer('swing_layer', ['10', '200']), {}, 8, 1000, idleSim);
    const swinging = renderLayerPixels(layer('swing_layer', ['10', '200']), {}, 8, 1000, swingSim);
    expect(idle.r[0]).toBeLessThan(swinging.r[0]!);
    expect(swinging.r.every((value) => value === swinging.r[0])).toBe(true);
  });

  it('base_flicker scales all pixels uniformly via multiply', () => {
    const base = createPixelBuffer(8);
    for (let i = 0; i < 8; i += 1) {
      base.r[i] = 100;
      base.g[i] = 150;
      base.b[i] = 200;
      base.a[i] = 1;
    }
    const overlay = renderLayerPixels(layer('base_flicker', ['10', '300', '500']), {}, 8, 5000, sim);
    compositeLayer(base, overlay, 'multiply', 32768);
    expect(base.r.every((value) => value === base.r[0])).toBe(true);
    expect(base.g.every((value) => value === base.g[0])).toBe(true);
    expect(base.b.every((value) => value === base.b[0])).toBe(true);
    expect(base.r[0]).toBeLessThan(100);

    expect(
      brightnessOverlayScale(0, { mode: 'random_hold', deltaPercent: 10, minPeriodMs: 300, maxPeriodMs: 500 }),
    ).toBe(1);
    expect(
      brightnessOverlayScale(2500, { mode: 'random_hold', deltaPercent: 10, minPeriodMs: 300, maxPeriodMs: 500 }),
    ).not.toBe(1);
  });

  it('applies built-in lockup on standard when active', () => {
    const idle = renderLayerPixels(layer('standard', ['cyan', 'white']), {}, 48, 1000, sim);
    const locked = renderLayerPixels(
      layer('standard', ['cyan', 'white', '300', '800', 'white']),
      {},
      48,
      1000,
      previewSetLockup(sim, true),
    );
    expect(locked.r.some((value, index) => value !== idle.r[index])).toBe(true);
  });

  it('skips built-in lockup when section has dedicated lockup layer', () => {
    const idle = renderLayerPixels(layer('standard', ['cyan', 'white']), {}, 48, 1000, sim);
    const locked = renderLayerPixels(
      layer('standard', ['cyan', 'white']),
      {},
      48,
      1000,
      previewSetLockup(sim, true),
      { dedicatedLockupLayer: true },
    );
    expect(locked.r).toEqual(idle.r);
  });

  it('returns transparent overlay pixels when blade is retracted', () => {
    const retracted = { ...sim, powered: false, transition: 'none' as const, bladeLength: 0 };
    const overlay = renderLayerPixels(layer('blast', ['white']), {}, 16, 1000, retracted);
    expect(overlay.a.every((alpha) => alpha === 0)).toBe(true);
  });
});
