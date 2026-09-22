/**
 * Style layer stack — ordered layer list with expand, reorder, remove.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-color-input.js';
import './po-style-layer-stack.js';

describe('po-style-layer-stack', () => {
  it('renders layer controls', async () => {
    const { el, unmount } = await mount(document.createElement('po-style-layer-stack'));
    expect(getByTestId(el, 'style-layer-stack')).toBeTruthy();
    unmount();
  });
});
