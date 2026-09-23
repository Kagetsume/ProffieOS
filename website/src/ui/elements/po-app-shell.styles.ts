/**
 * Lit styles for the compact application bar (shadow DOM).
 *
 * @module ui/elements/po-app-shell.styles
 */
import { css } from 'lit';

export const poAppShellStyles = css`
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

  .app-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.2;
  }

  .app-bar-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-inline-start: auto;
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
