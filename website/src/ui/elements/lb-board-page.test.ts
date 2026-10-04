/**
 * Board config page — button count and hardware toggles.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './lb-board-page.js';

describe('lb-board-page', () => {
  it('renders board form', async () => {
    const { el, unmount } = await mount(document.createElement('lb-board-page'));
    expect(getByTestId(el, 'board-page-button-count')).toBeTruthy();
    unmount();
  });
});
