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

  .page p {
    max-width: 70ch;
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
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
    gap: 0.75rem 1rem;
    width: 100%;
  }

  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    min-width: 0;
  }

  .form-grid label wa-select,
  .form-grid label wa-input {
    width: 100%;
    max-width: 100%;
  }

  /* Nested custom element — must span full grid width (class on inner div does not work). */
  .form-grid po-power-pin-editor {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
  }
`;

export const poPowerPinStyles = css`
  .power-pin-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
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
    grid-template-columns: minmax(5.5rem, auto) minmax(0, 1fr) auto;
    gap: 0.5rem;
    align-items: center;
    width: 100%;
  }

  .power-pin-row po-pin-picker {
    min-width: 0;
    width: 100%;
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
  }

  .pin-picker-select,
  .pin-picker wa-select {
    width: 100%;
    max-width: 100%;
  }

  wa-select.pin-picker-select {
    width: 100%;
  }

  wa-input.pin-picker-custom {
    width: 100%;
  }

  .pin-picker-custom--hidden {
    display: none;
  }
`;
