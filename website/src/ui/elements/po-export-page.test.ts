/**
 * Export page — live INI previews for all config files.
 */
import { describe, expect, it } from 'vitest';
import { getAllByTestIdPrefix, mount } from '../../test/lit-host-utils.js';
import './po-copy-panel.js';
import './po-export-page.js';

describe('po-export-page', () => {
  it('renders copy panels for each INI file', async () => {
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    expect(getAllByTestIdPrefix(el, 'export-panel-').length).toBe(5);
    unmount();
  });
});
