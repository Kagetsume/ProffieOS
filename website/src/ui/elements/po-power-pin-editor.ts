/**
 * Multi-row power pin editor for one NeoPixel blade.
 *
 * Reads a master pin list from sibling blades via {@link usedPresetsForPicker}.
 *
 * @fires pins-change - `{ pins: string[] }` when any row changes
 *
 * @module ui/elements/po-power-pin-editor
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import type { BladeDefinition } from '../../model/blades';
import { MAX_POWER_PINS } from '../../validation/limits';
import {
  addPowerPinRow,
  removePowerPinRow,
  updatePowerPinRow,
  usedPresetsForPicker,
} from '../../model/power-pins';
import { contextLogger } from '../../logger/index.js';
import { powerPinEditorI18n } from './po-power-pin-editor.i18n.js';
import { powerPinEditorKeys } from './po-power-pin-editor.keys.js';
import './po-pin-picker.js';

/**
 * Returns the firmware field label for one power-pin row (`power_pin` or `power_pinN`).
 *
 * @param index - Zero-based row index within the blade's power-pin list.
 * @param count - Total number of power-pin rows for this blade.
 * @returns Label string used in the UI and exported config.
 */
function powerPinFieldLabel(index: number, count: number): string {
  if (count === 1) {
    return 'power_pin';
  }
  return `power_pin${index + 1}`;
}

/**
 * Multi-row power FET pin editor for one NeoPixel blade.
 *
 * @fires pins-change - `{ pins: string[] }`
 */
export class PoPowerPinEditor extends LitElement {
  static properties = {
    pins: { attribute: false },
    bladeIndex: { type: Number, attribute: 'blade-index' },
    blades: { attribute: false },
  };

  pins: string[] = [''];
  bladeIndex = 0;
  blades: BladeDefinition[] = [];

  private localPins: string[] = [''];

  /**
   * Renders into light DOM so Web Awesome and nested `po-pin-picker` elements work correctly.
   *
   * @returns This element as its own render root.
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  /**
   * Syncs local editable state when the parent passes a new `pins` array.
   *
   * @param changed - Lit property change map from the current update cycle.
   */
  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('pins') && this.pins !== this.localPins) {
      this.localPins = [...this.pins];
    }
  }

  /**
   * Updates local state and notifies the parent of a new power-pin list.
   *
   * @param next - Complete power-pin id array after an edit.
   */
  private emitPins(next: string[]): void {
    const log = contextLogger('po-power-pin-editor', 'emitPins');
    log.entry({ next, previous: this.localPins });
    this.localPins = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('pins-change', {
        detail: { pins: next },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit({ pins: next });
  }

  /**
   * Handles pin selection on one power-pin row.
   *
   * @param index - Zero-based row index in {@link localPins}.
   * @param value - Committed pin id from the nested pin picker.
   */
  private onPinChange(index: number, value: string): void {
    const log = contextLogger('po-power-pin-editor', 'onPinChange');
    log.entry({ index, value });
    this.emitPins(updatePowerPinRow(this.localPins, index, value));
    log.exit();
  }

  /**
   * Appends a new empty power-pin row, respecting {@link MAX_POWER_PINS}.
   */
  private addRow = (): void => {
    const log = contextLogger('po-power-pin-editor', 'addRow');
    log.entry({ pinCount: this.localPins.length, max: MAX_POWER_PINS });
    if (this.localPins.length >= MAX_POWER_PINS) {
      log.debug('branch: at max power pins, skipping add', { pinCount: this.localPins.length });
      log.exit('max-reached');
      return;
    }
    this.emitPins(addPowerPinRow(this.localPins));
    log.exit({ pinCount: this.localPins.length });
  };

  /**
   * Removes one power-pin row by index, keeping at least one row.
   *
   * @param index - Zero-based row index to delete.
   */
  private removeRow = (index: number): void => {
    const log = contextLogger('po-power-pin-editor', 'removeRow');
    log.entry({ index, pinCount: this.localPins.length });
    if (this.localPins.length <= 1) {
      log.debug('branch: only one row, skipping remove', { pinCount: this.localPins.length });
      log.exit('min-reached');
      return;
    }
    this.emitPins(removePowerPinRow(this.localPins, index));
    log.exit({ pinCount: this.localPins.length });
  };

  /**
   * Builds the power-pin editor — one pin picker per row plus add/remove controls.
   *
   * @returns Lit template for the power-pin editor UI.
   */
  render() {
    const rows = this.localPins.map(
      (pin, index) => html`
        <div class="power-pin-row" data-testid="power-pin-editor-row" data-pin-row="${index}">
          <span class="power-pin-slot">${powerPinFieldLabel(index, this.localPins.length)}</span>
          <po-pin-picker
            data-testid="power-pin-editor-picker"
            .value=${pin}
            .usedPresets=${usedPresetsForPicker(
              this.blades,
              this.bladeIndex,
              this.localPins,
              index,
            )}
            @pin-change=${(event: CustomEvent<{ value: string }>) =>
              this.onPinChange(index, event.detail.value)}
          ></po-pin-picker>
          <wa-button
            size="small"
            variant="neutral"
            data-testid="power-pin-editor-remove"
            data-pin-index="${index}"
            ?disabled=${this.localPins.length <= 1}
            @click=${() => this.removeRow(index)}
          >
            ${powerPinEditorI18n.translate(powerPinEditorKeys.remove)}
          </wa-button>
        </div>
      `,
    );

    return html`
      <div class="power-pin-editor" data-testid="power-pin-editor" data-field="powerPins">
        <div class="power-pin-heading">
          ${powerPinEditorI18n.translate(powerPinEditorKeys.heading)}
          <span class="power-pin-hint">${powerPinEditorI18n.translate(powerPinEditorKeys.hint)}</span>
        </div>
        <div class="power-pin-rows" data-testid="power-pin-editor-rows">${rows}</div>
        <wa-button
          class="power-pin-add"
          size="small"
          variant="brand"
          data-testid="power-pin-editor-add"
          ?disabled=${this.localPins.length >= MAX_POWER_PINS}
          @click=${this.addRow}
        >
          ${powerPinEditorI18n.translate(powerPinEditorKeys.addPowerPin)}
        </wa-button>
      </div>
    `;
  }
}

customElements.define('po-power-pin-editor', PoPowerPinEditor);
