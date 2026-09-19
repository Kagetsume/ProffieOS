/**
 * Multi-row power pin editor for one NeoPixel blade.
 *
 * Reads a master pin list from sibling blades via {@link usedPresetsForPicker}.
 *
 * @fires pins-change - `{ pins: string[] }` when any row changes
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
import './po-pin-picker.js';

function powerPinFieldLabel(index: number, count: number): string {
  if (count === 1) {
    return 'power_pin';
  }
  return `power_pin${index + 1}`;
}

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

  /** Light DOM — Web Awesome + nested custom elements. */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('pins') && this.pins !== this.localPins) {
      this.localPins = [...this.pins];
    }
  }

  render() {
    const rows = this.localPins.map(
      (pin, index) => html`
        <div class="power-pin-row" data-pin-row="${index}">
          <span class="power-pin-slot">${powerPinFieldLabel(index, this.localPins.length)}</span>
          <po-pin-picker
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
            data-action="remove-pin"
            data-pin-index="${index}"
            ?disabled=${this.localPins.length <= 1}
            @click=${() => this.removeRow(index)}
          >
            Remove
          </wa-button>
        </div>
      `,
    );

    return html`
      <div class="power-pin-editor span-2" data-field="powerPins">
        <div class="power-pin-heading">
          Power pins
          <span class="power-pin-hint">
            Six FET pins (bladePowerPin1–6) are shared across all NeoPixel blades — each pin can
            only be used once in the whole saber.
          </span>
        </div>
        <div class="power-pin-rows">${rows}</div>
        <wa-button
          size="small"
          variant="brand"
          data-action="add-pin"
          ?disabled=${this.localPins.length >= MAX_POWER_PINS}
          @click=${this.addRow}
        >
          Add power pin
        </wa-button>
      </div>
    `;
  }

  private emitPins(next: string[]): void {
    this.localPins = next;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('pins-change', {
        detail: { pins: next },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onPinChange(index: number, value: string): void {
    this.emitPins(updatePowerPinRow(this.localPins, index, value));
  }

  private addRow = (): void => {
    if (this.localPins.length >= MAX_POWER_PINS) {
      return;
    }
    this.emitPins(addPowerPinRow(this.localPins));
  };

  private removeRow = (index: number): void => {
    if (this.localPins.length <= 1) {
      return;
    }
    this.emitPins(removePowerPinRow(this.localPins, index));
  };
}

customElements.define('po-power-pin-editor', PoPowerPinEditor);
