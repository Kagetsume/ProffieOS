/**
 * Shared Lit styles for wiring UI (shadow DOM — not in global `app.css`).
 *
 * @module ui/elements/po-shared-styles
 */
import { css } from 'lit';

export const poHostStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }
`;

export const poPageStyles = css`
  .page h2 {
    margin-top: 0;
  }

  .page .lead,
  .page .config-lead {
    max-width: 75ch;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: end;
    margin-bottom: 1rem;
  }

  .toolbar label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    min-width: min(100%, 16rem);
  }

  .toolbar wa-select {
    min-width: 12rem;
    width: 100%;
  }

  .blade-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .hint {
    font-size: 0.875rem;
    opacity: 0.75;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
  }
`;

/** Board / features config forms (shadow DOM). */
export const poConfigFormStyles = css`
  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 16rem));
    gap: 0.85rem 1rem;
    width: 100%;
    padding: 0.25rem 0;
    align-items: start;
  }

  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 0;
    max-width: 16rem;
  }

  .form-grid label.switch-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  wa-card {
    display: block;
    width: 100%;
  }

  .form-grid label wa-select,
  .form-grid label wa-input {
    width: 100%;
    max-width: 16rem;
  }

  wa-select {
    width: 100%;
    max-width: 16rem;
  }
`;

export const poBladeCardStyles = css`
  wa-card {
    display: block;
    width: 100%;
  }

  .blade-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .blade-card-header wa-button {
    margin-inline-start: auto;
  }

  .blade-label {
    font-weight: normal;
    opacity: 0.7;
    font-size: 0.875rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 16rem));
    gap: 0.75rem 1rem;
    width: 100%;
    align-items: start;
  }

  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    min-width: 0;
    max-width: 16rem;
  }

  .form-grid label wa-select,
  .form-grid label wa-input {
    width: 100%;
    max-width: 16rem;
  }

  .form-grid po-power-pin-editor {
    grid-column: 1 / -1;
    width: 100%;
    max-width: 42rem;
    min-width: 0;
  }
`;

export const poPowerPinStyles = css`
  .power-pin-editor {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
    max-width: 42rem;
  }

  .power-pin-editor > wa-button {
    width: auto;
  }

  .power-pin-heading {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .power-pin-hint {
    font-weight: normal;
    opacity: 0.75;
    font-size: 0.8125rem;
  }

  .power-pin-rows {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .power-pin-row {
    display: grid;
    grid-template-columns: 5.75rem minmax(10rem, 18rem) auto;
    gap: 0.5rem 0.75rem;
    align-items: center;
    width: fit-content;
    max-width: 100%;
  }

  .power-pin-row po-pin-picker {
    min-width: 0;
    width: 100%;
    max-width: 18rem;
  }

  .power-pin-slot {
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    opacity: 0.85;
    white-space: nowrap;
  }
`;

export const poPinPickerStyles = css`
  .pin-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
    max-width: 18rem;
  }

  .pin-picker-select,
  .pin-picker wa-select {
    width: 100%;
    max-width: 18rem;
  }

  wa-select.pin-picker-select {
    width: 100%;
    max-width: 18rem;
  }

  wa-input.pin-picker-custom {
    width: 100%;
    max-width: 18rem;
  }

  .pin-picker-custom--hidden {
    display: none;
  }
`;
