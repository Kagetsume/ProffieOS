/**
 * Lit styles for the export page (shadow DOM).
 *
 * @module ui/elements/po-export-page.styles
 */
import { css } from 'lit';

export const poExportPageStyles = css`
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
`;
