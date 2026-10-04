/**
 * Sidebar navigation — route links and active hash highlight.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { registerRoute } from '../../router.js';
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from '../sidebar-preference.js';
import { getAllByTestIdPrefix, getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-sidebar-nav.js';

describe('po-sidebar-nav', () => {
  afterEach(() => {
    localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
    document.documentElement.classList.remove('sidebar-collapsed');
  });

  it('renders route links including Import before Export in Output', async () => {
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(getByTestId(el, 'sidebar-nav')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'sidebar-nav-link-').length).toBeGreaterThan(0);
    expect(getByTestId(el, 'sidebar-nav-link-import')).toBeTruthy();
    expect(getByTestId(el, 'sidebar-nav-link-export')).toBeTruthy();
    unmount();
  });

  it('highlights the active hash route', async () => {
    registerRoute({ id: 'styles', label: 'Blade styles', mount: () => () => {} });
    window.location.hash = '#/styles';
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(getByTestId(el, 'sidebar-nav-link-styles').getAttribute('aria-current')).toBe('page');
    unmount();
  });

  it('toggles collapsed mode, persists preference, and hides labels', async () => {
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(el.collapsed).toBe(false);
    expect(el.hasAttribute('collapsed')).toBe(false);

    getByTestId(el, 'sidebar-nav-toggle').click();
    await el.updateComplete;

    expect(el.collapsed).toBe(true);
    expect(el.hasAttribute('collapsed')).toBe(true);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
    expect(document.documentElement.classList.contains('sidebar-collapsed')).toBe(true);

    const stylesLink = getByTestId(el, 'sidebar-nav-link-styles');
    expect(stylesLink.getAttribute('aria-label')).toBeTruthy();
    expect(
      stylesLink.querySelector('.nav-hover-tooltip')?.textContent?.trim().length,
    ).toBeGreaterThan(0);

    getByTestId(el, 'sidebar-nav-toggle').click();
    await el.updateComplete;
    expect(el.collapsed).toBe(false);
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');

    unmount();
  });

  it('restores collapsed state from localStorage on connect', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true');
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(el.collapsed).toBe(true);
    expect(getByTestId(el, 'sidebar-nav-toggle').getAttribute('aria-expanded')).toBe('false');
    unmount();
  });

  it('exposes accessible expand/collapse labels on the toggle', async () => {
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    const toggle = getByTestId(el, 'sidebar-nav-toggle');
    expect(toggle.getAttribute('aria-label')).toMatch(/collapse/i);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    await el.updateComplete;
    expect(toggle.getAttribute('aria-label')).toMatch(/expand/i);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    unmount();
  });
});
