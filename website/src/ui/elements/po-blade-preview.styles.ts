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

/** Drop blade onto emitter; SVG padding above socket + slight overlap into hilt art. */
export const BLADE_EMITTER_OFFSET_PX = 4;
/** Collapse flex gap so blade base overlaps hilt graphic (blade paints above via z-index). */
export const BLADE_HILT_OVERLAP_PX = 6;
/** Horizontal nudge for blade vs hilt emitter (negative = left). */
export const BLADE_HORIZONTAL_OFFSET_PX = -1;

/** Saber stack, hilt stage, preview controls, and blade angle slider layout. */
export const poBladePreviewStyles = css`
  :host {
    display: block;
    width: 100%;
    box-sizing: border-box;
    color: #f4f6f8;
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
    position: relative;
    z-index: 1;
    overflow: visible;
    margin-bottom: calc(-1 * ${BLADE_HILT_OVERLAP_PX}px);
    transform: translate(${BLADE_HORIZONTAL_OFFSET_PX}px, ${BLADE_EMITTER_OFFSET_PX}px);
  }

  /* Height is the current extended length (set from the draw path). Shadow hugs this strip only. */
  .blade-glow {
    position: absolute;
    left: 50%;
    bottom: 0;
    z-index: 0;
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: 0 0 14px 4px rgba(100, 200, 255, 0.9);
  }

  .blade-glow[hidden] {
    display: none;
  }

  .preview-blade {
    display: block;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .hilt-stage {
    position: relative;
    z-index: 0;
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
    align-items: stretch;
    gap: 0.65rem;
    margin: 0.75rem 0 0;
    width: 100%;
    max-width: 100%;
    margin-inline: auto;
    color: #f4f6f8;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid var(--wa-color-neutral-35, #52525b);
    border-radius: var(--wa-border-radius-medium, 6px);
    background: rgba(0, 0, 0, 0.15);
  }

  .control-group-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #f4f6f8;
    opacity: 1;
  }

  .control-group-body {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: center;
  }

  .control-group-body wa-button {
    min-width: 4.5rem;
    color: #f4f6f8;
    --wa-color-on-loud: #f4f6f8;
    --wa-color-neutral-on-loud: #f4f6f8;
    --wa-color-on-normal: #f4f6f8;
    --wa-color-neutral-on-normal: #f4f6f8;
    --wa-color-on-quiet: #f4f6f8;
    --wa-color-neutral-on-quiet: #f4f6f8;
    --wa-color-brand-on-loud: #f4f6f8;
  }

  .control-group-body wa-button::part(button) {
    color: #f4f6f8;
  }

  .control-group-body wa-button[disabled] {
    opacity: 1;
  }

  .combat-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.15rem 0.35rem;
    color: #f4f6f8;
    opacity: 1;
  }

  .combat-toggle--disabled {
    color: #f4f6f8;
    opacity: 1;
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
    color: #f4f6f8;
    opacity: 1;
  }

  .blade-angle-control input[type='range'] {
    width: 100%;
    margin: 0;
    accent-color: var(--wa-color-brand-50, #0ea5e9);
  }

  .blade-angle-hint {
    font-weight: normal;
    font-size: 0.75rem;
    color: #f4f6f8;
    opacity: 1;
    line-height: 1.35;
  }

  .preview-caption {
    margin: 0.5rem 0 0;
    font-size: 0.7rem;
    color: #f4f6f8;
    opacity: 1;
    text-align: center;
  }
`;
