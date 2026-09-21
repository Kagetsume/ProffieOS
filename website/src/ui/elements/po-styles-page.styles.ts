/**
 * Lit styles for the blade styles editor page (shadow DOM).
 *
 * @module ui/elements/po-styles-page.styles
 */
import { css } from 'lit';

/** Two-pane layout, section toolbar, base vars grid, and recipe summary. */
export const poStylesPageStyles = css`
  .styles-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 1fr);
    gap: 1.5rem;
    align-items: start;
    width: 100%;
  }

  @media (max-width: 640px) {
    .styles-layout {
      grid-template-columns: 1fr;
    }
  }

  .editor-pane,
  .preview-pane {
    min-width: 0;
  }

  .editor-pane wa-card {
    overflow: visible;
  }

  .preview-pane {
    position: sticky;
    top: 1rem;
  }

  .preview-pane wa-card {
    display: block;
    min-height: 22rem;
  }

  wa-card {
    display: block;
    width: 100%;
  }

  .section-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
    margin-bottom: 1rem;
  }

  .section-toolbar label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: min(100%, 14rem);
    flex: 1;
  }

  .section-toolbar wa-select,
  .section-toolbar wa-input {
    width: 100%;
    min-width: 0;
    font-weight: normal;
    box-sizing: border-box;
  }

  .layer-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .vars-heading {
    margin: 1rem 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .vars-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.65rem;
    margin-bottom: 0.75rem;
    width: 100%;
  }

  @media (min-width: 520px) {
    .vars-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 880px) {
    .vars-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .var-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .var-label {
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .var-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }

  .var-controls po-color-input,
  .var-controls wa-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
  }

  .var-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2.375rem;
    height: 2.375rem;
    padding: 0;
    border: 1px solid var(--wa-color-neutral-80, #c4c4c8);
    border-radius: var(--wa-border-radius-medium, 6px);
    background: var(--wa-color-neutral-98, #fafafa);
    color: var(--wa-color-neutral-35, #52525b);
    cursor: pointer;
    line-height: 1;
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease;
  }

  .var-remove:hover {
    background: var(--wa-color-danger-95, #fef2f2);
    border-color: var(--wa-color-danger-70, #fca5a5);
    color: var(--wa-color-danger-50, #ef4444);
  }

  .var-remove:focus-visible {
    outline: 2px solid var(--wa-color-brand-60, #0ea5e9);
    outline-offset: 2px;
  }

  .var-remove wa-icon {
    font-size: 1.125rem;
  }

  .recipe-summary {
    margin: 0 0 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.45;
    opacity: 0.85;
  }

  .recipe-summary code {
    display: block;
    font-size: 0.78rem;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
`;
