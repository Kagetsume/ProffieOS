/**
 * Blade styles editor — layer recipes (left) + upward saber preview (right).
 *
 * Route: `#/styles`. User guide: `website/BLADE_STYLES.md`.
 *
 * @module ui/elements/po-styles-page
 */
import { html, nothing } from 'lit';
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
import { poStylesPageStyles } from './po-styles-page.styles.js';
import './po-blade-preview.js';
import './po-color-input.js';
import './po-style-layer-stack.js';

export class PoStylesPage extends PoElement {
  static styles = [poHostStyles, poPageStyles, poStylesPageStyles];

  private readonly recipeCatalog = listConfigStyles();

  private readonly stylesController = new EffectorController(this, $styleSections);

  /**
   * Current style sections store snapshot from the Effector controller.
   *
   * @returns Active style sections state including recipes, layers, and selection.
   */
  private get stylesState(): StyleSectionsState {
    return this.stylesController.value;
  }

  /**
   * Renders the blade styles editor with recipe toolbar, vars, layer stack, and preview.
   *
   * @returns Lit template for the full styles page layout.
   */
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

  /**
   * Builds grouped `<wa-option>` nodes for in-file and library style recipes.
   *
   * @returns Lit template fragment containing recipe picker options.
   */
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

  /**
   * Renders a human-readable layer stack summary and optional catalog description.
   *
   * @param section Active style recipe section to summarize.
   * @returns Lit template with layer stack code and optional hint text.
   */
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

  /**
   * Renders base blade variable inputs with add/remove controls.
   *
   * @param section Style recipe section whose base vars are edited.
   * @returns Lit template for the base blade variables grid.
   */
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

  /**
   * Switches the active recipe or imports a library recipe from the picker.
   *
   * @param event Change event from the recipe `<wa-select>`.
   * @returns Nothing; may dispatch `activeSectionChanged` or `configStyleAdded`.
   */
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

  /**
   * Creates a new empty style recipe section in the store.
   *
   * @returns Nothing; dispatches `styleSectionAdded`.
   */
  private onNewSection = (): void => {
    const log = contextLogger('po-styles-page', 'onNewSection');
    log.entry();
    styleSectionAdded();
    log.exit();
  };

  /**
   * Removes the currently active style recipe section.
   *
   * @returns Nothing; dispatches `styleSectionRemoved` for the active section id.
   */
  private onRemoveSection = (): void => {
    const log = contextLogger('po-styles-page', 'onRemoveSection');
    log.entry({ activeSectionId: this.stylesState.activeSectionId });
    styleSectionRemoved(this.stylesState.activeSectionId);
    log.exit();
  };

  /**
   * Appends a new layer to the active style recipe.
   *
   * @returns Nothing; dispatches `styleLayerAdded` for the active section.
   */
  private onAddLayer = (): void => {
    const log = contextLogger('po-styles-page', 'onAddLayer');
    log.entry({ sectionId: this.stylesState.activeSectionId });
    styleLayerAdded({ sectionId: this.stylesState.activeSectionId });
    log.exit();
  };

  /**
   * Adds a new base blade variable with a preferred or generated key name.
   *
   * @param sectionId Id of the style recipe section receiving the new variable.
   * @returns Nothing; dispatches `sectionVarAdded` with an empty initial value.
   */
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

  /**
   * Updates one base blade variable value in the store.
   *
   * @param sectionId Id of the style recipe section owning the variable.
   * @param key Variable name to update.
   * @param value New variable value string.
   * @returns Nothing; dispatches `sectionVarChanged`.
   */
  private onVarChange(sectionId: string, key: string, value: string): void {
    const log = contextLogger('po-styles-page', 'onVarChange');
    log.entry({ sectionId, key, value });
    sectionVarChanged({ sectionId, key, value });
    log.exit();
  }

  /**
   * Determines whether a base variable should use the color input control.
   *
   * @param key Base variable name to inspect.
   * @returns True when the key represents a color variable.
   */
  private isColorVarKey(key: string): boolean {
    return key === 'base' || key.endsWith('_color') || key === 'color';
  }

  /**
   * Renders the appropriate input control for a base blade variable.
   *
   * @param sectionId Id of the style recipe section owning the variable.
   * @param key Variable name being edited.
   * @param value Current variable value string.
   * @returns Lit template for a color picker or text input.
   */
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
