/**
 * Features config page — gesture and twist toggles.
 */
import { describe, expect, it } from 'vitest';
import { $boardFeatures } from '../../stores/boardFeatures';
import { getAllByTestId, getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-features-page.js';

describe('po-features-page', () => {
  it('renders feature toggles', async () => {
    const { el, unmount } = await mount(document.createElement('po-features-page'));
    expect(getAllByTestId(el, 'features-switch-gesture').length).toBe(1);
    expect(getByTestId(el, 'features-switch-twistOn')).toBeTruthy();
    expect(getByTestId(el, 'features-switch-twistOff')).toBeTruthy();
    unmount();
  });

  it('toggles gesture in the board features store', async () => {
    const { el, unmount } = await mount(document.createElement('po-features-page'));
    const gestureSwitch = getByTestId(el, 'features-switch-gesture') as HTMLElement & {
      checked: boolean;
    };
    const before = $boardFeatures.getState().gesture;
    gestureSwitch.checked = !before;
    gestureSwitch.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect($boardFeatures.getState().gesture).toBe(!before);
    unmount();
  });
});
