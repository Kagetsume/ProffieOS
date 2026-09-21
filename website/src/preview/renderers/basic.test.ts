import { describe, expect, it } from 'vitest';
import type { StyleLayer } from '../../model/style-sections';
import { createInitialPreviewSim, previewSetLockup } from '../simulation';
import { renderLayerPixels } from './basic';

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
      'sparktip',
      'cylon',
    ]) {
      const buffer = renderLayerPixels(layer(styleName), {}, 16, 1200, sim);
      expect(buffer.r.length).toBe(16);
    }
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
