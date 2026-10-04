/**
 * Import page — saber folder pick and config load (desktop).
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount, queryByTestId } from '../../test/lit-host-utils.js';
import './po-import-page.js';

describe('po-import-page', () => {
  it('renders title and browser notice when not on desktop storage', async () => {
    const { el, unmount } = await mount(document.createElement('po-import-page'));
    expect(getByTestId(el, 'import-page')).toBeTruthy();
    expect(getByTestId(el, 'import-browser-notice')).toBeTruthy();
    expect(queryByTestId(el, 'import-desktop-saber')).toBeNull();
    expect(queryByTestId(el, 'import-open-saber')).toBeNull();
    expect(queryByTestId(el, 'import-reload-saber')).toBeNull();
    unmount();
  });
});
