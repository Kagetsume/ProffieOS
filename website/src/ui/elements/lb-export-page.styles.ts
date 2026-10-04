/**
 * Lit styles for the export page (shadow DOM).
 *
 * @module ui/elements/lb-export-page.styles
 */
import { css } from 'lit';

export const lbExportPageStyles = css`
  .export-summary {
    margin-bottom: 1rem;
  }

  .export-summary p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .export-file-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 1rem;
  }

  .export-file-selector wa-button {
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
  }

  .export-panels {
    display: block;
  }

  .export-saber-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.5rem;
  }
`;
