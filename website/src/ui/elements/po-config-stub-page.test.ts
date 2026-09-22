/**
 * Config stub page — placeholder for unimplemented routes.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-config-stub-page.js';

describe('po-config-stub-page', () => {
  it('shows title and SD path', async () => {
    const el = document.createElement('po-config-stub-page');
    el.setAttribute('title', 'Test section');
    el.setAttribute('sd-path', 'config/test.ini');
    el.description = 'Stub description';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'config-stub-page-title').textContent).toBe('Test section');
    expect(getByTestId(el, 'config-stub-page-sd-path').textContent).toBe('config/test.ini');
    unmount();
  });
});
