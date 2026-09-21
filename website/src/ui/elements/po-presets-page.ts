/**
 * Presets editor — `config/presets.ini`.
 *
 * Route: `#/presets`.
 *
 * @module ui/elements/po-presets-page
 */
import { html, css, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { totalLogicalBladeSlots } from '../../model/sub-blades';
import {
  $presets,
  activePresetChanged,
  getActivePreset,
  presetAdded,
  presetDuplicated,
  presetRemoved,
  presetStyleUpdated,
  presetUpdated,
  presetsResetToDefaults,
  type PresetsState,
} from '../../stores/presets';
import { $styleSections } from '../../stores/styleSections';
import { $wiring } from '../../stores/wiring';
import { MAX_PRESETS } from '../../validation/limits';
import { PoElement } from './po-element.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';
import './po-preset-style-row.js';

export class PoPresetsPage extends PoElement {
  static styles = [
    poHostStyles,
    poPageStyles,
    poConfigFormStyles,
    css`
      .section-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: end;
        margin-bottom: 1rem;
      }

      .section-toolbar label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        min-width: min(100%, 14rem);
        flex: 1;
      }

      .section-toolbar wa-select {
        width: 100%;
        min-width: 0;
        font-weight: normal;
      }

      .vars-heading {
        margin: 1.25rem 0 0.5rem;
        font-weight: 600;
        font-size: 0.9375rem;
      }

      .form-grid .span-2 {
        grid-column: 1 / -1;
        max-width: 42rem;
      }

      .presets-help {
        max-width: 65ch;
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        border: 1px solid var(--wa-color-neutral-90, #e5e7eb);
        border-radius: var(--wa-border-radius-medium, 6px);
        font-size: 0.9375rem;
        line-height: 1.45;
      }

      .presets-help summary {
        cursor: pointer;
        font-weight: 600;
      }

      .presets-help ul {
        margin: 0.5rem 0;
        padding-left: 1.25rem;
      }
    `,
  ];

  private presetsState: PresetsState = $presets.getState();
  private sectionIds: string[] = $styleSections.getState().sections.map((section) => section.id);
  private slotCount = totalLogicalBladeSlots($wiring.getState());

  private unwatchPresets?: () => void;
  private unwatchStyles?: () => void;
  private unwatchWiring?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    this.unwatchPresets = $presets.watch((state) => {
      this.presetsState = state;
      this.requestUpdate();
    });
    this.unwatchStyles = $styleSections.watch((state) => {
      this.sectionIds = state.sections.map((section) => section.id);
      this.requestUpdate();
    });
    this.unwatchWiring = $wiring.watch((blades) => {
      this.slotCount = totalLogicalBladeSlots(blades);
      this.requestUpdate();
    });
  }

  disconnectedCallback(): void {
    this.unwatchPresets?.();
    this.unwatchStyles?.();
    this.unwatchWiring?.();
    super.disconnectedCallback();
  }

  render() {
    const preset = getActivePreset(this.presetsState);
    const presetCount = this.presetsState.presets.length;

    return html`
      <section class="page">
        <h2>Presets</h2>
        <p class="config-lead">
          Edit <code>config/presets.ini</code>. Each preset sets font, track, display name, and one
          <code>style =</code> line per logical blade. Use <strong>Config recipe</strong> to reference
          sections from <code>blade_styles.ini</code>, or pick a <strong>Named style</strong> directly.
        </p>
        <details class="presets-help">
          <summary>How presets connect to blades and styles</summary>
          <ul>
            <li>
              <strong>Blade count</strong> — must match logical blades from the Blades page and
              firmware <code>NUM_BLADES</code> (currently ${this.slotCount}).
            </li>
            <li>
              <strong>Config recipe</strong> — <code>style = config smoke_blade</code> loads the
              <code>[smoke_blade]</code> section from <code>blade_styles.ini</code>.
            </li>
            <li>
              <strong>Overrides</strong> — <code>style = config with_vars base=magenta</code> replaces
              <code>{{base}}</code> for that preset only.
            </li>
            <li>
              <strong>Accents</strong> — blades 2–4 on a five-blade build typically use
              <code>accent_*</code> named styles (PWM outputs in <code>blades.ini</code>).
            </li>
          </ul>
        </details>

        <wa-card>
          <div class="section-toolbar">
            <label>
              Preset
              <wa-select
                .value=${this.presetsState.activePresetId}
                @wa-change=${this.onPresetSelect}
              >
                ${this.presetsState.presets.map(
                  (row) => html`
                    <wa-option value=${row.id}>${row.name || row.id}</wa-option>
                  `,
                )}
              </wa-select>
            </label>
            <wa-button variant="brand" ?disabled=${presetCount >= MAX_PRESETS} @click=${presetAdded}>
              Add preset
            </wa-button>
            <wa-button
              variant="neutral"
              ?disabled=${!preset}
              @click=${() => preset && presetDuplicated(preset.id)}
            >
              Duplicate
            </wa-button>
            <wa-button
              variant="neutral"
              ?disabled=${presetCount <= 1}
              @click=${() => preset && presetRemoved(preset.id)}
            >
              Remove
            </wa-button>
            <wa-button variant="neutral" @click=${presetsResetToDefaults}>
              Reset to defaults
            </wa-button>
          </div>

          ${preset ? this.renderPresetForm(preset) : nothing}
        </wa-card>

        <p class="hint">
          ${presetCount} preset${presetCount === 1 ? '' : 's'} · ${this.slotCount} style line${this.slotCount === 1 ? '' : 's'} each · Export on the Export page.
        </p>
      </section>
    `;
  }

  private renderPresetForm(preset: NonNullable<ReturnType<typeof getActivePreset>>) {
    return html`
      <div class="form-grid">
        <label>
          Font
          <wa-input
            .value=${preset.font}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { font: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          Track
          <wa-input
            .value=${preset.track}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { track: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          Preset name
          <wa-input
            .value=${preset.name}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { name: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          Variation
          <wa-input
            type="number"
            min="0"
            .value=${String(preset.variation)}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, {
                variation: Number((event.target as HTMLInputElement).value) || 0,
              })}
          ></wa-input>
        </label>
        <label class="span-2">
          Note (optional, exported as comment)
          <wa-input
            .value=${preset.comment ?? ''}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { comment: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
      </div>

      <p class="vars-heading">Style lines — one per logical blade</p>
      ${preset.styles.map(
        (style, index) => html`
          <po-preset-style-row
            slot-index=${index}
            slot-count=${this.slotCount}
            .presetStyle=${style}
            .sectionIds=${this.sectionIds}
            @preset-style-change=${this.onStyleChange}
          ></po-preset-style-row>
        `,
      )}
    `;
  }

  private onPresetSelect = (event: Event): void => {
    activePresetChanged((event.target as HTMLSelectElement).value);
  };

  private patchPreset(
    id: string,
    patch: Partial<Omit<import('../../model/presets').PresetDefinition, 'id'>>,
  ): void {
    presetUpdated({ id, patch });
  }

  private onStyleChange = (event: CustomEvent<{ slotIndex: number; style: import('../../model/preset-styles').PresetStyle }>): void => {
    const preset = getActivePreset(this.presetsState);
    if (!preset) {
      return;
    }
    presetStyleUpdated({
      presetId: preset.id,
      slotIndex: event.detail.slotIndex,
      style: event.detail.style,
    });
  };
}

customElements.define('po-presets-page', PoPresetsPage);
