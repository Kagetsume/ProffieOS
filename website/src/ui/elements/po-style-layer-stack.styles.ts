/**
 * Lit styles for the style layer stack component (shadow DOM).
 *
 * @module ui/elements/po-style-layer-stack.styles
 */
import { css } from 'lit';

/** Expandable layer list, reorder/remove controls, and layer editor form. */
export const poStyleLayerStackStyles = css`
  .layer-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0 0 1rem;
  }

  .layer-item {
    border: 1px solid var(--wa-color-neutral-85, #d4d4d8);
    border-radius: var(--wa-border-radius-medium, 6px);
    background: var(--wa-color-neutral-98, #fafafa);
    min-width: 0;
    overflow: hidden;
  }

  .layer-item:hover {
    border-color: var(--wa-color-brand-70, #38bdf8);
  }

  .layer-item--expanded {
    border-color: var(--wa-color-brand-60, #0ea5e9);
    background: var(--wa-color-brand-98, #f0f9ff);
  }

  .layer-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.65rem;
    font-size: 0.875rem;
    cursor: pointer;
    min-width: 0;
  }

  .layer-item--expanded .layer-row {
    border-bottom: 1px solid var(--wa-color-brand-85, #bae6fd);
    background: var(--wa-color-brand-95, #e0f2fe);
  }

  .layer-order {
    font-family: ui-monospace, monospace;
    font-size: 0.75rem;
    opacity: 0.65;
    min-width: 1.25rem;
  }

  .layer-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    background: var(--wa-color-neutral-90, #e4e4e7);
    white-space: nowrap;
  }

  .layer-row-actions {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .layer-reorder,
  .layer-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid var(--wa-color-neutral-80, #c4c4c8);
    border-radius: var(--wa-border-radius-medium, 6px);
    background: var(--wa-color-neutral-98, #fafafa);
    color: var(--wa-color-neutral-35, #52525b);
    cursor: pointer;
    line-height: 1;
  }

  .layer-reorder:hover:not(:disabled) {
    border-color: var(--wa-color-brand-60, #0ea5e9);
    color: var(--wa-color-brand-60, #0ea5e9);
    background: var(--wa-color-brand-95, #e0f2fe);
  }

  .layer-remove:hover:not(:disabled) {
    border-color: var(--wa-color-danger-60, #dc2626);
    color: var(--wa-color-danger-60, #dc2626);
    background: var(--wa-color-danger-95, #fef2f2);
  }

  .layer-reorder:disabled,
  .layer-remove:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .layer-form-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--wa-color-brand-85, #bae6fd);
  }

  .layer-form {
    padding: 0.75rem;
    font-size: 0.875rem;
  }

  .layer-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    align-items: start;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .layer-form-grid label {
    display: flex;
    flex-direction: column;
    align-self: start;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .layer-form-grid wa-input,
  .layer-form-grid wa-select {
    font-weight: normal;
  }

  .layer-form-grid wa-select {
    align-self: start;
  }

  /* Style/Blend/Opacity only. The next grid is Color; keep one 0.75rem margin between them. */
  .layer-form > .layer-form-grid:first-child {
    max-height: 5.5rem;
    overflow: hidden;
  }
`;
