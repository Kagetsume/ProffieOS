/**
 * Styles page — recipe toolbar, layer stack, and blade preview.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-styles-page.js';

describe('po-styles-page', () => {
  it('renders layer stack and preview', async () => {
    const { el, unmount } = await mount(document.createElement('po-styles-page'));
    expect(getByTestId(el, 'styles-page-layer-stack')).toBeTruthy();
    expect(getByTestId(el, 'styles-page-blade-preview')).toBeTruthy();
    unmount();
  });
});
