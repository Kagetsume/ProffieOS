/**
 * One blade wiring card — type, data/power pins, sub-blades, NeoPixel vs simple fields.
 *
 * NeoPixel blades: pixels, power pins, optional sub-blade ranges, sub-blade editor.
 * Simple blades: led type, active_state. Board silkscreen label is read-only (derived from data pin).
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
import type { BladeDefinition, BladeType, SubBladeRange } from '../../model/blades';
import { boardPinReferenceLabel } from '../../model/data-pins';
import { effectivePowerPins } from '../../model/power-pins';
import { getUsedDataPinsForPicker } from '../../stores/data-pin-usage';
import './po-pin-picker.js';
import './po-power-pin-editor.js';
import './po-sub-blade-editor.js';

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
    const usedDataPins = getUsedDataPinsForPicker(blade.index, this.blades);
    const boardPinLabel = boardPinReferenceLabel(blade.dataPin);

    return html`
      <wa-card class="blade-card" data-blade-index="${blade.index}">
        <div slot="header" class="blade-card-header">
          <strong>Blade ${blade.index}</strong>
          ${boardPinLabel
            ? html`<span class="blade-label">${boardPinLabel}</span>`
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
          <label class="data-pin-field">
            data_pin
            <po-pin-picker
              .mode=${'data'}
              .value=${blade.dataPin}
              .usedPresets=${usedDataPins}
              @pin-change=${this.onDataPinChange}
            ></po-pin-picker>
          </label>
          <label class="board-pin-field">
            Board pin (silkscreen)
            <wa-input
              class="readonly-field"
              .value=${boardPinLabel}
              placeholder="Select a data pin…"
              readonly
            ></wa-input>
          </label>
          <label class="comment-field span-2">
            Note (optional)
            <wa-input
              .value=${blade.comment ?? ''}
              placeholder="e.g. Crystal chamber accent"
              @wa-input=${this.onCommentInput}
            ></wa-input>
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
                <po-sub-blade-editor
                  class="span-2"
                  .pixels=${blade.pixels ?? 144}
                  .subBlades=${blade.subBlades ?? []}
                  @sub-blades-change=${this.onSubBladesChange}
                ></po-sub-blade-editor>
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
        subBlades: undefined,
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

  private onDataPinChange = (event: CustomEvent<{ value: string }>): void => {
    this.patch({ dataPin: event.detail.value });
  };

  private onCommentInput = (event: Event): void => {
    this.patch({ comment: (event.target as HTMLInputElement).value });
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

  private onSubBladesChange = (event: CustomEvent<{ subBlades: SubBladeRange[] }>): void => {
    const subBlades = event.detail.subBlades;
    this.patch({ subBlades: subBlades.length > 0 ? subBlades : undefined });
  };
}

customElements.define('po-blade-card', PoBladeCard);
