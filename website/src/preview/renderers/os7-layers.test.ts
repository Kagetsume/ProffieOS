import { describe, expect, it } from 'vitest';
import { compositeLayer, createPixelBuffer, fillSolid } from '../composite';
import { createInitialPreviewSim, previewSetLockup } from '../simulation';
import { renderLayerPixels } from './basic';
import type { StyleLayer } from '../../model/style-sections';
import { renderStylePreview } from '../frame';
import { getConfigStyle, instantiateConfigStyle } from '../../model/config-styles';

function layer(
  styleName: string,
  args: string[] = [],
  blend: StyleLayer['blend'] = 'normal',
  opacity = 32768,
): StyleLayer {
  return { id: 'layer-1', styleName, args, blend, opacity };
}

function hasLitPixels(buffer: { r: number[]; g: number[]; b: number[]; a: number[] }): boolean {
  return buffer.r.some((_, index) => {
    const alpha = buffer.a[index] ?? 0;
    return alpha > 0 && (buffer.r[index]! + buffer.g[index]! + buffer.b[index]! > 0);
  });
}

const OS7_LAYER_STYLES = [
  'unstable_stripes',
  'thunder_loop_layer',
  'responsive_flame_layer',
  'water_flow_layer',
  'darksaber_layer',
  'static_electricity_layer',
  'power_wave_layer',
  'fallen_order_layer',
  'shimmer_blade_layer',
  'rotoscope_layer',
  'pulse_stripes_layer',
  'kinetic_charge_layer',
  'rotating_pulse_layer',
  'trickle_blade_layer',
  'cylon_layer',
] as const;

describe('os7 layer preview renderers', () => {
  const sim = createInitialPreviewSim();

  for (const styleName of OS7_LAYER_STYLES) {
    it(`renders animated pixels for ${styleName}`, () => {
      const early = renderLayerPixels(layer(styleName), {}, 24, 0, sim);
      const later = renderLayerPixels(layer(styleName), {}, 24, 2500, sim);
      expect(early.r.length).toBe(24);
      expect(hasLitPixels(early)).toBe(true);
      expect(
        later.r.some(
          (value, index) =>
            value !== early.r[index] ||
            later.g[index] !== early.g[index] ||
            later.b[index] !== early.b[index],
        ),
      ).toBe(true);
    });
  }

  it('cylon_layer keeps off-band pixels dark for add stacks', () => {
    const buffer = renderLayerPixels(layer('cylon_layer', ['red', '25', '200']), {}, 32, 500, sim);
    expect(buffer.r.some((value) => value === 0)).toBe(true);
    expect(buffer.r.some((value) => value > 0)).toBe(true);
  });

  it('kinetic_charge_layer shifts toward kinetic color under lockup', () => {
    const idle = renderLayerPixels(layer('kinetic_charge_layer', ['blue', 'purple']), {}, 16, 1000, sim);
    const locked = renderLayerPixels(
      layer('kinetic_charge_layer', ['blue', 'purple']),
      {},
      16,
      1000,
      previewSetLockup(sim, true),
    );
    const idleAvg = idle.r.reduce((sum, value) => sum + value, 0) / idle.r.length;
    const lockedAvg = locked.r.reduce((sum, value) => sum + value, 0) / locked.r.length;
    expect(lockedAvg).toBeGreaterThan(idleAvg);
  });

  it('sparktip_layer shows spark only while extending', () => {
    const idle = renderLayerPixels(layer('sparktip_layer', ['white', '300', '800']), {}, 24, 1000, sim);
    const extending = {
      ...createInitialPreviewSim(),
      powered: false,
      transition: 'extending' as const,
      transitionStartedAt: 0,
      transitionUntil: 900,
    };
    const midExtend = renderLayerPixels(
      layer('sparktip_layer', ['white', '300', '800']),
      {},
      24,
      150,
      extending,
    );
    expect(hasLitPixels(idle)).toBe(false);
    expect(hasLitPixels(midExtend)).toBe(true);
  });

  it('composites solid_bend + water_flow_layer over time', () => {
    const section = {
      id: 'composable_water_flow',
      vars: { base: 'blue' },
      layers: [
        layer('solid_bend', ['{{base}}', '300', '800']),
        layer('water_flow_layer', ['{{base}}']),
      ],
    };
    const early = renderStylePreview(section, 32, 0);
    const later = renderStylePreview(section, 32, 2000);
    expect(hasLitPixels(early.pixels)).toBe(true);
    expect(
      later.pixels.r.some(
        (value, index) =>
          value !== early.pixels.r[index] ||
          later.pixels.g[index] !== early.pixels.g[index] ||
          later.pixels.b[index] !== early.pixels.b[index],
      ),
    ).toBe(true);
  });

  it('multiply stack preserves hue while modulating brightness', () => {
    const base = createPixelBuffer(8);
    fillSolid(base, [0, 0, 200]);
    const texture = renderLayerPixels(layer('power_wave_layer', ['blue']), {}, 8, 1200, sim);
    compositeLayer(base, texture, 'multiply', 32768);
    expect(base.r.every((value) => value <= 200)).toBe(true);
    expect(base.b.every((value) => value > 0)).toBe(true);
  });
});

describe('os7 layer config catalog parity', () => {
  it('smoke_blade preview still animates with solid + smoke_flow stack', () => {
    const style = getConfigStyle('smoke_blade');
    expect(style).toBeDefined();
    const section = instantiateConfigStyle(style!, 'smoke_blade');
    const early = renderStylePreview(section, 32, 0);
    const later = renderStylePreview(section, 32, 2000);
    expect(hasLitPixels(early.pixels)).toBe(true);
    expect(
      later.pixels.r.some(
        (value, index) =>
          value !== early.pixels.r[index] ||
          later.pixels.g[index] !== early.pixels.g[index] ||
          later.pixels.b[index] !== early.pixels.b[index],
      ),
    ).toBe(true);
  });
});
