/**
 * Blade preview — vertical canvas, hilt graphic, preview simulation controls.
 */
import { describe, expect, it } from 'vitest';
import { $previewSim } from '../../stores/previewEvents';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-blade-preview.js';

describe('po-blade-preview', () => {
  it('renders canvas and preview controls', async () => {
    const { el, unmount } = await mount(document.createElement('po-blade-preview'));
    expect(getByTestId(el, 'blade-preview-canvas')).toBeTruthy();
    expect(getByTestId(el, 'blade-preview-clash')).toBeTruthy();
    unmount();
  });

  it('clash button triggers preview clash event', async () => {
    const { el, unmount } = await mount(document.createElement('po-blade-preview'));
    const before = $previewSim.getState().clashUntil;
    getByTestId(el, 'blade-preview-clash').click();
    await el.updateComplete;
    expect($previewSim.getState().clashUntil).toBeGreaterThan(before);
    unmount();
  });

  it('disables force when the active section has no force_glow layer', async () => {
    const { el, unmount } = await mount(document.createElement('po-blade-preview'));
    const forceBtn = getByTestId(el, 'blade-preview-force') as HTMLButtonElement;
    expect(forceBtn.disabled).toBe(true);
    unmount();
  });
});
