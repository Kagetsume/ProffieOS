/**
 * One blade wiring card — type, pins, NeoPixel vs simple fields.
 *
 * @fires blade-patch - `{ index: number, patch: Partial<BladeDefinition> }`
 * @fires blade-remove - `{ index: number }`
 */
import { LitElement, html, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import type { BladeDefinition, BladeType } from '../../model/blades';
import { effectivePowerPins } from '../../model/power-pins';
import './po-power-pin-editor.js';

export class PoBladeCard extends LitElement {
  static properties = {
    blade: { attribute: false },
    blades: { attribute: false },
  };

  blade!: BladeDefinition;
  blades: BladeDefinition[] = [];

  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const blade = this.blade;
    const isSimple = blade.type === 'simple';

    return html`
      <wa-card class="blade-card" data-blade-index="${blade.index}">
        <div slot="header" class="blade-card-header">
          <strong>Blade ${blade.index}</strong>
          ${blade.label
            ? html`<span class="blade-label">${blade.label}</span>`
            : nothing}
          <wa-button size="small" variant="danger" @click=${this.onRemove}>Remove</wa-button>
        </div>
        <div class="form-grid">
          <label>
            Type
            <wa-select
              .value=${blade.type}
              @wa-change=${this.onTypeChange}
            >
              <wa-option value="ws2811">NeoPixel (ws2811)</wa-option>
              <wa-option value="simple">Simple PWM LED</wa-option>
            </wa-select>
          </label>
          <label>
            Label (comment)
            <wa-input
              .value=${blade.label ?? ''}
              placeholder="Main blade"
              @wa-input=${this.onLabelInput}
            ></wa-input>
          </label>
          <label>
            data_pin
            <wa-input .value=${blade.dataPin} @wa-input=${this.onDataPinInput}></wa-input>
          </label>
          ${isSimple
            ? html`
                <label>
                  led
                  <wa-input
                    .value=${blade.led ?? 'CreeXPE2White'}
                    @wa-input=${this.onLedInput}
                  ></wa-input>
                </label>
                <label>
                  active_state
                  <wa-select
                    .value=${blade.activeState ?? 'high'}
                    @wa-change=${this.onActiveStateChange}
                  >
                    <wa-option value="high">high</wa-option>
                    <wa-option value="low">low</wa-option>
                  </wa-select>
                </label>
              `
            : html`
                <label>
                  pixels
                  <wa-input
                    type="number"
                    .value=${String(blade.pixels ?? 144)}
                    @wa-input=${this.onPixelsInput}
                  ></wa-input>
                </label>
                <po-power-pin-editor
                  class="span-2"
                  blade-index=${blade.index}
                  .pins=${effectivePowerPins(blade.powerPins)}
                  .blades=${this.blades}
                  @pins-change=${this.onPinsChange}
                ></po-power-pin-editor>
              `}
        </div>
      </wa-card>
    `;
  }

  private patch(patch: Partial<BladeDefinition>): void {
    this.dispatchEvent(
      new CustomEvent('blade-patch', {
        detail: { index: this.blade.index, patch },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onRemove = (): void => {
    this.dispatchEvent(
      new CustomEvent('blade-remove', {
        detail: { index: this.blade.index },
        bubbles: true,
        composed: true,
      }),
    );
  };

  private onTypeChange = (event: Event): void => {
    const type = (event.target as HTMLSelectElement & { value: BladeType }).value;
    if (type === 'simple') {
      this.patch({
        type,
        led: this.blade.led ?? 'CreeXPE2White',
        activeState: this.blade.activeState ?? 'high',
        pixels: undefined,
        powerPins: undefined,
      });
    } else {
      this.patch({
        type,
        pixels: this.blade.pixels ?? 144,
        powerPins: effectivePowerPins(this.blade.powerPins),
        led: undefined,
        activeState: undefined,
      });
    }
  };

  private onLabelInput = (event: Event): void => {
    this.patch({ label: (event.target as HTMLInputElement).value });
  };

  private onDataPinInput = (event: Event): void => {
    this.patch({ dataPin: (event.target as HTMLInputElement).value });
  };

  private onLedInput = (event: Event): void => {
    this.patch({ led: (event.target as HTMLInputElement).value });
  };

  private onActiveStateChange = (event: Event): void => {
    this.patch({
      activeState: (event.target as HTMLSelectElement).value as 'high' | 'low',
    });
  };

  private onPixelsInput = (event: Event): void => {
    this.patch({ pixels: Number((event.target as HTMLInputElement).value) || 0 });
  };

  private onPinsChange = (event: CustomEvent<{ pins: string[] }>): void => {
    this.patch({ powerPins: event.detail.pins });
  };
}

customElements.define('po-blade-card', PoBladeCard);
