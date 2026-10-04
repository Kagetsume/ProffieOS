/**
 * Lit styles for the compact application bar (shadow DOM).
 *
 * @module ui/elements/lb-app-shell.styles
 */
import { css } from 'lit';

export const lbAppShellStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  .app-bar-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem 1rem;
    flex-wrap: wrap;
    min-height: 2.75rem;
  }

  .app-brand {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
  }

  .app-logo {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.4rem;
    object-fit: cover;
    flex-shrink: 0;
  }

  .app-brand-text {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }

  .app-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .app-tagline {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1.2;
    opacity: 0.72;
    letter-spacing: 0.01em;
  }

  .app-bar-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-inline-start: auto;
  }

  .locale-select {
    min-width: 6.5rem;
    max-width: 9rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .locale-select::part(combobox) {
    min-height: 1.75rem;
  }

  .theme-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8125rem;
    font-weight: 600;
    opacity: 0.85;
  }
`;
