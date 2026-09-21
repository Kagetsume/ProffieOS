import { css } from 'lit';

export const poPresetsPageStyles = css`
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

  .section-toolbar wa-select {
    width: 100%;
    min-width: 0;
    font-weight: normal;
  }

  .vars-heading {
    margin: 1.25rem 0 0.5rem;
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .form-grid .span-2 {
    grid-column: 1 / -1;
    max-width: 42rem;
  }

  .presets-help {
    max-width: 65ch;
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--wa-color-neutral-90, #e5e7eb);
    border-radius: var(--wa-border-radius-medium, 6px);
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .presets-help summary {
    cursor: pointer;
    font-weight: 600;
  }

  .presets-help ul {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }
`;
