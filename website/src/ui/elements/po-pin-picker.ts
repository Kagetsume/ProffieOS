/**
 * Single power pin picker — Web Awesome `wa-select` + optional custom input.
 *
 * Uses Light DOM so `wa-option` children behave per Web Awesome docs.
 * Options are created once; disabled state toggles via property updates.
 *
 * @fires pin-change - `{ value: string }` when the committed pin changes
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import {
  CUSTOM_PIN_VALUE,
  initPinSelectOptions,
  selectValueForPin,
} from './pin-picker-utils';
import { isPresetPowerPin } from '../../model/power-pins';

type WaSelectElement = HTMLElement & { value: string };
type WaInputElement = HTMLElement & { value: string };

export class PoPinPicker extends LitElement {
  static properties = {
    value: { type: String },
    usedPresets: { attribute: false },
  };

  value = '';
  usedPresets: ReadonlySet<string> = new Set();

  private committed = '';
  private bound = false;

  /** Light DOM — required for Web Awesome form controls. */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    return html`
      <div class="pin-picker">
        <wa-select
          class="pin-picker-select"
          placeholder="Select power pin…"
        ></wa-select>
        <wa-input
          class="pin-picker-custom pin-picker-custom--hidden"
          placeholder="e.g. 20 or bladePin"
        ></wa-input>
      </div>
    `;
  }

  override updated(changed: Map<string, unknown>): void {
    if (!this.bound) {
      this.bindControls();
      this.bound = true;
    }

    if (changed.has('value')) {
      this.committed = this.value.trim();
      this.syncControls();
    }

    if (changed.has('usedPresets') || changed.has('value')) {
      this.refreshOptions();
    }
  }

  private get select(): WaSelectElement {
    return this.querySelector('wa-select.pin-picker-select')!;
  }

  private get custom(): WaInputElement {
    return this.querySelector('.pin-picker-custom')!;
  }

  private refreshOptions(): void {
    initPinSelectOptions(
      this.select as WaSelectElement & { placeholder: string; dataset: DOMStringMap },
      this.usedPresets,
    );
  }

  private setCustomVisible(visible: boolean): void {
    this.custom.classList.toggle('pin-picker-custom--hidden', !visible);
  }

  private syncControls(): void {
    if (!this.select) {
      return;
    }
    const expected = selectValueForPin(this.committed);
    if (this.select.value !== expected) {
      this.select.value = expected;
    }
    this.setCustomVisible(expected === CUSTOM_PIN_VALUE);
    if (expected === CUSTOM_PIN_VALUE) {
      this.custom.value = this.committed;
    }
  }

  private commit(next: string): void {
    const trimmed = next.trim();
    if (trimmed === this.committed) {
      this.syncControls();
      return;
    }
    if (trimmed !== '' && isPresetPowerPin(trimmed) && this.usedPresets.has(trimmed)) {
      this.syncControls();
      return;
    }
    this.committed = trimmed;
    this.dispatchEvent(
      new CustomEvent('pin-change', {
        detail: { value: trimmed },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private bindControls(): void {
    this.committed = this.value.trim();
    this.refreshOptions();
    this.syncControls();

    this.select.addEventListener('wa-show', () => {
      this.refreshOptions();
    });

    this.select.addEventListener('change', () => {
      const chosen = this.select.value;
      if (chosen === CUSTOM_PIN_VALUE) {
        this.setCustomVisible(true);
        this.commit(this.custom.value);
        this.custom.focus();
        return;
      }
      this.setCustomVisible(false);
      this.commit(chosen);
    });

    this.custom.addEventListener('wa-input', () => {
      if (this.select.value === CUSTOM_PIN_VALUE) {
        this.commit(this.custom.value);
      }
    });
  }
}

customElements.define('po-pin-picker', PoPinPicker);
