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
    padding: 0.55rem 0.65rem;
    border-radius: var(--wa-border-radius-medium, 6px);
    text-decoration: none;
    color: inherit;
    border: 1px solid transparent;
    transition: background 0.15s ease;
  }

  .nav-link:hover {
    background: var(--wa-color-neutral-90, #e4e4e7);
  }

  .nav-link[aria-current='page'] {
    background: var(--wa-color-brand-95, #e0f2fe);
    border-color: var(--wa-color-brand-80, #7dd3fc);
    font-weight: 600;
  }

  .nav-label {
    font-size: 0.925rem;
    line-height: 1.25;
  }

  .nav-path {
    font-family: ui-monospace, monospace;
    font-size: 0.72rem;
    opacity: 0.7;
    line-height: 1.2;
    word-break: break-all;
  }

  .nav-stub-soon {
    font-weight: normal;
    font-size: 0.75rem;
    opacity: 0.65;
  }
`;
