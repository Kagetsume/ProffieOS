/**
 * Pin picker — preset catalog dropdown with optional custom pin entry.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-pin-picker.js';

describe('po-pin-picker', () => {
  it('renders preset options in power mode', async () => {
    const el = document.createElement('po-pin-picker') as HTMLElement & {
      mode: string;
      value: string;
    };
    el.mode = 'power';
    el.value = 'bladePowerPin1';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'pin-picker-select')).toBeTruthy();
    expect(el.querySelectorAll('wa-option').length).toBeGreaterThan(0);
    unmount();
  });

  it('emits pin-change when a preset is selected', async () => {
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
