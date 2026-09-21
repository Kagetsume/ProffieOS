import { css } from 'lit';

export const poPresetStyleRowStyles = css`
  :host {
    display: block;
  }

  .style-row {
    border: 1px solid var(--wa-color-neutral-90, #e5e7eb);
    border-radius: var(--wa-border-radius-medium, 6px);
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .style-row-header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: baseline;
    margin-bottom: 0.65rem;
  }

  .slot-label {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .style-preview {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
    opacity: 0.85;
    word-break: break-word;
  }

  .style-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
    gap: 0.65rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
    min-width: 0;
  }

  wa-select,
  wa-input {
    font-weight: normal;
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .span-2 {
    grid-column: 1 / -1;
  }
`;
