/**
 * Lit styles for the sidebar navigation component (shadow DOM).
 *
 * @module ui/elements/po-sidebar-nav.styles
 */
import { css } from 'lit';

/** Sidebar nav groups, links, active state, and SD path labels. */
export const poSidebarNavStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  nav {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .nav-group-title {
    margin: 0 0 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.65;
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .nav-link {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.55rem 0.65rem 0.55rem 0.55rem;
    border-radius: var(--wa-border-radius-medium, 6px);
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
    border-left: 3px solid transparent;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .nav-link:hover {
    background: var(--wa-color-neutral-90, #e4e4e7);
  }

  :host-context(html.wa-dark) .nav-link:hover {
    background: var(--wa-color-neutral-25, #3f3f46);
  }

  .nav-link[aria-current='page'] {
    background: var(--wa-color-brand-95, #e0f2fe);
    border-left-color: var(--wa-color-brand-50, #0ea5e9);
    font-weight: 600;
  }

  :host-context(html.wa-dark) .nav-link[aria-current='page'] {
    background: var(--wa-color-neutral-20, #303036);
    border-left-color: var(--wa-color-brand-50, #0ea5e9);
  }

  .nav-link-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .nav-icon {
    flex-shrink: 0;
    font-size: 0.95rem;
    opacity: 0.75;
  }

  .nav-link[aria-current='page'] .nav-icon {
    opacity: 1;
    color: var(--wa-color-brand-50, #0ea5e9);
  }

  .nav-label {
    font-size: 0.925rem;
    line-height: 1.25;
    flex: 1;
    min-width: 0;
  }

  .nav-stub-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.1rem 0.35rem;
    border-radius: var(--wa-border-radius-pill, 999px);
    background: var(--wa-color-neutral-88, #e4e4e7);
    color: var(--wa-color-neutral-40, #71717a);
    line-height: 1.2;
  }

  :host-context(html.wa-dark) .nav-stub-badge {
    background: var(--wa-color-neutral-25, #3f3f46);
    color: var(--wa-color-neutral-70, #a1a1aa);
  }

  .nav-path {
    font-family: ui-monospace, monospace;
    font-size: 0.72rem;
    opacity: 0.7;
    line-height: 1.2;
    word-break: break-all;
    padding-left: 1.45rem;
  }

  .nav-link--stub {
    opacity: 0.85;
  }
`;
