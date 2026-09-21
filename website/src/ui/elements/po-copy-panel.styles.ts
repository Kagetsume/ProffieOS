import { css } from 'lit';

export const poCopyPanelStyles = css`
  :host {
    display: block;
  }

  wa-card {
    display: block;
  }

  .copy-panel-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
  }

  .copy-panel-filename {
    font-size: 0.875rem;
    color: var(--wa-color-neutral-600, #666);
  }

  textarea {
    display: block;
    width: 100%;
    min-height: 8rem;
    margin: 0.75rem 0;
    padding: 0.5rem;
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    box-sizing: border-box;
    resize: vertical;
  }

  .copy-panel-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
`;
