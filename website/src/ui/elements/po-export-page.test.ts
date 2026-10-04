/**
 * Export page — live INI previews for all config files.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BLADES_INI, BOARD_INI } from '../../platform/saber-paths.js';
import type { SaberStorage } from '../../platform/storage.js';
import { setSaberStorage } from '../../platform/storage.js';
import {
  getAllByTestIdPrefix,
  getByTestId,
  mount,
  queryByTestId,
} from '../../test/lit-host-utils.js';
import { BrowserSaberStorage } from '../../platform/browser-storage.js';
import './po-copy-panel.js';
import './po-export-page.js';

class MockDesktopSaberStorage implements SaberStorage {
  readonly isDesktop = true;

  constructor(
    private root: string | null,
    readonly files: Record<string, string>,
  ) {}

  async getRoot(): Promise<string | null> {
    return this.root;
  }

  async setRoot(path: string): Promise<void> {
    this.root = path;
  }

  async pickFolder(): Promise<string | null> {
    return this.root;
  }

  async readText(relativePath: string): Promise<string> {
    const content = this.files[relativePath];
    if (content == null) {
      throw new Error(`ENOENT ${relativePath}`);
    }
    return content;
  }

  async writeText(relativePath: string, content: string): Promise<void> {
    this.files[relativePath] = content;
  }
}

describe('po-export-page', () => {
  it('renders summary, file selector, and one active copy panel', async () => {
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    expect(getByTestId(el, 'export-page-summary')).toBeTruthy();
    expect(getByTestId(el, 'export-file-selector')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'export-tab-').length).toBe(5);
    expect(getAllByTestIdPrefix(el, 'export-panel-').length).toBe(1);
    expect(queryByTestId(el, 'export-import-saber')).toBeNull();
    expect(queryByTestId(el, 'export-desktop-saber')).toBeNull();
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

describe('po-export-page desktop write', () => {
  beforeEach(() => {
    setSaberStorage(new MockDesktopSaberStorage('D:/saber', {}));
  });

  afterEach(() => {
    setSaberStorage(new BrowserSaberStorage());
  });

  it('shows write actions and writes all config files when root is set', async () => {
    const storage = new MockDesktopSaberStorage('D:/saber', {});
    setSaberStorage(storage);
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    await el.updateComplete;

    expect(getByTestId(el, 'export-desktop-write')).toBeTruthy();
    expect(getByTestId(el, 'export-write-all')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'export-write-').length).toBe(6);

    getByTestId(el, 'export-write-all').click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    expect(storage.files[BLADES_INI]).toBeTruthy();
    expect(storage.files[BOARD_INI]).toBeTruthy();
    const status = getByTestId(el, 'export-write-status');
    expect(status.textContent).toMatch(/Wrote 5 file\(s\)/);
    unmount();
  });

  it('prompts to choose folder when saber root is missing', async () => {
    setSaberStorage(new MockDesktopSaberStorage(null, {}));
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    await el.updateComplete;

    getByTestId(el, 'export-write-all').click();
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;

    expect(getByTestId(el, 'export-write-status').textContent).toMatch(/Import page first/i);
    unmount();
  });
});
