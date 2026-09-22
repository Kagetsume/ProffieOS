/**
 * Sidebar navigation — route links and active hash highlight.
 */
import { describe, expect, it } from 'vitest';
import { registerRoute } from '../../router.js';
import { getAllByTestIdPrefix, getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-sidebar-nav.js';

describe('po-sidebar-nav', () => {
  it('renders route links', async () => {
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(getByTestId(el, 'sidebar-nav')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'sidebar-nav-link-').length).toBeGreaterThan(0);
    unmount();
  });

  it('highlights the active hash route', async () => {
    registerRoute({ id: 'styles', label: 'Blade styles', mount: () => () => {} });
    window.location.hash = '#/styles';
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(getByTestId(el, 'sidebar-nav-link-styles').getAttribute('aria-current')).toBe('page');
    unmount();
  });
});
