/**
 * Presets page — preset list and per-blade style line editors.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-presets-page.js';

describe('lb-presets-page', () => {
  it('renders preset selector', async () => {
    const { el, unmount } = await mount(document.createElement('lb-presets-page'));
    expect(getByTestId(el, 'presets-page-preset-select')).toBeTruthy();
    unmount();
  });
});
