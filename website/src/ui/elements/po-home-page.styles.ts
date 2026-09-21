import { css } from 'lit';

export const poHomePageStyles = css`
  .lead {
    font-size: 1.05rem;
    max-width: 65ch;
    line-height: 1.5;
  }

  .requirement {
    max-width: 65ch;
    margin: 1rem 0 1.5rem;
    padding: 0.85rem 1rem;
    border-left: 3px solid var(--wa-color-warning-50, #b45309);
    border-radius: var(--wa-border-radius-medium, 6px);
    background: var(--wa-color-warning-95, #fffbeb);
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  wa-card {
    display: block;
    width: 100%;
    margin-bottom: 1rem;
  }

  wa-card h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }

  wa-card p {
    margin: 0 0 0.75rem;
    max-width: 65ch;
    line-height: 1.45;
  }

  wa-card p:last-child {
    margin-bottom: 0;
  }

  .file-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  .file-table th,
  .file-table td {
    text-align: left;
    padding: 0.5rem 0.65rem;
    border-bottom: 1px solid var(--wa-color-neutral-85, #d4d4d8);
    vertical-align: top;
  }

  .file-table th {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.7;
  }

  .file-path {
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  .status {
    font-size: 0.8125rem;
    white-space: nowrap;
  }

  .status--ready {
    color: var(--wa-color-success-50, #15803d);
  }

  .status--partial {
    color: var(--wa-color-warning-50, #b45309);
  }

  .status--planned {
    opacity: 0.65;
  }

  .steps {
    margin: 0;
    padding-left: 1.25rem;
    max-width: 65ch;
    line-height: 1.5;
  }

  .steps li + li {
    margin-top: 0.35rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
`;
