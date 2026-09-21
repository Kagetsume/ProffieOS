/**
 * Color picker — firmware named colors with swatch, plus custom hex or r,g,b.
 *
 * @fires color-change - `{ value: string }` when the committed color changes
 */
import { LitElement, html } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import {
  CUSTOM_COLOR_VALUE,
  colorToCss,
  listColorGroups,
  normalizeColorValue,
  selectValueForColor,
} from '../../model/colors';
import { contextLogger } from '../../logger/index.js';
import { colorInputI18n } from './po-color-input.i18n.js';
import { colorInputKeys } from './po-color-input.keys.js';

export class PoColorInput extends LitElement {
  static properties = {
    value: { type: String },
    customMode: { type: Boolean, state: true },
  };

  value = '';
  private customMode = false;

  /** Light DOM — required for Web Awesome form controls. */
  protected createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  render() {
    const committed = this.value.trim();
    const swatch = colorToCss(committed);
    const selectValue = this.customMode
      ? CUSTOM_COLOR_VALUE
      : selectValueForColor(committed);
    const customVisible = selectValue === CUSTOM_COLOR_VALUE;

    return html`
      <style>
        :host {
          display: block;
          min-width: 0;
          flex: 1 1 auto;
        }

        .color-input {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          min-width: 0;
        }

        .color-swatch,
        .color-select-swatch,
        .color-option-swatch {
          flex: 0 0 auto;
          width: 1.35rem;
          height: 1.35rem;
          border-radius: 0.25rem;
          border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
          box-sizing: border-box;
        }

        .color-select-swatch {
          width: 1.1rem;
          height: 1.1rem;
        }

        .color-option {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .color-option-swatch {
          width: 1rem;
          height: 1rem;
        }

        .color-option-swatch--custom {
          background: linear-gradient(
            135deg,
            #888 0 45%,
            transparent 45% 55%,
            #888 55% 100%
          ) !important;
        }

        wa-select {
          flex: 1 1 8rem;
          min-width: 0;
        }

        .color-custom {
          flex: 1 1 7rem;
          min-width: 0;
        }

        .color-custom--hidden {
          display: none;
        }
      </style>
      <div class="color-input">
        <span class="color-swatch" style="background: ${swatch}" aria-hidden="true"></span>
        <wa-select
          class="color-select"
          placeholder=${colorInputI18n.translate(colorInputKeys.placeholderColor)}
          .value=${selectValue}
          @change=${this.onSelectChange}
        >
          <span slot="start" class="color-select-swatch" style="background: ${swatch}"></span>
          ${listColorGroups().flatMap((group) => [
            html`<wa-option disabled value="__group-${group.id}">${group.label}</wa-option>`,
            ...group.colors.map(
              (color) => html`
                <wa-option value=${color.name}>
                  <span class="color-option">
                    <span
                      class="color-option-swatch"
                      style="background: rgb(${color.r}, ${color.g}, ${color.b})"
                    ></span>
                    <span class="color-option-name">${color.name}</span>
                  </span>
                </wa-option>
              `,
            ),
          ])}
          <wa-option value=${CUSTOM_COLOR_VALUE}>
            <span class="color-option">
              <span class="color-option-swatch color-option-swatch--custom"></span>
              <span class="color-option-name">${colorInputI18n.translate(colorInputKeys.optionCustom)}</span>
            </span>
          </wa-option>
        </wa-select>
        <wa-input
          class="color-custom ${customVisible ? '' : 'color-custom--hidden'}"
          placeholder=${colorInputI18n.translate(colorInputKeys.placeholderCustom)}
          .value=${customVisible ? committed : ''}
          @wa-change=${this.onCustomChange}
        ></wa-input>
      </div>
    `;
  }

  private onSelectChange = (event: Event): void => {
    const log = contextLogger('po-color-input', 'onSelectChange');
    const chosen = (event.target as HTMLSelectElement).value;
    log.entry({ chosen });
    if (chosen === CUSTOM_COLOR_VALUE) {
      log.debug('branch: custom color selected', { chosen });
      this.customMode = true;
      this.commit(this.value.trim());
      this.updateComplete.then(() => {
        this.renderRoot.querySelector<HTMLElement & { focus(): void }>('.color-custom')?.focus();
      });
      log.exit('custom');
      return;
    }
    this.customMode = false;
    this.commit(chosen);
    log.exit({ chosen });
  };

  private onCustomChange = (event: Event): void => {
    const log = contextLogger('po-color-input', 'onCustomChange');
    log.entry({ customMode: this.customMode });
    if (!this.customMode) {
      log.debug('branch: not in custom mode, ignoring', { customMode: this.customMode });
      log.exit('ignored');
      return;
    }
    const value = (event.target as HTMLInputElement).value;
    this.commit(value);
    log.exit({ value });
  };

  private commit(next: string): void {
    const log = contextLogger('po-color-input', 'commit');
    log.entry({ next, current: this.value.trim() });
    const normalized = normalizeColorValue(next);
    if (normalized === this.value.trim()) {
      log.debug('branch: unchanged value, skipping dispatch', { normalized });
      log.exit('unchanged');
      return;
    }
    this.dispatchEvent(
      new CustomEvent('color-change', {
        detail: { value: normalized },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit({ normalized });
  }
}

customElements.define('po-color-input', PoColorInput);
