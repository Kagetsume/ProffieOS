/**
 * Additional branch coverage for preview renderers, layout, and simulation edge cases.
 */
import { describe, expect, it } from 'vitest';
import type { StyleLayer } from '../model/style-sections';
import {
  advancePreviewSim,
  createInitialPreviewSim,
  previewPowerOff,
  previewPowerOn,
  previewSetLb,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
} from './simulation';
import { renderLayerPixels } from './renderers/basic';
import { renderEventOverlay } from './renderers/overlays';
import {
  applyVerticalBladeCanvas,
  clipBladeVisibleLength,
  drawBladeWithSoftEdges,
  featherBladeSides,
  measureVerticalSaberLayout,
} from './vertical-layout';
import {
  brightnessOverlayFromFlickerArgs,
  brightnessOverlayFromPulseArgs,
  brightnessOverlayFromSwingArgs,
  brightnessOverlayScale,
  uniformBrightnessMix,
} from './uniform-brightness-overlay';

function layer(styleName: string, args: string[] = []): StyleLayer {
  return { id: 'l1', styleName, args, blend: 'normal', opacity: 32768 };
}

describe('preview branch coverage', () => {
  const sim = createInitialPreviewSim();

  it('covers ignition, sparkle, and inactive held overlay branches', () => {
    const extending = {
      ...createInitialPreviewSim(),
      powered: false,
      transition: 'extending' as const,
      transitionStartedAt: 1000,
      transitionUntil: 1000,
    };
    expect(renderEventOverlay('ignition_flash', ['white'], 24, 1500, extending)).toBeNull();

    const extendingLit = { ...extending, transitionUntil: 3000 };
    expect(
      renderEventOverlay('ignition_flash', ['white'], 24, 1500, extendingLit)?.a.some((a) => a > 0),
    ).toBe(true);

    expect(renderEventOverlay('sparkle', ['white'], 24, 1000, sim)?.a.some((a) => a >= 0)).toBe(true);
    expect(renderEventOverlay('lockup', ['white'], 24, 1000, sim)).toBeNull();
    expect(renderEventOverlay('drag', ['white'], 24, 1000, sim)).toBeNull();
    expect(renderEventOverlay('postoff_wipe', ['cyan'], 24, 1000, sim)).toBeNull();
    expect(renderEventOverlay('postoff_sputter', ['cyan'], 24, 1000, sim)).toBeNull();
  });

  it('covers overlay null-intensity and held-state branches', () => {
    expect(renderEventOverlay('blast', ['white'], 24, 5000, sim)).toBeNull();
    expect(renderEventOverlay('responsive_blast', ['white'], 24, 5000, sim)).toBeNull();
    expect(renderEventOverlay('responsive_clash', ['white'], 24, 5000, sim)).toBeNull();
    expect(renderEventOverlay('swing', ['white'], 24, 5000, sim)).toBeNull();

    const forced = previewTriggerEvent(sim, 'force', 1000);
    expect(
      renderEventOverlay('force_glow', ['white'], 24, 1100, forced)?.a.some((a) => a > 0),
    ).toBe(true);

    const melted = previewSetMelt(sim, true);
    expect(renderEventOverlay('melt', ['orange'], 24, 1000, melted)?.a.some((a) => a > 0)).toBe(
      true,
    );
    const lb = previewSetLb(sim, true);
    expect(renderEventOverlay('lb', ['white'], 24, 1000, lb)?.a.some((a) => a > 0)).toBe(true);

    const locked = previewSetLockup({ ...sim, bladeAngleNorm: 0.25 }, true);
    expect(
      renderEventOverlay('responsive_blast', ['white'], 24, 1100, previewTriggerEvent(locked, 'blast', 1000))
        ?.a.some((a) => a > 0),
    ).toBe(true);
  });

  it('covers postoff overlay branches', () => {
    const on = createInitialPreviewSim();
    let state = previewPowerOff(on, 5000, { extendMs: 300, retractMs: 400 }, true);
    state = advancePreviewSim(state, state.transitionUntil + 1);
    const duringPostoff = state.transitionStartedAt + 50;
    expect(renderEventOverlay('postoff_glow', ['cyan'], 24, duringPostoff, state)?.a.some((a) => a > 0)).toBe(
      true,
    );
    expect(renderEventOverlay('postoff_wipe', ['cyan'], 24, duringPostoff, state)?.a.some((a) => a > 0)).toBe(
      true,
    );
    expect(
      renderEventOverlay('postoff_sputter', ['cyan'], 24, duringPostoff, state)?.a.some((a) => a > 0),
    ).toBe(true);
  });

  it('covers additional base style and default branches', () => {
    for (const styleName of [
      'solid_bend',
      'standard_bend',
      'fire_mask',
      'smoke_up',
      'smoke_down',
      'smoke_flow',
      'hard_stripes',
      'random_bands',
      'sine_waves',
      'saw_waves',
      'pulse_train',
      'chirp',
      'smoothstep_bands',
      'value_noise',
      'fbm_noise',
      'moire_mask',
      'blade_envelope',
      'sine_waves_swing',
      'pixel_sequence',
      'water_flow',
      'darksaber',
      'kinetic_charge',
      'rotating_pulse',
      'trickle_blade',
      'cylon',
      'sparktip_layer',
      'totally_unknown_style',
    ]) {
      const buffer = renderLayerPixels(layer(styleName, ['cyan', 'white']), {}, 16, 1500, sim);
      expect(buffer.r.length).toBe(16);
    }

    const retracted = { ...sim, powered: false, transition: 'none' as const };
    expect(renderLayerPixels(layer('fire_mask', ['red', 'yellow']), {}, 16, 1500, retracted).a.every((a) => a === 0)).toBe(
      true,
    );
    expect(renderLayerPixels(layer('blast', ['white']), {}, 16, 5000, sim).a.every((a) => a === 0)).toBe(
      true,
    );
    expect(renderLayerPixels(layer('standard', ['cyan', 'white']), {}, 1, 1000, sim).r.length).toBe(1);
  });

  it('covers power-off cancellation branches', () => {
    const off = { ...createInitialPreviewSim(), powered: false };
    let extending = previewPowerOn(off, 1000, { extendMs: 300, retractMs: 800 }, false, false);
    expect(extending.transition).toBe('extending');
    const cancelled = previewPowerOff(extending, 1100, { extendMs: 300, retractMs: 800 }, false);
    expect(cancelled.powered).toBe(false);

    let preon = previewPowerOn(off, 2000, { extendMs: 300, retractMs: 800 }, true, false);
    expect(preon.transition).toBe('preon');
    preon = previewPowerOff(preon, 2100, { extendMs: 300, retractMs: 800 }, false);
    expect(preon.transition).toBe('none');
  });

  it('covers no-op combat toggles when already in target state', () => {
    const locked = previewSetLockup(sim, true);
    expect(previewSetLockup(locked, true)).toBe(locked);
    const melted = previewSetMelt(sim, true);
    expect(previewSetMelt(melted, true)).toBe(melted);

    const offLocked = {
      ...createInitialPreviewSim(),
      powered: false,
      transition: 'none' as const,
      lockupActive: true,
    };
    expect(previewSetLockup(offLocked, true).lockupActive).toBe(false);
  });

  it('covers vertical layout edge branches', () => {
    const zeroPixels = measureVerticalSaberLayout({
      hiltDisplayWidth: 40,
      hiltDisplayHeight: 120,
      pixelCount: 0,
    });
    expect(zeroPixels.pixelCssHeight).toBe(zeroPixels.bladeCssHeight);

    const layout = measureVerticalSaberLayout({
      hiltDisplayWidth: 40,
      hiltDisplayHeight: 120,
      pixelCount: 24,
      devicePixelRatio: 2,
    });
    const canvas = document.createElement('canvas');
    const ctx = applyVerticalBladeCanvas(canvas, layout);
    clipBladeVisibleLength(ctx, layout.bladeCssWidth, layout.bladeCssHeight, layout.bladeTipRadius, 0);
    featherBladeSides(ctx, 4, layout.bladeCssHeight, 0);
    featherBladeSides(ctx, 2, layout.bladeCssHeight, 4);
    featherBladeSides(ctx, 6, layout.bladeCssHeight, 4);

    const source = document.createElement('canvas');
    source.width = layout.bladeBackingWidth;
    source.height = layout.bladeBackingHeight;
    const sourceCtx = source.getContext('2d')!;
    sourceCtx.fillStyle = '#0ff';
    sourceCtx.fillRect(0, 0, source.width, source.height);
    drawBladeWithSoftEdges(ctx, source, layout);
    expect(canvas.width).toBeGreaterThan(0);
  });

  it('covers brightness overlay helper branches', () => {
    expect(uniformBrightnessMix(-100, 150)).toBeGreaterThanOrEqual(0);
    expect(uniformBrightnessMix(40000, 150)).toBeLessThanOrEqual(1);
    expect(brightnessOverlayFromFlickerArgs(['', '', ''])).toMatchObject({ mode: 'random_hold' });
    expect(brightnessOverlayFromPulseArgs([''])).toMatchObject({ mode: 'sine' });
    expect(brightnessOverlayFromSwingArgs(['', ''], 2)).toMatchObject({ mode: 'swing', intensity: 1 });
    expect(
      brightnessOverlayScale(1500, {
        mode: 'random_hold',
        deltaPercent: 10,
        minPeriodMs: 500,
        maxPeriodMs: 500,
      }),
    ).toBeDefined();
  });
});
