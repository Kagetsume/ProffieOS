/**
 * Export page — live INI previews for all config files.
 */
import { describe, expect, it } from 'vitest';
import { getAllByTestIdPrefix, getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-copy-panel.js';
import './po-export-page.js';

describe('po-export-page', () => {
  it('renders summary, file selector, and one active copy panel', async () => {
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    expect(getByTestId(el, 'export-page-summary')).toBeTruthy();
    expect(getByTestId(el, 'export-file-selector')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'export-tab-').length).toBe(5);
    expect(getAllByTestIdPrefix(el, 'export-panel-').length).toBe(1);
    unmount();
  });

  it('switches the visible copy panel when a file tab is clicked', async () => {
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    getByTestId(el, 'export-tab-board').click();
    await el.updateComplete;
    expect(getByTestId(el, 'export-panel-board')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'export-panel-').length).toBe(1);
    unmount();
  });
});
