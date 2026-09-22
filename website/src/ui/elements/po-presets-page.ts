/**
 * Presets editor — `config/presets.ini`.
 *
 * Route: `#/presets`.
 *
 * @module ui/elements/po-presets-page
 */
import { html, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { contextLogger } from '../../logger/index.js';
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
} from '../../stores/presets';
import { $styleSections, configStyleAdded } from '../../stores/styleSections';
import { $wiring } from '../../stores/wiring';
import { MAX_PRESETS } from '../../validation/limits';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { presetsPageI18n } from './po-presets-page.i18n.js';
import { presetsPageKeys } from './po-presets-page.keys.js';
import { poPresetsPageStyles } from './po-presets-page.styles.js';
import { poConfigFormStyles, poHostStyles, poPageStyles } from './po-shared-styles.js';
import './po-preset-style-row.js';

export class PoPresetsPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poConfigFormStyles, poPresetsPageStyles];

  private readonly presetsController = new EffectorController(this, $presets);
  private readonly stylesController = new EffectorController(this, $styleSections);
  private readonly wiringController = new EffectorController(this, $wiring);

  /**
   * Renders metadata fields and per-slot style rows for one preset.
   *
   * @param preset Active preset definition being edited.
   * @param slotCount Number of logical blade slots from current wiring.
   * @param styleSections Available style recipe sections from the styles editor.
   * @returns Lit template for preset fields and `po-preset-style-row` children.
   */
  private renderPresetForm(
    preset: NonNullable<ReturnType<typeof getActivePreset>>,
    slotCount: number,
    styleSections: import('../../model/style-sections').StyleSection[],
  ) {
    return html`
      <div class="form-grid">
        <label>
          ${presetsPageI18n.translate(presetsPageKeys.labelFont)}
          <wa-input
            .value=${preset.font}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { font: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          ${presetsPageI18n.translate(presetsPageKeys.labelTrack)}
          <wa-input
            .value=${preset.track}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { track: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          ${presetsPageI18n.translate(presetsPageKeys.labelPresetName)}
          <wa-input
            .value=${preset.name}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { name: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
        <label>
          ${presetsPageI18n.translate(presetsPageKeys.labelVariation)}
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
          ${presetsPageI18n.translate(presetsPageKeys.labelComment)}
          <wa-input
            .value=${preset.comment ?? ''}
            @wa-input=${(event: Event) =>
              this.patchPreset(preset.id, { comment: (event.target as HTMLInputElement).value })}
          ></wa-input>
        </label>
      </div>

      <p class="vars-heading">${presetsPageI18n.translate(presetsPageKeys.headingStyleLines)}</p>
      ${preset.styles.map(
        (style, index) => html`
          <po-preset-style-row
            slot-index=${index}
            slot-count=${slotCount}
            .presetStyle=${style}
            .styleSections=${styleSections}
            @preset-style-change=${this.onStyleChange}
            @preset-library-recipe-selected=${this.onLibraryRecipeSelected}
          ></po-preset-style-row>
        `,
      )}
    `;
  }

  /**
   * Switches the active preset when the user picks one from the dropdown.
   *
   * @param event Change event from the preset `<wa-select>`.
   * @returns Nothing; dispatches `activePresetChanged`.
   */
  private onPresetSelect = (event: Event): void => {
    const log = contextLogger('po-presets-page', 'onPresetSelect');
    const presetId = (event.target as HTMLSelectElement).value;
    log.entry({ presetId });
    activePresetChanged(presetId);
    log.exit();
  };

  /**
   * Applies a partial update to one preset in the store.
   *
   * @param id Preset id to update.
   * @param patch Fields to merge into the preset definition (excluding id).
   * @returns Nothing; dispatches `presetUpdated`.
   */
  private patchPreset(
    id: string,
    patch: Partial<Omit<import('../../model/presets').PresetDefinition, 'id'>>,
  ): void {
    const log = contextLogger('po-presets-page', 'patchPreset');
    log.entry({ id, patchKeys: Object.keys(patch) });
    presetUpdated({ id, patch });
    log.exit();
  }

  /**
   * Ensures a library recipe referenced by a preset style row exists in style sections.
   *
   * @param event Custom event from `po-preset-style-row` with the selected recipe id.
   * @returns Nothing; may dispatch `configStyleAdded` when the recipe is missing.
   */
  private onLibraryRecipeSelected = (
    event: CustomEvent<{ recipeId: string }>,
  ): void => {
    const log = contextLogger('po-presets-page', 'onLibraryRecipeSelected');
    const recipeId = event.detail.recipeId;
    log.entry({ recipeId });
    const sections = this.stylesController.value.sections;
    if (!sections.some((section) => section.id === recipeId)) {
      log.debug('branch: add missing library recipe', { recipeId });
      configStyleAdded(recipeId);
    } else {
      log.debug('branch: recipe already in sections', { recipeId });
    }
    log.exit();
  };

  /**
   * Persists a style-line edit from a child preset style row to the active preset.
   *
   * @param event Custom event carrying slot index and updated preset style.
   * @returns Nothing; dispatches `presetStyleUpdated` when a preset is active.
   */
  private onStyleChange = (event: CustomEvent<{ slotIndex: number; style: import('../../model/preset-styles').PresetStyle }>): void => {
    const log = contextLogger('po-presets-page', 'onStyleChange');
    log.entry({ slotIndex: event.detail.slotIndex, kind: event.detail.style.kind });
    const preset = getActivePreset(this.presetsController.value);
    if (!preset) {
      log.debug('branch: no active preset — skip update');
      log.exit();
      return;
    }
    log.debug('branch: update preset style', { presetId: preset.id, slotIndex: event.detail.slotIndex });
    presetStyleUpdated({
      presetId: preset.id,
      slotIndex: event.detail.slotIndex,
      style: event.detail.style,
    });
    log.exit();
  };

  /**
   * Renders the presets editor with toolbar, active preset form, and style rows.
   *
   * @returns Lit template for the full presets.ini editor page.
   */
  render() {
    const presetsState = this.presetsController.value;
    const styleSections = this.stylesController.value.sections;
    const slotCount = totalLogicalBladeSlots(this.wiringController.value);
    const preset = getActivePreset(presetsState);
    const presetCount = presetsState.presets.length;
    return html`
      <section class="page" data-testid="presets-page">
        <h2>${presetsPageI18n.translate(presetsPageKeys.title)}</h2>
        <p class="config-lead">${presetsPageI18n.translate(presetsPageKeys.lead)}</p>
        <details class="presets-help">
          <summary>${presetsPageI18n.translate(presetsPageKeys.helpSummary)}</summary>
          <ul>
            <li>${presetsPageI18n.translate(presetsPageKeys.helpBladeCount, { slotCount })}</li>
            <li>${presetsPageI18n.translate(presetsPageKeys.helpConfigRecipe)}</li>
            <li>${presetsPageI18n.translate(presetsPageKeys.helpOverrides)}</li>
            <li>${presetsPageI18n.translate(presetsPageKeys.helpAccents)}</li>
          </ul>
        </details>

        <wa-card>
          <div class="section-toolbar" data-testid="presets-page-toolbar">
            <label>
              ${presetsPageI18n.translate(presetsPageKeys.labelPreset)}
              <wa-select
                data-testid="presets-page-preset-select"
                .value=${presetsState.activePresetId}
                @wa-change=${this.onPresetSelect}
              >
                ${presetsState.presets.map(
                  (row) => html`
                    <wa-option value=${row.id}>${row.name || row.id}</wa-option>
                  `,
                )}
              </wa-select>
            </label>
            <wa-button variant="brand" ?disabled=${presetCount >= MAX_PRESETS} @click=${presetAdded}>
              ${presetsPageI18n.translate(presetsPageKeys.addPreset)}
            </wa-button>
            <wa-button
              variant="neutral"
              ?disabled=${!preset}
              @click=${() => preset && presetDuplicated(preset.id)}
            >
              ${presetsPageI18n.translate(presetsPageKeys.duplicate)}
            </wa-button>
            <wa-button
              variant="neutral"
              ?disabled=${presetCount <= 1}
              @click=${() => preset && presetRemoved(preset.id)}
            >
              ${presetsPageI18n.translate(presetsPageKeys.remove)}
            </wa-button>
            <wa-button variant="neutral" @click=${presetsResetToDefaults}>
              ${presetsPageI18n.translate(presetsPageKeys.reset)}
            </wa-button>
          </div>

          ${preset ? this.renderPresetForm(preset, slotCount, styleSections) : nothing}
        </wa-card>

        <p class="hint">
          ${presetsPageI18n.translate(presetsPageKeys.hintFooter, {
            presetCount,
            presetSuffix: presetCount === 1 ? '' : 's',
            slotCount,
            styleSuffix: slotCount === 1 ? '' : 's',
          })}
        </p>
      </section>
    `;
  }
}

customElements.define('po-presets-page', PoPresetsPage);
