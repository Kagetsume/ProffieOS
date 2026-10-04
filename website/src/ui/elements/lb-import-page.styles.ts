/**
 * Lit styles for the import page (shadow DOM).
 *
 * @module ui/elements/lb-import-page.styles
 */
import { css } from 'lit';

export const lbImportPageStyles = css`
  .import-browser-notice {
    margin-bottom: 1rem;
  }

  .import-browser-notice p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .import-saber-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }

  .import-saber-root {
    margin: 0.35rem 0 0;
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    word-break: break-all;
  }

  .import-saber-status {
    margin: 0.75rem 0 0;
    font-size: 0.875rem;
    line-height: 1.45;
    white-space: pre-wrap;
  }
`;
