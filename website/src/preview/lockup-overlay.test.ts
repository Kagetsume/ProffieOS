/**
 * Lockup / melt held overlays must change the preview frame.
 */
import { describe, expect, it } from 'vitest';
import { instantiateConfigStyle, getConfigStyle } from '../model/config-styles';
import {
  createInitialPreviewSim,
  previewSetDrag,
  previewSetLb,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
} from './simulation';
import { renderStylePreview } from './frame';

describe('lockup and melt overlays', () => {
  const section = instantiateConfigStyle(getConfigStyle('smoke_blade')!, 'smoke_blade');

  it('flashes most of the blade on clash', () => {
    const idle = createInitialPreviewSim();
    const clashing = previewTriggerEvent(idle, 'clash', 1000);
    const off = renderStylePreview(section, 48, 1000, idle);
    const on = renderStylePreview(section, 48, 1000, clashing);
    let brightened = 0;
    for (let i = 0; i < 48; i += 1) {
      const before = off.pixels.r[i]! + off.pixels.g[i]! + off.pixels.b[i]!;
      const after = on.pixels.r[i]! + on.pixels.g[i]! + on.pixels.b[i]!;
      if (after > before + 40) {
        brightened += 1;
      }
    }
    expect(brightened).toBeGreaterThan(35);
  });

  it('changes pixels when lockup is held', () => {
    const idle = createInitialPreviewSim();
    const locked = previewSetLockup(idle, true);
    expect(locked.lockupActive).toBe(true);

    const off = renderStylePreview(section, 48, 1000, idle);
    const on = renderStylePreview(section, 48, 1000, locked);
    expect(on.pixels.r.some((value, index) => value !== off.pixels.r[index])).toBe(true);
  });

  it('does not show lb sparks when only lockup is held', () => {
    const locked = previewSetLockup(createInitialPreviewSim(), true);
    const withLb = previewSetLb(createInitialPreviewSim(), true);
    const lockOnly = renderStylePreview(section, 48, 1000, locked);
    const lbOnly = renderStylePreview(section, 48, 1000, withLb);
    expect(lbOnly.pixels.a.some((value, index) => value !== lockOnly.pixels.a[index])).toBe(true);
  });

  it('localizes lockup instead of washing the whole blade', () => {
    const locked = previewSetLockup(createInitialPreviewSim(), true);
    const frame = renderStylePreview(section, 48, 1000, locked);
    const count = frame.pixels.r.length;
    const idle = renderStylePreview(section, 48, 1000, createInitialPreviewSim());
    let changed = 0;
    let unchanged = 0;
    for (let i = 0; i < count; i += 1) {
      if (frame.pixels.r[i] !== idle.pixels.r[i]) {
        changed += 1;
      } else {
        unchanged += 1;
      }
    }
    expect(changed).toBeGreaterThan(0);
    expect(unchanged).toBeGreaterThan(changed);
  });

  it('lights drag mostly at the tip, not the hilt', () => {
    const dragging = previewSetDrag(createInitialPreviewSim(), true);
    const frame = renderStylePreview(section, 48, 1000, dragging);
    const count = frame.pixels.r.length;
    const hilt = Math.floor(count * 0.2);
    const tip = Math.floor(count * 0.92);
    const hiltBrightness = frame.pixels.r[hilt]! + frame.pixels.g[hilt]! + frame.pixels.b[hilt]!;
    const tipBrightness = frame.pixels.r[tip]! + frame.pixels.g[tip]! + frame.pixels.b[tip]!;
    expect(tipBrightness).toBeGreaterThan(hiltBrightness);
  });

  it('does not show drag when only lockup is held', () => {
    const idle = createInitialPreviewSim();
    const locked = previewSetLockup(idle, true);
    const dragged = previewSetDrag(idle, true);
    const tipBias = (frame: ReturnType<typeof renderStylePreview>) => {
      const count = frame.pixels.r.length;
      const hilt = Math.floor(count * 0.2);
      const tip = Math.floor(count * 0.92);
      const hiltSum = frame.pixels.r[hilt]! + frame.pixels.g[hilt]! + frame.pixels.b[hilt]!;
      const tipSum = frame.pixels.r[tip]! + frame.pixels.g[tip]! + frame.pixels.b[tip]!;
      return tipSum / Math.max(1, hiltSum);
    };
    expect(tipBias(renderStylePreview(section, 48, 1000, dragged))).toBeGreaterThan(
      tipBias(renderStylePreview(section, 48, 1000, locked)),
    );
  });

  it('changes pixels when melt is held', () => {
    const idle = createInitialPreviewSim();
    const melted = previewSetMelt(idle, true);
    expect(melted.meltActive).toBe(true);

    const off = renderStylePreview(section, 48, 1000, idle);
    const on = renderStylePreview(section, 48, 1000, melted);
    expect(on.pixels.r.some((value, index) => value !== off.pixels.r[index])).toBe(true);
  });
});
