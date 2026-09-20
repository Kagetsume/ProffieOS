/**
 * Tests for preview power/event simulation.
 */
import { describe, expect, it } from 'vitest';
import type { StyleSection } from '../model/style-sections';
import {
  advancePreviewSim,
  bladeLengthFraction,
  createInitialPreviewSim,
  previewPowerOff,
  previewPowerOn,
  previewSetBladeAngle,
  previewSetDrag,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
  sectionInOutTimes,
  sectionHasPreon,
} from './simulation';

describe('preview simulation', () => {
  it('starts powered on by default', () => {
    const sim = createInitialPreviewSim();
    expect(sim.powered).toBe(true);
    expect(bladeLengthFraction(sim, 0)).toBe(1);
  });

  it('reads extend/retract from section vars', () => {
    const section: StyleSection = {
      id: 'with_vars',
      vars: { ext: '500', ret: '1200' },
      layers: [],
    };
    expect(sectionInOutTimes(section)).toEqual({ extendMs: 500, retractMs: 1200 });
  });

  it('extends blade after preon completes', () => {
    let sim = previewPowerOn(createInitialPreviewSim(), 1000, { extendMs: 300, retractMs: 800 }, true, false);
    expect(sim.transition).toBe('preon');

    sim = advancePreviewSim(sim, 1000 + 800);
    expect(sim.transition).toBe('extending');
    expect(bladeLengthFraction(sim, 1000 + 900)).toBeGreaterThan(0);
    expect(bladeLengthFraction(sim, 1000 + 900)).toBeLessThan(1);

    sim = advancePreviewSim(sim, 1000 + 3000);
    expect(sim.powered).toBe(true);
    expect(sim.transition).toBe('none');
  });

  it('retracts blade on power off before postoff', () => {
    const on = createInitialPreviewSim();
    let sim = previewPowerOff(on, 2000, { extendMs: 300, retractMs: 400 }, true);
    expect(sim.transition).toBe('retracting');
    expect(bladeLengthFraction(sim, 2100)).toBeLessThan(1);

    sim = advancePreviewSim(sim, 3500);
    expect(sim.transition).toBe('postoff');
    expect(sim.powered).toBe(false);
  });

  it('toggles lockup while on and clears when off', () => {
    const on = createInitialPreviewSim();
    const locked = previewSetLockup(on, true);
    expect(locked.lockupActive).toBe(true);

    const unlocked = previewSetLockup(locked, false);
    expect(unlocked.lockupActive).toBe(false);

    const off = { ...createInitialPreviewSim(), powered: false, transition: 'none' as const };
    expect(previewSetLockup(off, true).lockupActive).toBe(false);
  });

  it('toggles melt independently from lockup', () => {
    const on = createInitialPreviewSim();
    const melted = previewSetMelt(on, true);
    expect(melted.meltActive).toBe(true);
    expect(melted.lockupActive).toBe(false);

    const both = previewSetLockup(melted, true);
    expect(both.meltActive).toBe(true);
    expect(both.lockupActive).toBe(true);
  });

  it('clamps manual blade angle to 0…1', () => {
    const on = createInitialPreviewSim();
    expect(on.bladeAngleNorm).toBe(0.5);
    expect(previewSetBladeAngle(on, 0.2).bladeAngleNorm).toBe(0.2);
    expect(previewSetBladeAngle(on, 1.5).bladeAngleNorm).toBe(1);
    expect(previewSetBladeAngle(on, -0.2).bladeAngleNorm).toBe(0);
  });

  it('toggles drag independently from lockup', () => {
    const on = createInitialPreviewSim();
    const dragging = previewSetDrag(on, true);
    expect(dragging.dragActive).toBe(true);
    expect(dragging.lockupActive).toBe(false);

    const both = previewSetLockup(dragging, true);
    expect(both.dragActive).toBe(true);
    expect(both.lockupActive).toBe(true);

    const off = { ...createInitialPreviewSim(), powered: false, transition: 'none' as const };
    expect(previewSetDrag(off, true).dragActive).toBe(false);
  });

  it('does not clone sim state on idle animation ticks', () => {
    const sim = createInitialPreviewSim();
    expect(advancePreviewSim(sim, 5000)).toBe(sim);
  });

  it('triggers blast only when blade is on', () => {
    const off = { ...createInitialPreviewSim(), powered: false, transition: 'none' as const };
    const triggered = previewTriggerEvent(off, 'blast', 1000);
    expect(triggered.blastUntil).toBe(0);

    const on = createInitialPreviewSim();
    const blasted = previewTriggerEvent(on, 'blast', 2000);
    expect(blasted.blastUntil).toBeGreaterThan(2000);
  });

  it('detects preon layers in a section', () => {
    expect(sectionHasPreon(['standard', 'preon_glow'])).toBe(true);
    expect(sectionHasPreon(['fire', 'blast'])).toBe(false);
  });
});
