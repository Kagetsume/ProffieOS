/**
 * Lit styles for the sidebar navigation component (shadow DOM).
 *
 * @module ui/elements/lb-sidebar-nav.styles
 */
import { css } from 'lit';

/** Sidebar nav groups, links, active state, and SD path labels. */
export const lbSidebarNavStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
    position: relative;
  }

  .sidebar-shell {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .sidebar-toggle {
    position: sticky;
    top: 0;
    flex-shrink: 0;
    align-self: stretch;
    width: 100%;
    z-index: 2;
  }

  .sidebar-toggle::part(button) {
    width: 100%;
    box-sizing: border-box;
    justify-content: flex-start;
    border: 1px solid transparent;
    border-left: 3px solid transparent;
    border-radius: var(--wa-border-radius-medium, 6px);
    padding: 0.55rem 0.65rem 0.55rem 0.55rem;
  }

  .sidebar-toggle wa-icon {
    font-size: 0.95rem;
    opacity: 0.75;
  }

  :host([collapsed]) .sidebar-toggle::part(button) {
    justify-content: center;
    border-left-width: 0;
    padding: 0.55rem 0.35rem;
  }

  nav {
    width: 100%;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  :host([collapsed]) nav {
    gap: 0.75rem;
  }

  .nav-group-title {
    margin: 0 0 0.35rem;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.65;
  }

  :host([collapsed]) .nav-group-title {
    display: none;
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
    position: relative;
  }

  :host([collapsed]) .nav-link {
    padding: 0.55rem 0.35rem;
    align-items: center;
    border-left-width: 0;
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

  :host([collapsed]) .nav-link[aria-current='page'] {
    border-left-width: 0;
    box-shadow: inset 0 0 0 2px var(--wa-color-brand-50, #0ea5e9);
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

  :host([collapsed]) .nav-link-row {
    justify-content: center;
    gap: 0;
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

  :host([collapsed]) .nav-label,
  :host([collapsed]) .nav-stub-badge,
  :host([collapsed]) .nav-path {
    display: none;
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

  .nav-hover-tooltip {
    position: absolute;
    left: calc(100% + 0.45rem);
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    pointer-events: none;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    padding: 0.35rem 0.55rem;
    border-radius: var(--wa-border-radius-medium, 6px);
    background: var(--wa-color-neutral-15, #27272a);
    color: var(--wa-color-neutral-95, #f4f4f5);
    border: 1px solid var(--wa-color-neutral-30, #52525b);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.12s ease 0s,
      visibility 0s linear 0.12s;
  }

  :host-context(html.wa-dark) .nav-hover-tooltip {
    background: var(--wa-color-neutral-95, #f4f4f5);
    color: var(--wa-color-neutral-15, #27272a);
    border-color: var(--wa-color-neutral-80, #d4d4d8);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
  }

  :host([collapsed]) .nav-link:hover .nav-hover-tooltip,
  :host([collapsed]) .nav-link:focus-visible .nav-hover-tooltip {
    opacity: 1;
    visibility: visible;
    transition:
      opacity 0.12s ease 0.6s,
      visibility 0s linear 0.6s;
  }
`;
