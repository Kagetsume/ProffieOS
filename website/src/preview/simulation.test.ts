/**
 * Tests for preview power/event simulation.
 */
import { describe, expect, it } from 'vitest';
import type { StyleSection } from '../model/style-sections';
import {
  advancePreviewSim,
  bladeLengthFraction,
  createInitialPreviewSim,
  eventIntensity,
  isBaseBladeVisible,
  isIgnitionActive,
  isOverlayPhaseActive,
  isPostoffActive,
  isPreonActive,
  overlayPhaseForStyle,
  previewAnimationMs,
  previewPowerOff,
  previewPowerOn,
  previewSetBladeAngle,
  previewSetDrag,
  previewSetLb,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
  sectionHasIgnitionFlash,
  sectionHasPostoff,
  sectionInOutTimes,
  sectionHasPreon,
  transitionProgress,
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
    const off = { ...createInitialPreviewSim(), powered: false };
    let sim = previewPowerOn(off, 1000, { extendMs: 300, retractMs: 800 }, true, false);
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
    expect(sectionHasPostoff(['postoff_wipe'])).toBe(true);
    expect(sectionHasIgnitionFlash(['ignition_flash'])).toBe(true);
  });

  it('floors preview animation times for readability', () => {
    expect(previewAnimationMs(100, 'extend')).toBeGreaterThan(100);
    expect(previewAnimationMs(100, 'retract')).toBeGreaterThan(100);
  });

  it('tracks overlay phases and intensities', () => {
    expect(overlayPhaseForStyle('blast')).toBe('blast');
    expect(overlayPhaseForStyle('unknown')).toBeUndefined();
    const sim = createInitialPreviewSim();
    expect(isOverlayPhaseActive('blast', sim, 1000)).toBe(false);
    const blasted = previewTriggerEvent(sim, 'blast', 1000);
    expect(isOverlayPhaseActive('blast', blasted, 1100)).toBe(true);
    expect(eventIntensity(blasted.blastUntil, 1100, 400)).toBeGreaterThan(0);
    expect(eventIntensity(0, 1000, 400)).toBe(0);
    expect(isOverlayPhaseActive('lockup', previewSetLockup(sim, true), 1000)).toBe(true);
    expect(isOverlayPhaseActive('drag', previewSetDrag(sim, true), 1000)).toBe(true);
    expect(isOverlayPhaseActive('melt', previewSetMelt(sim, true), 1000)).toBe(true);
    expect(isOverlayPhaseActive('lb', previewSetLb(sim, true), 1000)).toBe(true);
  });

  it('reports transition helpers during preon and ignition', () => {
    const off = { ...createInitialPreviewSim(), powered: false };
    let sim = previewPowerOn(off, 1000, { extendMs: 300, retractMs: 800 }, true, true);
    expect(isPreonActive(sim, 1100)).toBe(true);
    expect(transitionProgress(sim, 1100)).toBeGreaterThan(0);
    sim = advancePreviewSim(sim, 1000 + 800);
    expect(sim.transition).toBe('extending');
    expect(isBaseBladeVisible(sim, 2000)).toBe(true);
    sim = advancePreviewSim(sim, 10000);
    expect(isBaseBladeVisible(sim, 10000)).toBe(true);
    expect(isIgnitionActive(sim, 10000)).toBe(false);
  });

  it('toggles lb and swing events', () => {
    const on = createInitialPreviewSim();
    expect(previewSetLb(on, true).lbActive).toBe(true);
    const swung = previewTriggerEvent(on, 'swing', 3000);
    expect(swung.swingUntil).toBeGreaterThan(3000);
    const clashed = previewTriggerEvent(on, 'clash', 4000);
    expect(clashed.clashUntil).toBeGreaterThan(4000);
  });

  it('covers remaining overlay phase branches', () => {
    const off = { ...createInitialPreviewSim(), powered: false };
    let sim = previewPowerOn(off, 1000, { extendMs: 300, retractMs: 800 }, true, false);
    expect(isOverlayPhaseActive('preon', sim, 1100)).toBe(true);
    sim = advancePreviewSim(sim, 1000 + 800);
    expect(isOverlayPhaseActive('ignition', sim, sim.transitionStartedAt + 100)).toBe(true);
    sim = advancePreviewSim(sim, 10000);
    expect(isOverlayPhaseActive('idle_on', sim, 10000)).toBe(true);

    const on = createInitialPreviewSim();
    sim = previewPowerOff(on, 5000, { extendMs: 300, retractMs: 400 }, true);
    sim = advancePreviewSim(sim, sim.transitionUntil + 1);
    expect(isOverlayPhaseActive('postoff', sim, sim.transitionStartedAt + 100)).toBe(true);
  });

  it('ignores power on when already ignited', () => {
    const on = createInitialPreviewSim();
    expect(previewPowerOn(on, 1000, { extendMs: 300, retractMs: 800 }, false, false)).toBe(on);
    const off = { ...createInitialPreviewSim(), powered: false, transition: 'none' as const };
    expect(previewPowerOff(off, 1000, { extendMs: 300, retractMs: 800 }, false)).toBe(off);
    expect(previewSetLb(off, true).lbActive).toBe(false);
  });

  it('clears postoff state after completion', () => {
    const on = createInitialPreviewSim();
    let sim = previewPowerOff(on, 5000, { extendMs: 300, retractMs: 400 }, true);
    sim = advancePreviewSim(sim, sim.transitionUntil + 1);
    expect(isPostoffActive(sim, sim.transitionStartedAt + 100)).toBe(true);
    sim = advancePreviewSim(sim, sim.transitionUntil + 1);
    expect(sim.transition).toBe('none');
    expect(sim.powered).toBe(false);
  });
});
