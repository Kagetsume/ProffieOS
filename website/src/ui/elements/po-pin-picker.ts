/**
 * Board pin picker — Web Awesome `wa-select` + optional custom input.
 *
 * Supports power FET pins (`mode=power`) and blade data/Free pins (`mode=data`).
 * Options are rendered declaratively so Lit re-renders keep selection + disabled state.
 * Parent passes fresh `.usedPresets` when `$wiring` changes — options re-render declaratively.
 *
 * @fires pin-change - `{ value: string }` when the committed pin changes
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { contextLogger } from '../../logger/index.js';
import {
  CUSTOM_PIN_VALUE,
  isPresetPinForMode,
  pinCatalogForMode,
  selectValueForPin,
  type PinPickerMode,
} from './pin-picker-utils';
import { pinPickerI18n } from './po-pin-picker.i18n.js';
import { pinPickerKeys } from './po-pin-picker.keys.js';

export class PoPinPicker extends LitElement {
  static properties = {
    value: { type: String },
    usedPresets: { attribute: false },
    mode: { type: String, attribute: 'mode' },
  };

  value = '';
  usedPresets: ReadonlySet<string> = new Set();
  mode: PinPickerMode = 'power';

  /** Light DOM — required for Web Awesome form controls. */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const stored = this.value.trim();
    const selectValue = selectValueForPin(stored, this.mode);
    const showCustom = selectValue === CUSTOM_PIN_VALUE;
    const catalog = pinCatalogForMode(this.mode);

    return html`
      <div class="pin-picker">
        <wa-select
          class="pin-picker-select"
          .value=${selectValue}
          placeholder=${pinPickerI18n.translate(
            this.mode === 'data' ? pinPickerKeys.placeholderData : pinPickerKeys.placeholderPower,
          )}
          @wa-change=${this.onSelectChange}
          @change=${this.onSelectChange}
        >
          ${catalog.map(
            (entry) => html`
              <wa-option
                value=${entry.id}
                ?disabled=${this.usedPresets.has(entry.id)}
              >
                ${this.usedPresets.has(entry.id)
                  ? pinPickerI18n.translate(pinPickerKeys.optionInUse, { label: entry.label })
                  : entry.label}
              </wa-option>
            `,
          )}
          <wa-option value=${CUSTOM_PIN_VALUE}
            >${pinPickerI18n.translate(pinPickerKeys.optionCustom)}</wa-option
          >
        </wa-select>
        <wa-input
          class="pin-picker-custom ${showCustom ? '' : 'pin-picker-custom--hidden'}"
          .value=${showCustom ? stored : ''}
          placeholder=${pinPickerI18n.translate(pinPickerKeys.placeholderCustom)}
          @wa-input=${this.onCustomInput}
        ></wa-input>
      </div>
    `;
  }

  private onSelectChange = (event: Event): void => {
    const log = contextLogger('po-pin-picker', 'onSelectChange');
    const chosen = (event.target as HTMLSelectElement & { value: string }).value;
    log.entry({ chosen, mode: this.mode });
    if (chosen === CUSTOM_PIN_VALUE) {
      log.debug('branch: custom pin selected', { chosen });
      this.emit(isPresetPinForMode(storedValue(this), this.mode) ? '' : storedValue(this));
      log.exit('custom');
      return;
    }
    this.emit(chosen);
    log.exit({ chosen });
  };

  private onCustomInput = (event: Event): void => {
    const log = contextLogger('po-pin-picker', 'onCustomInput');
    log.entry({ value: storedValue(this), mode: this.mode });
    if (selectValueForPin(storedValue(this), this.mode) !== CUSTOM_PIN_VALUE) {
      log.debug('branch: not in custom mode, ignoring', { value: storedValue(this) });
      log.exit('ignored');
      return;
    }
    const value = (event.target as HTMLInputElement).value;
    this.emit(value);
    log.exit({ value });
  };

  private emit(next: string): void {
    const log = contextLogger('po-pin-picker', 'emit');
    log.entry({ next, current: storedValue(this), mode: this.mode });
    const trimmed = next.trim();
    if (trimmed === storedValue(this)) {
      log.debug('branch: unchanged value, skipping dispatch', { trimmed });
      log.exit('unchanged');
      return;
    }
    if (
      trimmed !== '' &&
      isPresetPinForMode(trimmed, this.mode) &&
      this.usedPresets.has(trimmed)
    ) {
      log.debug('branch: preset already in use, skipping dispatch', { trimmed });
      log.exit('in-use');
      return;
    }
    this.dispatchEvent(
      new CustomEvent('pin-change', {
        detail: { value: trimmed },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit({ trimmed });
  }
}

function storedValue(picker: PoPinPicker): string {
  return picker.value.trim();
}

customElements.define('po-pin-picker', PoPinPicker);
