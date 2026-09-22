/**
 * Presets page — preset list and per-blade style line editors.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-presets-page.js';

describe('po-presets-page', () => {
  it('renders preset selector', async () => {
    const { el, unmount } = await mount(document.createElement('po-presets-page'));
    expect(getByTestId(el, 'presets-page-preset-select')).toBeTruthy();
    unmount();
  });
});
