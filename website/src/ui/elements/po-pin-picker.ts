/**
 * Board pin picker — Web Awesome `wa-select` + optional custom input.
 *
 * Supports power FET pins (`mode=power`) and blade data/Free pins (`mode=data`).
 * Options are rendered declaratively so Lit re-renders keep selection + disabled state.
 *
 * @fires pin-change - `{ value: string }` when the committed pin changes
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { registerPowerPinEditorRefresh } from '../../stores/power-pin-usage';
import {
  CUSTOM_PIN_VALUE,
  isPresetPinForMode,
  pinCatalogForMode,
  placeholderForMode,
  selectValueForPin,
  type PinPickerMode,
} from './pin-picker-utils';

export class PoPinPicker extends LitElement {
  static properties = {
    value: { type: String },
    usedPresets: { attribute: false },
    mode: { type: String, attribute: 'mode' },
  };

  value = '';
  usedPresets: ReadonlySet<string> = new Set();
  mode: PinPickerMode = 'power';

  private unwatchWiring?: () => void;

  /** Light DOM — required for Web Awesome form controls. */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.unwatchWiring = registerPowerPinEditorRefresh(() => {
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    this.unwatchWiring?.();
    this.unwatchWiring = undefined;
    super.disconnectedCallback();
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
          placeholder=${placeholderForMode(this.mode)}
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
                  ? `${entry.label} (in use)`
                  : entry.label}
              </wa-option>
            `,
          )}
          <wa-option value=${CUSTOM_PIN_VALUE}
            >Custom (type pin name or number)</wa-option
          >
        </wa-select>
        <wa-input
          class="pin-picker-custom ${showCustom ? '' : 'pin-picker-custom--hidden'}"
          .value=${showCustom ? stored : ''}
          placeholder="e.g. 20 or bladePin"
          @wa-input=${this.onCustomInput}
        ></wa-input>
      </div>
    `;
  }

  private onSelectChange = (event: Event): void => {
    const chosen = (event.target as HTMLSelectElement & { value: string }).value;
    if (chosen === CUSTOM_PIN_VALUE) {
      this.emit(isPresetPinForMode(storedValue(this), this.mode) ? '' : storedValue(this));
      return;
    }
    this.emit(chosen);
  };

  private onCustomInput = (event: Event): void => {
    if (selectValueForPin(storedValue(this), this.mode) !== CUSTOM_PIN_VALUE) {
      return;
    }
    this.emit((event.target as HTMLInputElement).value);
  };

  private emit(next: string): void {
    const trimmed = next.trim();
    if (trimmed === storedValue(this)) {
      return;
    }
    if (
      trimmed !== '' &&
      isPresetPinForMode(trimmed, this.mode) &&
      this.usedPresets.has(trimmed)
    ) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent('pin-change', {
        detail: { value: trimmed },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

function storedValue(picker: PoPinPicker): string {
  return picker.value.trim();
}

customElements.define('po-pin-picker', PoPinPicker);
