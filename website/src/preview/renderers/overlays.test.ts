import { describe, expect, it } from 'vitest';
import {
  advancePreviewSim,
  createInitialPreviewSim,
  previewPowerOn,
  previewSetDrag,
  previewSetLockup,
  previewTriggerEvent,
} from '../simulation';
import {
  renderBlastOverlay,
  renderBlastWaveOverlay,
  renderClashOverlay,
  renderDragOverlay,
  renderEventOverlay,
  renderIgnitionFlash,
  renderLbOverlay,
  renderLockupOverlay,
  renderMeltOverlay,
  renderPostoffGlow,
  renderPostoffSputter,
  renderPostoffWipe,
  renderPreonGlow,
  renderPreonSputter,
  renderPreonWipe,
  renderSparkleOverlay,
  renderSwingOverlay,
} from './overlays';

describe('overlay renderers', () => {
  it('renders blast and clash overlays with alpha', () => {
    const blast = renderBlastOverlay(['white'], 32, 1);
    expect(blast.a.some((alpha) => alpha > 0)).toBe(true);
    const clash = renderClashOverlay(['white'], 32, 1, 'clash');
    expect(clash.a.some((alpha) => alpha > 0)).toBe(true);
  });

  it('renders preon, postoff, and ignition overlays', () => {
    expect(renderPreonGlow(['cyan'], 24, 0.5).a.some((alpha) => alpha > 0)).toBe(true);
    expect(renderPostoffGlow(['cyan'], 24, 0.5).a.some((alpha) => alpha > 0)).toBe(true);
    expect(renderIgnitionFlash(['white'], 24, 0.5).a.some((alpha) => alpha > 0)).toBe(true);
  });

  it('renders held combat overlays', () => {
    expect(renderLockupOverlay(['white'], 32, 1, 0.5, 1000).a.some((alpha) => alpha > 0)).toBe(
      true,
    );
    expect(renderDragOverlay(['white'], 32, 1, 1000).a.some((alpha) => alpha > 0)).toBe(true);
    expect(renderMeltOverlay(['orange'], 32, 1, 1000).a.some((alpha) => alpha > 0)).toBe(true);
    expect(renderLbOverlay(['white'], 32, 1, 1000).a.some((alpha) => alpha > 0)).toBe(true);
  });

  it('renders swing and sparkle overlays', () => {
    const swing = renderSwingOverlay(['white'], 32, 1);
    expect(swing.a.some((alpha) => alpha > 0)).toBe(true);
    const sparkle = renderSparkleOverlay(['white'], 32, 1000);
    expect(sparkle.a.some((alpha) => alpha > 0)).toBe(true);
  });

  it('varies clash intensity with style and strength', () => {
    const weak = renderClashOverlay(['white'], 32, 0.2, 'clash');
    const strong = renderClashOverlay(['white'], 32, 1, 'clash');
    expect(strong.a.some((alpha, index) => alpha > weak.a[index]!)).toBe(true);
    expect(renderClashOverlay(['white'], 32, 1, 'localized_clash').a.some((a) => a > 0)).toBe(
      true,
    );
    expect(renderBlastWaveOverlay(['white'], 32, 1, 1000).a.some((a) => a > 0)).toBe(true);
  });

  it('routes event overlays through renderEventOverlay', () => {
    const sim = createInitialPreviewSim();
    const blasted = previewTriggerEvent(sim, 'blast', 1000);
    expect(renderEventOverlay('blast', ['white'], 24, 1100, blasted)?.a.some((a) => a > 0)).toBe(
      true,
    );
    expect(renderEventOverlay('blast_wave_random', ['white'], 24, 1100, blasted)?.a.some((a) => a > 0)).toBe(
      true,
    );
    const locked = previewSetLockup(sim, true);
    expect(
      renderEventOverlay('lockup', ['white'], 24, 1000, locked)?.a.some((a) => a > 0),
    ).toBe(true);
    expect(
      renderEventOverlay('responsive_lockup', ['white'], 24, 1000, locked)?.a.some((a) => a > 0),
    ).toBe(true);
    const dragging = previewSetDrag(sim, true);
    expect(renderEventOverlay('drag', ['white'], 24, 1000, dragging)?.a.some((a) => a > 0)).toBe(
      true,
    );
    expect(renderEventOverlay('real_clash', ['white'], 24, 1100, previewTriggerEvent(sim, 'clash', 1000))?.a.some((a) => a > 0)).toBe(true);
    expect(
      renderEventOverlay('responsive_clash', ['white'], 24, 1100, previewTriggerEvent(sim, 'clash', 1000))?.a.some(
        (a) => a > 0,
      ),
    ).toBe(true);
    expect(
      renderEventOverlay('responsive_blast', ['white'], 24, 1100, previewTriggerEvent(sim, 'blast', 1000))?.a.some(
        (a) => a > 0,
      ),
    ).toBe(true);
    expect(renderEventOverlay('swing', ['white'], 24, 1100, previewTriggerEvent(sim, 'swing', 1000))?.a.some((a) => a > 0)).toBe(true);
    expect(renderEventOverlay('sparkle', ['white'], 24, 1000, sim)?.a.some((a) => a >= 0)).toBe(true);
    expect(renderEventOverlay('melt', ['orange'], 24, 1000, sim)).toBeNull();
    expect(renderEventOverlay('lb', ['white'], 24, 1000, sim)).toBeNull();
    expect(renderEventOverlay('unknown_overlay', ['white'], 24, 1000, sim)).toBeNull();
  });

  it('renders preon and ignition through renderEventOverlay', () => {
    const off = { ...createInitialPreviewSim(), powered: false };
    let sim = previewPowerOn(off, 1000, { extendMs: 300, retractMs: 800 }, true, true);
    expect(renderEventOverlay('preon_glow', ['cyan'], 24, 1100, sim)?.a.some((a) => a > 0)).toBe(
      true,
    );
    sim = advancePreviewSim(sim, 1800);
    expect(
      renderEventOverlay('ignition_flash', ['white'], 24, sim.transitionStartedAt + 50, sim)?.a.some(
        (a) => a > 0,
      ),
    ).toBe(true);
  });

  it('renders preon and postoff wipe/sputter variants', () => {
    expect(renderPreonWipe(['cyan'], 24, 0.5).a.some((a) => a > 0)).toBe(true);
    expect(renderPreonSputter(['cyan'], 24, 0.5).a.some((a) => a > 0)).toBe(true);
    expect(renderPostoffWipe(['cyan'], 24, 0.5).a.some((a) => a > 0)).toBe(true);
    expect(renderPostoffSputter(['cyan'], 24, 0.5).a.some((a) => a > 0)).toBe(true);
  });
});
