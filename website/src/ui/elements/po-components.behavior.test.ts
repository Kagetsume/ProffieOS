/**
 * Targeted component behavior tests — store wiring, events, and user actions in jsdom.
 */
import { describe, expect, it, vi } from 'vitest';
import { registerRoute } from '../../router.js';
import { $boardFeatures } from '../../stores/boardFeatures';
import { $previewSim } from '../../stores/previewEvents';
import { getByTestId, mount } from '../../test/lit-host-utils.js';

describe('po-* component behavior', () => {
  it('po-sidebar-nav highlights the active hash route', async () => {
    registerRoute({ id: 'styles', label: 'Blade styles', mount: () => () => {} });
    window.location.hash = '#/styles';
    await import('./po-sidebar-nav.js');
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    const stylesLink = getByTestId(el, 'sidebar-nav-link-styles');
    expect(stylesLink.getAttribute('aria-current')).toBe('page');
    unmount();
  });

  it('po-features-page toggles gesture in the board features store', async () => {
    await import('./po-features-page.js');
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

  it('po-copy-panel copies content to the clipboard', async () => {
    await import('./po-copy-panel.js');
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

    const el = document.createElement('po-copy-panel') as HTMLElement & {
      title: string;
      filename: string;
      content: string;
    };
    el.title = 'test.ini';
    el.filename = 'test.ini';
    el.content = 'hello=world\n';
    const { unmount } = await mount(el);

    getByTestId(el, 'copy-panel-copy-button').click();
    await el.updateComplete;

    expect(writeText).toHaveBeenCalledWith('hello=world\n');
    unmount();
    vi.restoreAllMocks();
  });

  it('po-blade-preview clash button triggers preview clash event', async () => {
    await import('./po-blade-preview.js');
    const { el, unmount } = await mount(document.createElement('po-blade-preview'));
    const before = $previewSim.getState().clashUntil;
    getByTestId(el, 'blade-preview-clash').click();
    await el.updateComplete;
    expect($previewSim.getState().clashUntil).toBeGreaterThan(before);
    unmount();
  });

  it('po-pin-picker emits pin-change when a preset is selected', async () => {
    await import('./po-pin-picker.js');
    const el = document.createElement('po-pin-picker') as HTMLElement & {
      mode: string;
      value: string;
    };
    el.mode = 'power';
    el.value = '';
    const { unmount } = await mount(el);

    let changed: string | undefined;
    el.addEventListener('pin-change', (event) => {
      changed = (event as CustomEvent<{ value: string }>).detail.value;
    });

    const select = getByTestId(el, 'pin-picker-select') as HTMLElement & { value: string };
    select.value = 'bladePowerPin2';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;

    expect(changed).toBe('bladePowerPin2');
    unmount();
  });
});
