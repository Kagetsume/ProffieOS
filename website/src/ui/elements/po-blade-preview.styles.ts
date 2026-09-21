/**
 * Lit styles for the blade preview component (shadow DOM).
 *
 * @module ui/elements/po-blade-preview.styles
 */
import { css } from 'lit';
import {
  HILT_SVG_NATURAL_HEIGHT,
  HILT_SVG_NATURAL_WIDTH,
} from '../../preview/vertical-layout.js';

export const HILT_ROTATOR_WIDTH_REM = 11;
export const HILT_ASPECT = HILT_SVG_NATURAL_HEIGHT / HILT_SVG_NATURAL_WIDTH;

/** Saber stack, hilt stage, preview controls, and blade angle slider layout. */
export const poBladePreviewStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
  }

  .saber-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
  }

  .blade-slot {
    display: flex;
    justify-content: center;
    width: 100%;
    flex-shrink: 0;
  }

  .preview-blade {
    display: block;
    flex-shrink: 0;
    box-shadow: 0 0 14px rgba(100, 200, 255, 0.4);
  }

  .hilt-stage {
    position: relative;
    flex-shrink: 0;
    width: calc(${HILT_ROTATOR_WIDTH_REM}rem * ${HILT_ASPECT});
    height: ${HILT_ROTATOR_WIDTH_REM}rem;
    max-width: 85%;
  }

  .hilt-rotator {
    position: absolute;
    left: 50%;
    top: 50%;
    width: ${HILT_ROTATOR_WIDTH_REM}rem;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
  }

  .hilt-img {
    display: block;
    width: 100%;
    height: auto;
    pointer-events: none;
    user-select: none;
  }

  .preview-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.45rem;
    margin: 0.75rem 0 0;
    width: 100%;
  }

  .preview-controls-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
    width: 100%;
  }

  .preview-controls-row--buttons wa-button {
    min-width: 4.5rem;
  }

  .combat-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.15rem 0.35rem;
    opacity: 0.85;
  }

  .combat-toggle--disabled {
    opacity: 0.45;
    pointer-events: none;
  }

  .blade-angle-control {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(100%, 16rem);
    margin-top: 0.15rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .blade-angle-label {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .blade-angle-value {
    font-weight: normal;
    font-variant-numeric: tabular-nums;
    opacity: 0.75;
  }

  .blade-angle-control input[type='range'] {
    width: 100%;
    margin: 0;
    accent-color: var(--wa-color-brand-50, #0ea5e9);
  }

  .blade-angle-hint {
    font-weight: normal;
    font-size: 0.75rem;
    opacity: 0.7;
    line-height: 1.35;
  }

  .preview-caption {
    margin: 0.5rem 0 0;
    font-size: 0.7rem;
    opacity: 0.6;
    text-align: center;
  }
`;
