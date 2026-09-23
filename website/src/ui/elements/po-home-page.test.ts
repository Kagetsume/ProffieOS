/**
 * Home / overview page — config file table and workflow links.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-home-page.js';

describe('po-home-page', () => {
  it('renders overview content', async () => {
    const { el, unmount } = await mount(document.createElement('po-home-page'));
    expect(getByTestId(el, 'home-page-title').textContent?.length).toBeGreaterThan(0);
    const rows = getByTestId(el, 'home-page-config-table').querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
    expect(rows[0]?.textContent?.trim().length).toBeGreaterThan(0);
    expect(getByTestId(el, 'home-page-hub-grid')).toBeTruthy();
    unmount();
  });

  it('links config file rows to editor routes', async () => {
    const { el, unmount } = await mount(document.createElement('po-home-page'));
    expect(getByTestId(el, 'home-page-file-link-board').getAttribute('href')).toBe('#/board');
    expect(getByTestId(el, 'home-page-file-link-blades').getAttribute('href')).toBe('#/blades');
    expect(getByTestId(el, 'home-page-file-link-bladeStyles').getAttribute('href')).toBe('#/styles');
    unmount();
  });
});
