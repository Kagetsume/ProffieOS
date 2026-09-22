/**
 * Copy panel — read-only INI preview, clipboard copy, download.
 */
import { describe, expect, it, vi } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-copy-panel.js';

describe('po-copy-panel', () => {
  it('renders content and copy button', async () => {
    const el = document.createElement('po-copy-panel') as HTMLElement & {
      title: string;
      filename: string;
      content: string;
    };
    el.title = 'blades.ini';
    el.filename = 'blades.ini';
    el.content = 'pixels = 144\n';
    const { unmount } = await mount(el);
    expect((getByTestId(el, 'copy-panel-content') as HTMLTextAreaElement).value).toContain('pixels');
    expect(getByTestId(el, 'copy-panel-copy-button')).toBeTruthy();
    unmount();
  });

  it('copies content to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);

    const el = document.createElement('po-copy-panel') as HTMLElement & {
      title: string;
      filename: string;
      content: string;
    };
    el.title = 'test.ini';
    el.filename = 'test.ini';
    el.content = 'hello=world\n';
    const { unmount } = await mount(el);

    getByTestId(el, 'copy-panel-copy-button').click();
    await el.updateComplete;

    expect(writeText).toHaveBeenCalledWith('hello=world\n');
    unmount();
    vi.restoreAllMocks();
  });
});
