/**
 * Board config page — button count and hardware toggles.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-board-page.js';

describe('po-board-page', () => {
  it('renders board form', async () => {
    const { el, unmount } = await mount(document.createElement('po-board-page'));
    expect(getByTestId(el, 'board-page-button-count')).toBeTruthy();
    unmount();
  });
});
