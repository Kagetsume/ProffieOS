/**
 * Styles page — recipe toolbar, layer stack, and blade preview.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-styles-page.js';

describe('lb-styles-page', () => {
  it('renders layer stack and preview', async () => {
    const { el, unmount } = await mount(document.createElement('lb-styles-page'));
    expect(getByTestId(el, 'styles-page-layer-stack')).toBeTruthy();
    expect(getByTestId(el, 'styles-page-blade-preview')).toBeTruthy();
    unmount();
  });
});
