/**
 * Blade styles editor — layer recipes (left) + upward saber preview (right).
 *
 * Route: `#/styles`. User guide: `website/BLADE_STYLES.md`.
 *
 * @module ui/elements/po-styles-page
 */
import { html, css, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { listConfigStyles } from '../../model/config-styles';
import {
  decodeStylePickerValue,
  encodeFileRecipe,
  listRecipePickerOptions,
  recipeDescription,
  summarizeRecipeLayers,
} from '../../model/style-picker';
import { baseSectionVarEntries, type StyleSection } from '../../model/style-sections';
import {
  $styleSections,
  activeSectionChanged,
  getActiveSection,
  sectionVarAdded,
  sectionVarChanged,
  sectionVarRemoved,
  styleLayerAdded,
  styleSectionAdded,
  styleSectionRemoved,
  configStyleAdded,
  type StyleSectionsState,
} from '../../stores/styleSections';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { stylesPageI18n } from './po-styles-page.i18n.js';
import { stylesPageKeys } from './po-styles-page.keys.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';
import './po-blade-preview.js';
import './po-color-input.js';
import './po-style-layer-stack.js';

export class PoStylesPage extends PoElement {
  static styles = [
    poHostStyles,
    poPageStyles,
    css`
      .styles-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.6fr) minmax(18rem, 1fr);
        gap: 1.5rem;
        align-items: start;
        width: 100%;
      }

      @media (max-width: 640px) {
        .styles-layout {
          grid-template-columns: 1fr;
        }
      }

      .editor-pane,
      .preview-pane {
        min-width: 0;
      }

      .editor-pane wa-card {
        overflow: visible;
      }

      .preview-pane {
        position: sticky;
        top: 1rem;
      }

      .preview-pane wa-card {
        display: block;
        min-height: 22rem;
      }

      wa-card {
        display: block;
        width: 100%;
      }

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

      .section-toolbar wa-select,
      .section-toolbar wa-input {
        width: 100%;
        min-width: 0;
        font-weight: normal;
        box-sizing: border-box;
      }

      .layer-stack {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0 0 1rem;
      }

      .layer-item {
        border: 1px solid var(--wa-color-neutral-85, #d4d4d8);
        border-radius: var(--wa-border-radius-medium, 6px);
        background: var(--wa-color-neutral-98, #fafafa);
        min-width: 0;
        overflow: hidden;
      }

      .layer-item:hover {
        border-color: var(--wa-color-brand-70, #38bdf8);
      }

      .layer-item--expanded {
        border-color: var(--wa-color-brand-60, #0ea5e9);
        background: var(--wa-color-brand-98, #f0f9ff);
      }

      .layer-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.55rem 0.65rem;
        font-size: 0.875rem;
        cursor: pointer;
        min-width: 0;
      }

      .layer-item--expanded .layer-row {
        border-bottom: 1px solid var(--wa-color-brand-85, #bae6fd);
        background: var(--wa-color-brand-95, #e0f2fe);
      }

      .layer-order {
        font-family: ui-monospace, monospace;
        font-size: 0.75rem;
        opacity: 0.65;
        min-width: 1.25rem;
      }

      .layer-label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .layer-badge {
        font-size: 0.7rem;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        background: var(--wa-color-neutral-90, #e4e4e7);
        white-space: nowrap;
      }

      .layer-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }

      .layer-row-actions {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
      }

      .layer-reorder,
      .layer-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        padding: 0;
        border: 1px solid var(--wa-color-neutral-80, #c4c4c8);
        border-radius: var(--wa-border-radius-medium, 6px);
        background: var(--wa-color-neutral-98, #fafafa);
        color: var(--wa-color-neutral-35, #52525b);
        cursor: pointer;
        line-height: 1;
      }

      .layer-reorder:hover:not(:disabled) {
        border-color: var(--wa-color-brand-60, #0ea5e9);
        color: var(--wa-color-brand-60, #0ea5e9);
        background: var(--wa-color-brand-95, #e0f2fe);
      }

      .layer-remove:hover:not(:disabled) {
        border-color: var(--wa-color-danger-60, #dc2626);
        color: var(--wa-color-danger-60, #dc2626);
        background: var(--wa-color-danger-95, #fef2f2);
      }

      .layer-reorder:disabled,
      .layer-remove:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .layer-form-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--wa-color-brand-85, #bae6fd);
      }

      .layer-form {
        padding: 0.75rem;
        font-size: 0.875rem;
      }

      .layer-form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        gap: 0.75rem;
        margin-top: 0.75rem;
      }

      .layer-form-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.8125rem;
        font-weight: 600;
      }

      .layer-form-grid wa-input,
      .layer-form-grid wa-select {
        font-weight: normal;
      }

      .vars-heading {
        margin: 1rem 0 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .vars-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.65rem;
        margin-bottom: 0.75rem;
        width: 100%;
      }

      @media (min-width: 520px) {
        .vars-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 880px) {
        .vars-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      .var-row {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .var-label {
        font-size: 0.8125rem;
        font-weight: 600;
      }

      .var-controls {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        min-width: 0;
      }

      .var-controls po-color-input,
      .var-controls wa-input {
        flex: 1;
        min-width: 0;
        box-sizing: border-box;
      }

      .var-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2.375rem;
        height: 2.375rem;
        padding: 0;
        border: 1px solid var(--wa-color-neutral-80, #c4c4c8);
        border-radius: var(--wa-border-radius-medium, 6px);
        background: var(--wa-color-neutral-98, #fafafa);
        color: var(--wa-color-neutral-35, #52525b);
        cursor: pointer;
        line-height: 1;
        transition:
          background 0.15s ease,
          border-color 0.15s ease,
          color 0.15s ease;
      }

      .var-remove:hover {
        background: var(--wa-color-danger-95, #fef2f2);
        border-color: var(--wa-color-danger-70, #fca5a5);
        color: var(--wa-color-danger-50, #ef4444);
      }

      .var-remove:focus-visible {
        outline: 2px solid var(--wa-color-brand-60, #0ea5e9);
        outline-offset: 2px;
      }

      .var-remove wa-icon {
        font-size: 1.125rem;
      }


      .recipe-summary {
        margin: 0 0 0.75rem;
        font-size: 0.8125rem;
        line-height: 1.45;
        opacity: 0.85;
      }

      .recipe-summary code {
        display: block;
        font-size: 0.78rem;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
    `,
  ];

  private readonly recipeCatalog = listConfigStyles();

  private readonly stylesController = new EffectorController(this, $styleSections);

  private get stylesState(): StyleSectionsState {
    return this.stylesController.value;
  }

  render() {
    const section = getActiveSection(this.stylesState);
    return html`
      <section class="page">
        <h2>${stylesPageI18n.translate(stylesPageKeys.title)}</h2>
        <p class="config-lead">${stylesPageI18n.translate(stylesPageKeys.lead)}</p>
        <details class="styles-help">
          <summary>${stylesPageI18n.translate(stylesPageKeys.helpSummary)}</summary>
          <ul>
            <li>${stylesPageI18n.translate(stylesPageKeys.helpRecipe)}</li>
            <li>${stylesPageI18n.translate(stylesPageKeys.helpBaseLayer)}</li>
            <li>${stylesPageI18n.translate(stylesPageKeys.helpOverlays)}</li>
            <li>${stylesPageI18n.translate(stylesPageKeys.helpTextures)}</li>
            <li>${stylesPageI18n.translate(stylesPageKeys.helpVariables)}</li>
          </ul>
          <p>
            ${stylesPageI18n.translate(stylesPageKeys.helpPreviewNotePrefix)}
            <a href="https://github.com/profezzorn/ProffieOS/blob/main/website/BLADE_STYLES.md"
              >${stylesPageI18n.translate(stylesPageKeys.helpPreviewNoteLink)}</a
            >.
          </p>
        </details>

        <div class="styles-layout">
          <div class="editor-pane">
            <wa-card>
              <div class="section-toolbar">
                <label>
                  ${stylesPageI18n.translate(stylesPageKeys.labelRecipe)}
                  <wa-select
                    .value=${encodeFileRecipe(this.stylesState.activeSectionId)}
                    @wa-change=${this.onRecipePickerChange}
                  >
                    ${this.renderRecipePickerOptions()}
                  </wa-select>
                </label>
                <wa-button variant="neutral" @click=${this.onNewSection}
                  >${stylesPageI18n.translate(stylesPageKeys.newRecipe)}</wa-button
                >
                <wa-button
                  variant="neutral"
                  ?disabled=${this.stylesState.sections.length <= 1}
                  @click=${this.onRemoveSection}
                >
                  ${stylesPageI18n.translate(stylesPageKeys.remove)}
                </wa-button>
              </div>

              ${section ? this.renderRecipeSummary(section) : nothing}

              ${section ? this.renderVars(section) : nothing}

              <p class="vars-heading">${stylesPageI18n.translate(stylesPageKeys.headingRecipeStack)}</p>
              <p class="hint">${stylesPageI18n.translate(stylesPageKeys.hintRecipeStack)}</p>
              ${section ? html`<po-style-layer-stack></po-style-layer-stack>` : nothing}

              <div class="layer-toolbar">
                <wa-button variant="brand" @click=${this.onAddLayer}
                  >${stylesPageI18n.translate(stylesPageKeys.addLayer)}</wa-button
                >
              </div>
            </wa-card>
          </div>

          <div class="preview-pane">
            <wa-card>
              <po-blade-preview></po-blade-preview>
            </wa-card>
          </div>
        </div>

        <p class="hint">${stylesPageI18n.translate(stylesPageKeys.hintExport)}</p>
      </section>
    `;
  }

  private renderRecipePickerOptions() {
    const { inFile, library } = listRecipePickerOptions(
      this.stylesState.sections,
      this.recipeCatalog,
    );
    return html`
      ${inFile.map(
        (option) => html`
          <wa-option value=${option.value}
            >${stylesPageI18n.translate(stylesPageKeys.pickerInFile, { label: option.label })}</wa-option
          >
        `,
      )}
      ${library.map(
        (option) => html`
          <wa-option value=${option.value}
            >${stylesPageI18n.translate(stylesPageKeys.pickerLibrary, { label: option.label })}</wa-option
          >
        `,
      )}
    `;
  }

  private renderRecipeSummary(section: StyleSection) {
    const description = recipeDescription(section, this.recipeCatalog);
    const stack = summarizeRecipeLayers(section);
    return html`
      <p class="recipe-summary">
        <strong>${stylesPageI18n.translate(stylesPageKeys.recipeSummaryLayers)}</strong> <code>${stack}</code>
      </p>
      ${description ? html`<p class="hint">${description}</p>` : nothing}
    `;
  }

  private renderVars(section: StyleSection) {
    const entries = baseSectionVarEntries(section);
    return html`
      <p class="vars-heading">${stylesPageI18n.translate(stylesPageKeys.headingBaseBlade)}</p>
      <p class="hint">${stylesPageI18n.translate(stylesPageKeys.hintBaseBlade)}</p>
      <div class="vars-grid">
        ${entries.length === 0
          ? html`<p class="hint">${stylesPageI18n.translate(stylesPageKeys.hintNoBaseVars)}</p>`
          : entries.map(
              ([key, value]) => html`
                <div class="var-row">
                  <span class="var-label">${key}</span>
                  <div class="var-controls">
                    ${this.renderVarInput(section.id, key, value)}
                    <button
                      type="button"
                      class="var-remove"
                      aria-label=${stylesPageI18n.translate(stylesPageKeys.removeVarAria, { key })}
                      title=${stylesPageI18n.translate(stylesPageKeys.removeVarTitle, { key })}
                      @click=${() => sectionVarRemoved({ sectionId: section.id, key })}
                    >
                      <wa-icon name="xmark" label=""></wa-icon>
                    </button>
                  </div>
                </div>
              `,
            )}
      </div>
      <wa-button size="small" variant="neutral" @click=${() => this.onAddBaseVar(section.id)}>
        ${stylesPageI18n.translate(stylesPageKeys.addBaseVar)}
      </wa-button>
    `;
  }

  private onRecipePickerChange = (event: Event): void => {
    const log = contextLogger('po-styles-page', 'onRecipePickerChange');
    const rawValue = (event.target as HTMLSelectElement).value;
    log.entry({ value: rawValue });
    const decoded = decodeStylePickerValue(rawValue);
    if (!decoded) {
      log.debug('branch: decode failed — ignoring change');
      log.exit('ignored');
      return;
    }
    if (decoded.kind === 'file') {
      log.debug('branch: file recipe selected', { id: decoded.id });
      activeSectionChanged(decoded.id);
      log.exit('file');
      return;
    }
    if (decoded.kind === 'library') {
      log.debug('branch: library recipe selected', { id: decoded.id });
      configStyleAdded(decoded.id);
      log.exit('library');
    }
  };

  private onNewSection = (): void => {
    const log = contextLogger('po-styles-page', 'onNewSection');
    log.entry();
    styleSectionAdded();
    log.exit();
  };

  private onRemoveSection = (): void => {
    const log = contextLogger('po-styles-page', 'onRemoveSection');
    log.entry({ activeSectionId: this.stylesState.activeSectionId });
    styleSectionRemoved(this.stylesState.activeSectionId);
    log.exit();
  };

  private onAddLayer = (): void => {
    const log = contextLogger('po-styles-page', 'onAddLayer');
    log.entry({ sectionId: this.stylesState.activeSectionId });
    styleLayerAdded({ sectionId: this.stylesState.activeSectionId });
    log.exit();
  };

  private onAddBaseVar(sectionId: string): void {
    const log = contextLogger('po-styles-page', 'onAddBaseVar');
    log.entry({ sectionId });
    const section = getActiveSection(this.stylesState);
    const existing = new Set(Object.keys(section?.vars ?? {}));
    const candidates = ['base', 'ext', 'ret'];
    const preferred = candidates.find((name) => !existing.has(name));
    if (preferred) {
      log.debug('branch: using preferred var name', { key: preferred });
    } else {
      log.debug('branch: generating fallback var name', { existingCount: existing.size });
    }
    const key = preferred ?? `base${existing.size + 1}`;
    sectionVarAdded({ sectionId, key, value: '' });
    log.exit({ key });
  }

  private onVarChange(sectionId: string, key: string, value: string): void {
    const log = contextLogger('po-styles-page', 'onVarChange');
    log.entry({ sectionId, key, value });
    sectionVarChanged({ sectionId, key, value });
    log.exit();
  }

  private isColorVarKey(key: string): boolean {
    return key === 'base' || key.endsWith('_color') || key === 'color';
  }

  private renderVarInput(sectionId: string, key: string, value: string) {
    if (this.isColorVarKey(key)) {
      return html`
        <po-color-input
          .value=${value}
          @color-change=${(event: CustomEvent<{ value: string }>) =>
            this.onVarChange(sectionId, key, event.detail.value)}
        ></po-color-input>
      `;
    }
    return html`
      <wa-input
        .value=${value}
        @wa-input=${(event: Event) =>
          this.onVarChange(sectionId, key, (event.target as HTMLInputElement).value)}
      ></wa-input>
    `;
  }

}

customElements.define('po-styles-page', PoStylesPage);
