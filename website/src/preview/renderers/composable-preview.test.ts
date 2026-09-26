import { describe, expect, it } from 'vitest';
import type { StyleLayer } from '../../model/style-sections';
import { getConfigStyle, instantiateConfigStyle } from '../../model/config-styles';
import { renderStylePreview } from '../frame';
import {
  createInitialPreviewSim,
  previewPowerOn,
  previewSetDrag,
  previewSetLb,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
} from '../simulation';
import { renderLayerPixels } from './basic';

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
    return alpha > 0 && buffer.r[index]! + buffer.g[index]! + buffer.b[index]! > 0;
  });
}

const IDLE_TEXTURE_STYLES: Array<{ name: string; args?: string[]; blend?: StyleLayer['blend'] }> = [
  { name: 'gradient_layer', args: ['red', 'blue'] },
  { name: 'rainbow_layer' },
  { name: 'audio_layer', blend: 'multiply' },
  { name: 'pulse_layer', args: ['3000'], blend: 'multiply' },
  { name: 'swing_layer', args: ['10', '200'], blend: 'multiply' },
  { name: 'base_flicker', args: ['10', '300', '500'], blend: 'multiply' },
  { name: 'per_led_flicker', blend: 'multiply' },
  { name: 'noise_flicker', args: ['black', 'white'], blend: 'multiply' },
  { name: 'unstable_stripes', args: ['silver'] },
  { name: 'fire_mask', args: ['white', 'white'], blend: 'multiply' },
  { name: 'stripes', args: ['800', '-1500', 'white', 'cyan'], blend: 'add' },
  { name: 'hard_stripes', args: ['1200', '-4000', 'black', 'white'], blend: 'multiply' },
  { name: 'random_bands', args: ['-600', 'green', 'black', '3000'], blend: 'multiply' },
  { name: 'sine_waves', args: ['2400', '0', '8192', '65535', '-2000'], blend: 'multiply' },
  { name: 'saw_waves', args: ['2400', '0', '8192', '65535', '-2000'], blend: 'multiply' },
  { name: 'pulse_train', args: ['2400', '-2000', '0', '65535', '16384'], blend: 'multiply' },
  { name: 'chirp', args: ['2400', '-2000', '8192', '65535', '80'], blend: 'multiply' },
  { name: 'smoothstep_bands', args: ['2400', '-2000', '8192', '65535', '400'], blend: 'multiply' },
  { name: 'value_noise', args: ['2400', '-2000', '8192', '65535', '0'], blend: 'multiply' },
  { name: 'fbm_noise', args: ['2400', '-1500', '8192', '65535', '65535'], blend: 'multiply' },
  { name: 'moire_mask', args: ['2400', '2450', '-2000', '2100', '8192', '65535'], blend: 'multiply' },
  { name: 'blade_envelope', args: ['16384', '6000', '8192', '65535', '0'], blend: 'multiply' },
  { name: 'sine_waves_swing', args: ['2400', '0', '8192', '65535', '-2000'], blend: 'multiply' },
  { name: 'smoke_flow', args: ['black', 'white', '300', '800'], blend: 'multiply' },
  { name: 'smoke_up', args: ['black', 'white', '300', '800'], blend: 'multiply' },
  { name: 'smoke_down', args: ['black', 'white', '300', '800'], blend: 'multiply' },
  { name: 'pixel_sequence', args: ['0,0,255,0,60,150|0,255,0,0,60,150'] },
  { name: 'water_flow_layer', args: ['blue'] },
  { name: 'darksaber_layer', args: ['silver'] },
  { name: 'static_electricity_layer', args: ['deepskyblue'] },
  { name: 'power_wave_layer', args: ['silver'] },
  { name: 'fallen_order_layer', args: ['silver'] },
  { name: 'shimmer_blade_layer', args: ['cyan'] },
  { name: 'rotoscope_layer', args: ['silver'] },
  { name: 'pulse_stripes_layer', args: ['blue'] },
  { name: 'kinetic_charge_layer', args: ['blue', 'purple'] },
  { name: 'rotating_pulse_layer', args: ['blue'] },
  { name: 'trickle_blade_layer', args: ['green'] },
  { name: 'cylon_layer', args: ['red', '25', '200'], blend: 'add' },
  { name: 'thunder_loop_layer', args: ['blue'], blend: 'multiply' },
  { name: 'responsive_flame_layer', args: ['orange'], blend: 'multiply' },
];

const EVENT_OVERLAY_STYLES: Array<{
  name: string;
  args?: string[];
  setup: (sim: ReturnType<typeof createInitialPreviewSim>, now: number) => ReturnType<typeof createInitialPreviewSim>;
}> = [
  {
    name: 'blast',
    setup: (sim, now) => previewTriggerEvent(sim, 'blast', now),
  },
  {
    name: 'blast_wave_random',
    setup: (sim, now) => previewTriggerEvent(sim, 'blast', now),
  },
  {
    name: 'responsive_blast',
    setup: (sim, now) => previewTriggerEvent(sim, 'blast', now),
  },
  {
    name: 'clash',
    setup: (sim, now) => previewTriggerEvent(sim, 'clash', now),
  },
  {
    name: 'localized_clash',
    setup: (sim, now) => previewTriggerEvent(sim, 'clash', now),
  },
  {
    name: 'responsive_clash',
    setup: (sim, now) => previewTriggerEvent(sim, 'clash', now),
  },
  {
    name: 'real_clash',
    args: ['white', '16000'],
    setup: (sim, now) => previewTriggerEvent(sim, 'clash', now),
  },
  {
    name: 'swing',
    setup: (sim, now) => previewTriggerEvent(sim, 'swing', now),
  },
  {
    name: 'force_glow',
    setup: (sim, now) => previewTriggerEvent(sim, 'force', now),
  },
  {
    name: 'responsive_lockup',
    setup: (sim) => previewSetLockup(sim, true),
  },
  {
    name: 'lockup',
    setup: (sim) => previewSetLockup(sim, true),
  },
  {
    name: 'drag',
    setup: (sim) => previewSetDrag(sim, true),
  },
  {
    name: 'melt',
    setup: (sim) => previewSetMelt(sim, true),
  },
  {
    name: 'lb',
    setup: (sim) => previewSetLb(sim, true),
  },
  {
    name: 'sparkle',
    args: ['white'],
    setup: (sim) => sim,
  },
  {
    name: 'pulse',
    args: ['white', '3000'],
    setup: (sim) => sim,
  },
];

describe('composable layer preview coverage', () => {
  const poweredSim = createInitialPreviewSim();

  it('renders solid_bend base for composable stacks', () => {
    const base = renderLayerPixels(layer('solid_bend', ['blue', '300', '800']), {}, 24, 1000, poweredSim);
    expect(hasLitPixels(base)).toBe(true);
  });

  for (const { name, args, blend } of IDLE_TEXTURE_STYLES) {
    it(`idle texture ${name} renders lit pixels when blade is on`, () => {
      const buffer = renderLayerPixels(layer(name, args, blend ?? 'normal'), {}, 24, 1200, poweredSim);
      expect(hasLitPixels(buffer)).toBe(true);
    });
  }

  const ANIMATED_TEXTURES = IDLE_TEXTURE_STYLES.filter(({ name }) =>
    [
      'sine_waves',
      'saw_waves',
      'pulse_train',
      'chirp',
      'smoothstep_bands',
      'value_noise',
      'fbm_noise',
      'moire_mask',
      'sine_waves_swing',
      'rainbow_layer',
      'audio_layer',
      'pulse_layer',
      'unstable_stripes',
      'water_flow_layer',
      'cylon_layer',
      'thunder_loop_layer',
    ].includes(name),
  );

  for (const { name, args, blend } of ANIMATED_TEXTURES) {
    it(`animated texture ${name} changes over time`, () => {
      const style = layer(name, args, blend ?? 'normal');
      const early = renderLayerPixels(style, {}, 24, 100, poweredSim);
      const later = renderLayerPixels(style, {}, 24, 2100, poweredSim);
      const changed = later.r.some(
        (value, index) =>
          value !== early.r[index] ||
          later.g[index] !== early.g[index] ||
          later.b[index] !== early.b[index],
      );
      expect(changed, `${name} should animate between t=100 and t=2100`).toBe(true);
    });
  }

  for (const { name, args, setup } of EVENT_OVERLAY_STYLES) {
    it(`event overlay ${name} renders when active`, () => {
      const now = 2000;
      const active = setup(poweredSim, now);
      const buffer = renderLayerPixels(layer(name, args ?? ['white']), {}, 24, now + 50, active);
      expect(hasLitPixels(buffer)).toBe(true);
    });
  }

  it('sparktip_layer renders during extension only', () => {
    const idle = renderLayerPixels(layer('sparktip_layer', ['white', '300', '800']), {}, 24, 1000, poweredSim);
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

  it('preon_glow renders during preon transition', () => {
    const sim = {
      ...createInitialPreviewSim(),
      powered: false,
      transition: 'preon' as const,
      transitionStartedAt: 0,
      transitionUntil: 750,
    };
    const buffer = renderLayerPixels(layer('preon_glow', ['cyan']), {}, 24, 200, sim);
    expect(hasLitPixels(buffer)).toBe(true);
  });

  it('ignition_flash renders during extend', () => {
    const off = createInitialPreviewSim();
    off.powered = false;
    const extending = previewPowerOn(off, 0, { extendMs: 300, retractMs: 800 }, false, false);
    const buffer = renderLayerPixels(layer('ignition_flash', ['white', '300', '600']), {}, 24, 100, extending);
    expect(hasLitPixels(buffer)).toBe(true);
  });

  it('composable_checklist full stack previews with lit pixels', () => {
    const def = getConfigStyle('composable_checklist');
    expect(def).toBeDefined();
    const section = instantiateConfigStyle(def!, 'composable_checklist');
    const frame = renderStylePreview(section, 32, 1500, poweredSim);
    expect(frame.pixels.r.some((value, index) => value > 0 && frame.pixels.a[index]! > 0)).toBe(true);
  });

  it('composable_checklist_responsive full stack previews with lit pixels', () => {
    const def = getConfigStyle('composable_checklist_responsive');
    expect(def).toBeDefined();
    const section = instantiateConfigStyle(def!, 'composable_checklist_responsive');
    const frame = renderStylePreview(section, 32, 1500, poweredSim);
    expect(frame.pixels.r.some((value, index) => value > 0 && frame.pixels.a[index]! > 0)).toBe(true);
  });
});
