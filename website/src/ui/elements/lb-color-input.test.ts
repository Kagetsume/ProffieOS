/**
 * Color input — firmware named colors with swatch and custom entry.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-color-input.js';

describe('lb-color-input', () => {
  it('renders grouped color options', async () => {
    const el = document.createElement('lb-color-input') as HTMLElement & { value: string };
    el.value = 'red';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'color-input-select')).toBeTruthy();
    expect(el.querySelectorAll('wa-option').length).toBeGreaterThan(0);
    unmount();
  });
});
