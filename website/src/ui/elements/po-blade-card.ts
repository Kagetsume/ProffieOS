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
import { contextLogger } from '../../logger/index.js';
import type { BladeDefinition, BladeType, SubBladeRange } from '../../model/blades';
import { boardPinReferenceLabel } from '../../model/data-pins';
import { effectivePowerPins } from '../../model/power-pins';
import { getUsedDataPinsForPicker } from '../../stores/data-pin-usage';
import { bladeCardI18n } from './po-blade-card.i18n.js';
import { bladeCardKeys } from './po-blade-card.keys.js';
import './po-pin-picker.js';
import './po-power-pin-editor.js';
import './po-sub-blade-editor.js';

/**
 * Lit card for editing one blade's wiring — type, pins, NeoPixel fields, or simple-LED fields.
 *
 * @fires blade-patch - `{ index: number, patch: Partial<BladeDefinition> }`
 * @fires blade-remove - `{ index: number }`
 */
export class PoBladeCard extends LitElement {
  static properties = {
    blade: { attribute: false },
    blades: { attribute: false },
  };

  blade!: BladeDefinition;
  blades: BladeDefinition[] = [];

  /**
   * Renders into light DOM so nested Web Awesome and custom elements work without shadow boundaries.
   *
   * @returns This element as its own render root.
   */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  /**
   * Builds the blade card form — type selector, pin pickers, and type-specific fields.
   *
   * @returns Lit template for the full blade card UI.
   */
  render() {
    const blade = this.blade;
    const isSimple = blade.type === 'simple';
    const usedDataPins = getUsedDataPinsForPicker(blade.index, this.blades);
    const boardPinLabel = boardPinReferenceLabel(blade.dataPin);

    return html`
      <wa-card class="blade-card" data-blade-index="${blade.index}">
        <div slot="header" class="blade-card-header">
          <strong>${bladeCardI18n.translate(bladeCardKeys.header, { index: blade.index })}</strong>
          ${boardPinLabel
            ? html`<span class="blade-label">${boardPinLabel}</span>`
            : nothing}
          <wa-button size="small" variant="danger" @click=${this.onRemove}
            >${bladeCardI18n.translate(bladeCardKeys.remove)}</wa-button
          >
        </div>
        <div class="form-grid">
          <label>
            ${bladeCardI18n.translate(bladeCardKeys.labelType)}
            <wa-select
              .value=${blade.type}
              @wa-change=${this.onTypeChange}
            >
              <wa-option value="ws2811">${bladeCardI18n.translate(bladeCardKeys.optionWs2811)}</wa-option>
              <wa-option value="simple">${bladeCardI18n.translate(bladeCardKeys.optionSimple)}</wa-option>
            </wa-select>
          </label>
          <label class="data-pin-field">
            ${bladeCardI18n.translate(bladeCardKeys.labelDataPin)}
            <po-pin-picker
              .mode=${'data'}
              .value=${blade.dataPin}
              .usedPresets=${usedDataPins}
              @pin-change=${this.onDataPinChange}
            ></po-pin-picker>
          </label>
          <label class="board-pin-field">
            ${bladeCardI18n.translate(bladeCardKeys.labelBoardPin)}
            <wa-input
              class="readonly-field"
              .value=${boardPinLabel}
              placeholder=${bladeCardI18n.translate(bladeCardKeys.placeholderDataPin)}
              readonly
            ></wa-input>
          </label>
          <label class="comment-field span-2">
            ${bladeCardI18n.translate(bladeCardKeys.labelComment)}
            <wa-input
              .value=${blade.comment ?? ''}
              placeholder=${bladeCardI18n.translate(bladeCardKeys.placeholderComment)}
              @wa-input=${this.onCommentInput}
            ></wa-input>
          </label>
          ${isSimple
            ? html`
                <label>
                  ${bladeCardI18n.translate(bladeCardKeys.labelLed)}
                  <wa-input
                    .value=${blade.led ?? 'CreeXPE2White'}
                    @wa-input=${this.onLedInput}
                  ></wa-input>
                </label>
                <label>
                  ${bladeCardI18n.translate(bladeCardKeys.labelActiveState)}
                  <wa-select
                    .value=${blade.activeState ?? 'high'}
                    @wa-change=${this.onActiveStateChange}
                  >
                    <wa-option value="high">${bladeCardI18n.translate(bladeCardKeys.optionHigh)}</wa-option>
                    <wa-option value="low">${bladeCardI18n.translate(bladeCardKeys.optionLow)}</wa-option>
                  </wa-select>
                </label>
              `
            : html`
                <label>
                  ${bladeCardI18n.translate(bladeCardKeys.labelPixels)}
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

  /**
   * Dispatches a partial blade update to the parent wiring editor.
   *
   * @param patch - Fields to merge into the current {@link blade} definition.
   */
  private patch(patch: Partial<BladeDefinition>): void {
    const log = contextLogger('po-blade-card', 'patch');
    log.entry({ index: this.blade.index, patchKeys: Object.keys(patch) });
    this.dispatchEvent(
      new CustomEvent('blade-patch', {
        detail: { index: this.blade.index, patch },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit();
  }

  /**
   * Handles the remove button — requests deletion of this blade by index.
   */
  private onRemove = (): void => {
    const log = contextLogger('po-blade-card', 'onRemove');
    log.entry({ index: this.blade.index });
    this.dispatchEvent(
      new CustomEvent('blade-remove', {
        detail: { index: this.blade.index },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit();
  };

  /**
   * Handles blade type selection — switches between NeoPixel (`ws2811`) and simple LED defaults.
   *
   * @param event - Change event from the type `wa-select`.
   */
  private onTypeChange = (event: Event): void => {
    const log = contextLogger('po-blade-card', 'onTypeChange');
    const type = (event.target as HTMLSelectElement & { value: BladeType }).value;
    log.entry({ index: this.blade.index, type });
    if (type === 'simple') {
      log.debug('branch: switch to simple', { type });
      this.patch({
        type,
        led: this.blade.led ?? 'CreeXPE2White',
        activeState: this.blade.activeState ?? 'high',
        pixels: undefined,
        powerPins: undefined,
        subBlades: undefined,
      });
    } else {
      log.debug('branch: switch to ws2811', { type });
      this.patch({
        type,
        pixels: this.blade.pixels ?? 144,
        powerPins: effectivePowerPins(this.blade.powerPins),
        led: undefined,
        activeState: undefined,
      });
    }
    log.exit();
  };

  /**
   * Handles data-pin selection from the nested pin picker.
   *
   * @param event - `pin-change` event carrying the chosen data pin id.
   */
  private onDataPinChange = (event: CustomEvent<{ value: string }>): void => {
    const log = contextLogger('po-blade-card', 'onDataPinChange');
    log.entry({ index: this.blade.index, dataPin: event.detail.value });
    this.patch({ dataPin: event.detail.value });
    log.exit();
  };

  /**
   * Handles free-text comment input for this blade.
   *
   * @param event - Input event from the comment `wa-input`.
   */
  private onCommentInput = (event: Event): void => {
    const log = contextLogger('po-blade-card', 'onCommentInput');
    const comment = (event.target as HTMLInputElement).value;
    log.entry({ index: this.blade.index, comment });
    this.patch({ comment });
    log.exit();
  };

  /**
   * Handles LED driver name input for simple blades.
   *
   * @param event - Input event from the LED `wa-input`.
   */
  private onLedInput = (event: Event): void => {
    const log = contextLogger('po-blade-card', 'onLedInput');
    const led = (event.target as HTMLInputElement).value;
    log.entry({ index: this.blade.index, led });
    this.patch({ led });
    log.exit();
  };

  /**
   * Handles active-state selection (`high` or `low`) for simple blades.
   *
   * @param event - Change event from the active-state `wa-select`.
   */
  private onActiveStateChange = (event: Event): void => {
    const log = contextLogger('po-blade-card', 'onActiveStateChange');
    const activeState = (event.target as HTMLSelectElement).value as 'high' | 'low';
    log.entry({ index: this.blade.index, activeState });
    this.patch({ activeState });
    log.exit();
  };

  /**
   * Handles pixel count input for NeoPixel blades.
   *
   * @param event - Input event from the pixels `wa-input`.
   */
  private onPixelsInput = (event: Event): void => {
    const log = contextLogger('po-blade-card', 'onPixelsInput');
    const pixels = Number((event.target as HTMLInputElement).value) || 0;
    log.entry({ index: this.blade.index, pixels });
    this.patch({ pixels });
    log.exit();
  };

  /**
   * Handles power-pin list updates from the nested power-pin editor.
   *
   * @param event - `pins-change` event carrying the full power-pin array.
   */
  private onPinsChange = (event: CustomEvent<{ pins: string[] }>): void => {
    const log = contextLogger('po-blade-card', 'onPinsChange');
    log.entry({ index: this.blade.index, pinCount: event.detail.pins.length });
    this.patch({ powerPins: event.detail.pins });
    log.exit();
  };

  /**
   * Handles sub-blade range updates from the nested sub-blade editor.
   *
   * Clears `subBlades` on the blade when the editor emits an empty list.
   *
   * @param event - `sub-blades-change` event carrying the sub-blade range array.
   */
  private onSubBladesChange = (event: CustomEvent<{ subBlades: SubBladeRange[] }>): void => {
    const log = contextLogger('po-blade-card', 'onSubBladesChange');
    const subBlades = event.detail.subBlades;
    log.entry({ index: this.blade.index, count: subBlades.length });
    if (subBlades.length > 0) {
      log.debug('branch: keep subBlades', { count: subBlades.length });
      this.patch({ subBlades });
    } else {
      log.debug('branch: clear subBlades');
      this.patch({ subBlades: undefined });
    }
    log.exit();
  };
}

customElements.define('po-blade-card', PoBladeCard);
