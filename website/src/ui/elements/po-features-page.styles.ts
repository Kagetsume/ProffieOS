import { css } from 'lit';

export const poFeaturesPageStyles = css`
  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 0.25rem 0;
    width: 100%;
  }

  .feature-field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .feature-label {
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .feature-description {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: normal;
    line-height: 1.45;
    opacity: 0.85;
  }

  .feature-field wa-switch {
    align-self: flex-start;
  }
`;
