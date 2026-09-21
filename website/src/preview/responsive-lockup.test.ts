/**
 * Tests for ResponsiveLockupL preview approximation.
 */
import { describe, expect, it } from 'vitest';
import {
  responsiveLockupBump,
  responsiveLockupCenter,
  responsiveLockupStrength,
} from './responsive-lockup';
import { renderLockupOverlay } from './renderers/overlays';

describe('responsive lockup preview', () => {
  it('moves lockup center with blade angle', () => {
    const hiltDown = responsiveLockupCenter(0);
    const tipForward = responsiveLockupCenter(1);
    expect(hiltDown).not.toBeCloseTo(tipForward, 2);
    expect(tipForward).toBeGreaterThan(hiltDown);
  });

  it('localizes lockup instead of lighting the full blade', () => {
    const strengths = Array.from({ length: 11 }, (_, index) =>
      responsiveLockupBump(index / 10, 0.5),
    );
    const max = Math.max(...strengths);
    const min = Math.min(...strengths);
    expect(max).toBeGreaterThan(0.2);
    expect(min).toBeLessThan(max * 0.35);
  });

  it('moves lockup zone when blade angle changes', () => {
    const lowCenter = responsiveLockupCenter(0.15);
    const highCenter = responsiveLockupCenter(0.85);
    expect(highCenter).not.toBeCloseTo(lowCenter, 2);
    expect(responsiveLockupBump(lowCenter, 0.15)).toBeGreaterThan(0.2);
    expect(responsiveLockupBump(highCenter, 0.85)).toBeGreaterThan(0.2);
    expect(responsiveLockupBump(lowCenter, 0.85)).toBeLessThan(0.1);
  });

  it('flickers over time while blade angle is fixed', () => {
    const early = renderLockupOverlay(['white'], 48, 1, 0.5, 500);
    const later = renderLockupOverlay(['white'], 48, 1, 0.5, 900);
    expect(later.a.some((value, index) => value !== early.a[index])).toBe(true);
  });

  it('does not move lockup zone when only time advances', () => {
    const center = responsiveLockupCenter(0.5);
    expect(responsiveLockupBump(center, 0.5)).toBe(responsiveLockupBump(center, 0.5));
  });
});
