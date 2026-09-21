/**
 * One logical blade's `style =` line editor inside a preset.
 */
import { html, css, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { contextLogger } from '../../logger/index.js';
import { listConfigStyles } from '../../model/config-styles';
import {
  defaultArgsForStyle,
  getNamedStyle,
} from '../../model/style-catalog';
import {
  formatPresetStyleLine,
  presetSlotLabel,
  type PresetStyle,
} from '../../model/preset-styles';
import {
  decodePresetStylePickerValue,
  listPresetStylePickerOptions,
  presetStylePickerValue,
} from '../../model/style-picker';
import type { StyleSection } from '../../model/style-sections';
import { PoElement } from './po-element.js';
import { presetStyleRowI18n } from './po-preset-style-row.i18n.js';
import { presetStyleRowKeys } from './po-preset-style-row.keys.js';
import './po-color-input.js';

export class PoPresetStyleRow extends PoElement {
  static styles = [
    css`
      :host {
        display: block;
      }

      .style-row {
        border: 1px solid var(--wa-color-neutral-90, #e5e7eb);
        border-radius: var(--wa-border-radius-medium, 6px);
        padding: 0.75rem;
        margin-bottom: 0.75rem;
      }

      .style-row-header {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem 1rem;
        align-items: baseline;
        margin-bottom: 0.65rem;
      }

      .slot-label {
        font-weight: 600;
        font-size: 0.9rem;
      }

      .style-preview {
        font-family: ui-monospace, monospace;
        font-size: 0.8rem;
        opacity: 0.85;
        word-break: break-word;
      }

      .style-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(min(100%, 12rem), 1fr));
        gap: 0.65rem;
      }

      label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.8125rem;
        font-weight: 600;
        min-width: 0;
      }

      wa-select,
      wa-input {
        font-weight: normal;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .span-2 {
        grid-column: 1 / -1;
      }
    `,
  ];

  slotIndex = 0;
  slotCount = 1;
  presetStyle: PresetStyle = {
    kind: 'named',
    ref: 'standard',
    args: [],
    overrides: {},
    customLine: '',
  };

  /** Sections from the blade_styles.ini editor. */
  styleSections: StyleSection[] = [];

  private readonly recipeCatalog = listConfigStyles();

  static properties = {
    slotIndex: { type: Number, attribute: 'slot-index' },
    slotCount: { type: Number, attribute: 'slot-count' },
    presetStyle: { attribute: false },
    styleSections: { attribute: false },
  };

  render() {
    const preview = formatPresetStyleLine(this.presetStyle);
    const isCustom = this.presetStyle.kind === 'custom';
    return html`
      <div class="style-row">
        <div class="style-row-header">
          <span class="slot-label">${presetSlotLabel(this.slotIndex, this.slotCount)}</span>
          <code class="style-preview"
            >${presetStyleRowI18n.translate(presetStyleRowKeys.stylePreview, { preview })}</code
          >
        </div>
        <div class="style-grid">
          <label>
            ${presetStyleRowI18n.translate(presetStyleRowKeys.labelStyleMode)}
            <wa-select .value=${isCustom ? 'custom' : 'preset'} @wa-change=${this.onStyleModeChange}>
              <wa-option value="preset">${presetStyleRowI18n.translate(presetStyleRowKeys.optionPreset)}</wa-option>
              <wa-option value="custom">${presetStyleRowI18n.translate(presetStyleRowKeys.optionCustom)}</wa-option>
            </wa-select>
          </label>

          ${isCustom ? this.renderCustom() : this.renderPreset()}
        </div>
      </div>
    `;
  }

  private renderPresetStyleOptions() {
    const options = listPresetStylePickerOptions(this.styleSections, this.recipeCatalog);
    let lastGroup = '';
    const nodes: unknown[] = [];

    for (const option of options) {
      if (option.group !== lastGroup) {
        lastGroup = option.group;
        nodes.push(
          html`<wa-option disabled value="__g-${lastGroup}">${option.group}</wa-option>`,
        );
      }
      nodes.push(html`<wa-option value=${option.value}>${option.label}</wa-option>`);
    }

    return nodes;
  }

  private renderPreset() {
    const styleDef =
      this.presetStyle.kind === 'named' ? getNamedStyle(this.presetStyle.ref) : undefined;
    const pickerValue = presetStylePickerValue(this.presetStyle, this.styleSections);
    return html`
      <label class="span-2">
        ${presetStyleRowI18n.translate(presetStyleRowKeys.labelStyle)}
        <wa-select .value=${pickerValue} @wa-change=${this.onStylePickerChange}>
          ${this.renderPresetStyleOptions()}
        </wa-select>
      </label>
      ${this.presetStyle.kind === 'config'
        ? html`
            <label class="span-2">
              ${presetStyleRowI18n.translate(presetStyleRowKeys.labelOverrides)}
              <wa-input
                .value=${this.formatOverrides()}
                placeholder=${presetStyleRowI18n.translate(presetStyleRowKeys.placeholderOverrides)}
                @wa-change=${this.onOverridesChange}
              ></wa-input>
            </label>
          `
        : nothing}
      ${styleDef
        ? styleDef.args.map((arg, index) => html`
            <label>
              ${arg.label}
              ${arg.type === 'color'
                ? html`
                    <po-color-input
                      .value=${this.presetStyle.args[index] ?? arg.default}
                      @color-change=${(event: CustomEvent<{ value: string }>) =>
                        this.patchArg(index, event.detail.value)}
                    ></po-color-input>
                  `
                : html`
                    <wa-input
                      .value=${this.presetStyle.args[index] ?? arg.default}
                      @wa-input=${(event: Event) =>
                        this.patchArg(index, (event.target as HTMLInputElement).value)}
                    ></wa-input>
                  `}
            </label>
          `)
        : nothing}
    `;
  }

  private renderCustom() {
    return html`
      <label class="span-2">
        ${presetStyleRowI18n.translate(presetStyleRowKeys.labelCustomLine)}
        <wa-input
          .value=${this.presetStyle.customLine}
          placeholder=${presetStyleRowI18n.translate(presetStyleRowKeys.placeholderCustomLine)}
          @wa-input=${(event: Event) =>
            this.emitStyle({ ...this.presetStyle, customLine: (event.target as HTMLInputElement).value })}
        ></wa-input>
      </label>
    `;
  }

  private formatOverrides(): string {
    return Object.entries(this.presetStyle.overrides)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
  }

  private onStyleModeChange = (event: Event): void => {
    const log = contextLogger('po-preset-style-row', 'onStyleModeChange');
    const mode = (event.target as HTMLSelectElement).value;
    log.entry({ slotIndex: this.slotIndex, mode });
    if (mode === 'custom') {
      log.debug('branch: switch to custom', { slotIndex: this.slotIndex });
      this.emitStyle({
        kind: 'custom',
        ref: '',
        args: [],
        overrides: {},
        customLine: formatPresetStyleLine(this.presetStyle),
      });
      log.exit();
      return;
    }

    log.debug('branch: switch to preset', { slotIndex: this.slotIndex });
    this.emitStyle({
      kind: 'named',
      ref: 'standard',
      args: defaultArgsForStyle('standard'),
      overrides: {},
      customLine: '',
    });
    log.exit();
  };

  private onStylePickerChange = (event: Event): void => {
    const log = contextLogger('po-preset-style-row', 'onStylePickerChange');
    const value = (event.target as HTMLSelectElement).value;
    log.entry({ slotIndex: this.slotIndex, value });
    const decoded = decodePresetStylePickerValue(value);
    if (!decoded) {
      log.debug('branch: undecodable picker value', { value });
      log.exit();
      return;
    }

    if (decoded.source === 'named') {
      log.debug('branch: named style selected', { ref: decoded.ref });
      this.emitStyle({
        kind: 'named',
        ref: decoded.ref,
        args: defaultArgsForStyle(decoded.ref),
        overrides: {},
        customLine: '',
      });
      log.exit();
      return;
    }

    if (decoded.source === 'library') {
      log.debug('branch: library recipe selected', { recipeId: decoded.ref });
      this.dispatchEvent(
        new CustomEvent('preset-library-recipe-selected', {
          detail: { recipeId: decoded.ref },
          bubbles: true,
          composed: true,
        }),
      );
    } else {
      log.debug('branch: config style selected', { ref: decoded.ref });
    }

    this.emitStyle({
      kind: 'config',
      ref: decoded.ref,
      args: [],
      overrides: this.presetStyle.kind === 'config' ? { ...this.presetStyle.overrides } : {},
      customLine: '',
    });
    log.exit();
  };

  private onOverridesChange = (event: Event): void => {
    const log = contextLogger('po-preset-style-row', 'onOverridesChange');
    const text = (event.target as HTMLInputElement).value.trim();
    log.entry({ slotIndex: this.slotIndex, textLength: text.length });
    const overrides: Record<string, string> = {};
    for (const token of text.split(/\s+/)) {
      const eq = token.indexOf('=');
      if (eq > 0) {
        log.debug('branch: parse override token', { key: token.slice(0, eq) });
        overrides[token.slice(0, eq)] = token.slice(eq + 1);
      } else if (token.length > 0) {
        log.debug('branch: skip invalid override token', { token });
      }
    }
    this.emitStyle({ ...this.presetStyle, kind: 'config', overrides });
    log.exit({ overrideCount: Object.keys(overrides).length });
  };

  private patchArg(index: number, value: string): void {
    const log = contextLogger('po-preset-style-row', 'patchArg');
    log.entry({ slotIndex: this.slotIndex, index, value });
    const args = [...this.presetStyle.args];
    while (args.length <= index) {
      log.debug('branch: pad args array', { targetLength: index + 1 });
      args.push('');
    }
    args[index] = value;
    this.emitStyle({ ...this.presetStyle, kind: 'named', args });
    log.exit({ argCount: args.length });
  }

  private emitStyle(style: PresetStyle): void {
    const log = contextLogger('po-preset-style-row', 'emitStyle');
    log.entry({ slotIndex: this.slotIndex, kind: style.kind, ref: style.ref });
    this.dispatchEvent(
      new CustomEvent('preset-style-change', {
        detail: { slotIndex: this.slotIndex, style },
        bubbles: true,
        composed: true,
      }),
    );
    log.exit();
  }
}

customElements.define('po-preset-style-row', PoPresetStyleRow);
