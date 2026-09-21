import { describe, expect, it, beforeEach } from 'vitest';
import { getConfigStyle, instantiateConfigStyle } from '../model/config-styles';
import {
  $previewSim,
  previewBladeAngleChanged,
  previewDragChanged,
  previewEventTriggered,
  previewLbChanged,
  previewLockupChanged,
  previewMeltChanged,
  previewPowerOffClicked,
  previewPowerOnClicked,
  previewSimTick,
  syncPreviewClock,
} from './previewEvents';

describe('previewEvents store', () => {
  const section = instantiateConfigStyle(getConfigStyle('smoke_blade')!, 'smoke_blade');

  beforeEach(() => {
    previewPowerOnClicked(section);
    previewSimTick(performance.now() + 5000);
  });

  it('completes extend transition on tick', () => {
    expect($previewSim.getState().powered).toBe(true);
    expect($previewSim.getState().transition).toBe('none');
  });

  it('starts retracting on power off', () => {
    previewPowerOffClicked(section);
    expect($previewSim.getState().transition).toBe('retracting');
  });

  it('updates combat and angle flags while idle and powered', () => {
    previewLockupChanged(true);
    expect($previewSim.getState().lockupActive).toBe(true);
    previewDragChanged(true);
    previewMeltChanged(true);
    previewLbChanged(true);
    previewBladeAngleChanged(0.75);
    expect($previewSim.getState().bladeAngleNorm).toBe(0.75);
  });

  it('triggers preview events when section is present', () => {
    previewEventTriggered({ event: 'clash', section });
    expect($previewSim.getState().clashUntil).toBeGreaterThan(0);
    previewEventTriggered({ event: 'clash', section: null });
  });

  it('syncPreviewClock dispatches tick without throwing', () => {
    syncPreviewClock(performance.now() + 100);
    expect($previewSim.getState().powered).toBe(true);
  });
});
