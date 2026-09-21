/**
 * One logical blade's `style =` line editor inside a preset.
 */
import { html, css, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import {
  defaultArgsForStyle,
  getNamedStyle,
  listStyleGroups,
  listStylesInGroup,
  stylePickerLabel,
} from '../../model/style-catalog';
import {
  formatPresetStyleLine,
  presetSlotLabel,
  type PresetStyle,
  type PresetStyleKind,
} from '../../model/preset-styles';
import { PoElement } from './po-element.js';
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

  /** Config section ids from the active blade_styles.ini file. */
  sectionIds: string[] = [];

  static properties = {
    slotIndex: { type: Number, attribute: 'slot-index' },
    slotCount: { type: Number, attribute: 'slot-count' },
    presetStyle: { attribute: false },
    sectionIds: { attribute: false },
  };

  render() {
    const preview = formatPresetStyleLine(this.presetStyle);
    return html`
      <div class="style-row">
        <div class="style-row-header">
          <span class="slot-label">${presetSlotLabel(this.slotIndex, this.slotCount)}</span>
          <code class="style-preview">style = ${preview}</code>
        </div>
        <div class="style-grid">
          <label>
            Style type
            <wa-select .value=${this.presetStyle.kind} @wa-change=${this.onKindChange}>
              <wa-option value="named">Named style</wa-option>
              <wa-option value="config">Config recipe</wa-option>
              <wa-option value="custom">Custom line</wa-option>
            </wa-select>
          </label>

          ${this.presetStyle.kind === 'named' ? this.renderNamed() : nothing}
          ${this.presetStyle.kind === 'config' ? this.renderConfig() : nothing}
          ${this.presetStyle.kind === 'custom' ? this.renderCustom() : nothing}
        </div>
      </div>
    `;
  }

  private renderNamedStyleOptions() {
    let lastGroup = '';
    const nodes: unknown[] = [];

    for (const group of listStyleGroups()) {
      if (group.id === 'texture' || group.id === 'preon') {
        continue;
      }
      if (group.label !== lastGroup) {
        lastGroup = group.label;
        nodes.push(html`<wa-option disabled value="__g-${group.id}">${group.label}</wa-option>`);
      }
      for (const style of listStylesInGroup(group.id)) {
        nodes.push(html`<wa-option value=${style.id}>${stylePickerLabel(style)}</wa-option>`);
      }
    }

    return nodes;
  }

  private renderNamed() {
    const styleDef = getNamedStyle(this.presetStyle.ref);

    return html`
      <label>
        Named style
        <wa-select .value=${this.presetStyle.ref} @wa-change=${this.onNamedStyleChange}>
          ${this.renderNamedStyleOptions()}
        </wa-select>
      </label>
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

  private renderConfig() {
    return html`
      <label>
        Recipe section
        <wa-select .value=${this.presetStyle.ref} @wa-change=${this.onConfigSectionChange}>
          ${this.sectionIds.length === 0
            ? html`<wa-option value="">(no sections — add on Blade styles page)</wa-option>`
            : this.sectionIds.map(
                (id) => html`<wa-option value=${id}>${id}</wa-option>`,
              )}
        </wa-select>
      </label>
      <label class="span-2">
        Overrides (optional)
        <wa-input
          .value=${this.formatOverrides()}
          placeholder="base=magenta clash=yellow"
          @wa-change=${this.onOverridesChange}
        ></wa-input>
      </label>
    `;
  }

  private renderCustom() {
    return html`
      <label class="span-2">
        Style line (without “style =”)
        <wa-input
          .value=${this.presetStyle.customLine}
          placeholder="standard cyan white 300 800"
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

  private onKindChange = (event: Event): void => {
    const kind = (event.target as HTMLSelectElement).value as PresetStyleKind;
    if (kind === 'named') {
      this.emitStyle({
        kind,
        ref: 'standard',
        args: defaultArgsForStyle('standard').slice(0, 4),
        overrides: {},
        customLine: '',
      });
      return;
    }
    if (kind === 'config') {
      this.emitStyle({
        kind,
        ref: this.sectionIds[0] ?? 'smoke_blade',
        args: [],
        overrides: {},
        customLine: '',
      });
      return;
    }
    this.emitStyle({
      kind: 'custom',
      ref: '',
      args: [],
      overrides: {},
      customLine: formatPresetStyleLine(this.presetStyle),
    });
  };

  private onNamedStyleChange = (event: Event): void => {
    const ref = (event.target as HTMLSelectElement).value;
    this.emitStyle({
      ...this.presetStyle,
      kind: 'named',
      ref,
      args: defaultArgsForStyle(ref),
    });
  };

  private onConfigSectionChange = (event: Event): void => {
    this.emitStyle({
      ...this.presetStyle,
      kind: 'config',
      ref: (event.target as HTMLSelectElement).value,
    });
  };

  private onOverridesChange = (event: Event): void => {
    const text = (event.target as HTMLInputElement).value.trim();
    const overrides: Record<string, string> = {};
    for (const token of text.split(/\s+/)) {
      const eq = token.indexOf('=');
      if (eq > 0) {
        overrides[token.slice(0, eq)] = token.slice(eq + 1);
      }
    }
    this.emitStyle({ ...this.presetStyle, overrides });
  };

  private patchArg(index: number, value: string): void {
    const args = [...this.presetStyle.args];
    while (args.length <= index) {
      args.push('');
    }
    args[index] = value;
    this.emitStyle({ ...this.presetStyle, args });
  }

  private emitStyle(style: PresetStyle): void {
    this.dispatchEvent(
      new CustomEvent('preset-style-change', {
        detail: { slotIndex: this.slotIndex, style },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define('po-preset-style-row', PoPresetStyleRow);
