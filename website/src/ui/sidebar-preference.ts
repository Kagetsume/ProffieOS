/**
 * Sidebar collapsed preference — persists in localStorage and applies layout on `<html>`.
 *
 * @module ui/sidebar-preference
 */

/** `localStorage` key for icon-only sidebar mode. */
export const SIDEBAR_COLLAPSED_STORAGE_KEY = 'layerblade.sidebarCollapsed';

/** Reads whether the sidebar should start collapsed. */
export function getStoredSidebarCollapsed(): boolean {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
}

/** Toggles the document-level layout class used by `app.css`. */
export function applySidebarCollapsed(collapsed: boolean): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
}

/** Persists and applies collapsed sidebar layout. */
export function setSidebarCollapsed(collapsed: boolean): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? 'true' : 'false');
  }
  applySidebarCollapsed(collapsed);
}
