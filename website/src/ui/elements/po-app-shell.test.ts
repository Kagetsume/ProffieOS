/**
 * Application bar — title, export link, and theme toggle.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-app-shell.js';

describe('po-app-shell', () => {
  it('renders title, export link, and theme toggle', async () => {
    const { el, unmount } = await mount(document.createElement('po-app-shell'));
    expect(getByTestId(el, 'app-shell-title').textContent?.length).toBeGreaterThan(0);
    expect(getByTestId(el, 'app-shell-export-link').getAttribute('href')).toBe('#/export');
    expect(getByTestId(el, 'app-shell-theme-toggle')).toBeTruthy();
    unmount();
  });

  it('applies dark mode and updates the toggle label', async () => {
    localStorage.removeItem('po-theme');
    document.documentElement.classList.remove('wa-dark');
    const { el, unmount } = await mount(document.createElement('po-app-shell'));
    const toggle = getByTestId(el, 'app-shell-theme-toggle') as HTMLElement & { checked?: boolean };
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change'));
    await el.updateComplete;
    expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    expect(localStorage.getItem('po-theme')).toBe('dark');
    expect(el.shadowRoot?.querySelector('.theme-toggle span')?.textContent).toBe('Dark mode');
    localStorage.removeItem('po-theme');
    document.documentElement.classList.remove('wa-dark');
    unmount();
  });
});
