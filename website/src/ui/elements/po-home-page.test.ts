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
    expect(getByTestId(el, 'home-page-config-table').querySelectorAll('tbody tr').length).toBe(5);
    unmount();
  });
});
