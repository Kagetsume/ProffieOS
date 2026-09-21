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
import { describeLayer, getNamedStyle } from '../../model/style-catalog';
import { listConfigStyles } from '../../model/config-styles';
import {
  decodeStylePickerValue,
  encodeFileRecipe,
  layerStylePickerValue,
  listLayerStylePickerOptions,
  listRecipePickerOptions,
  recipeDescription,
  summarizeRecipeLayers,
} from '../../model/style-picker';
import {
  baseSectionVarEntries,
  resolveLayerArgs,
  type LayerBlend,
  type StyleLayer,
  type StyleSection,
} from '../../model/style-sections';
import type { StyleArgDef } from '../../model/style-catalog';
import {
  $styleSections,
  activeSectionChanged,
  getActiveSection,
  sectionVarAdded,
  sectionVarChanged,
  sectionVarRemoved,
  styleLayerAdded,
  styleLayerMoved,
  styleLayerRemoved,
  styleLayerUpdated,
  styleSectionAdded,
  styleSectionRemoved,
  configStyleAdded,
  suggestedBlendForStyle,
  type StyleSectionsState,
} from '../../stores/styleSections';
import { PoElement } from './po-element.js';
import { poHostStyles, poPageStyles } from './po-shared-styles.js';
import './po-blade-preview.js';
import './po-color-input.js';

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

  private stylesState: StyleSectionsState = $styleSections.getState();
  private selectedLayerId = '';

  private unwatch?: () => void;

  connectedCallback(): void {
    super.connectedCallback();
    const initial = $styleSections.getState();
    this.stylesState = initial;
    const initialSection = getActiveSection(initial);
    this.selectedLayerId =
      initialSection?.layers[initialSection.layers.length - 1]?.id ?? '';
    this.unwatch = $styleSections.watch((state) => {
      this.stylesState = state;
      const section = getActiveSection(state);
      if (section && !section.layers.some((layer) => layer.id === this.selectedLayerId)) {
        this.selectedLayerId = section.layers[section.layers.length - 1]?.id ?? '';
      }
      this.requestUpdate();
    });
  }

  disconnectedCallback(): void {
    this.unwatch?.();
    super.disconnectedCallback();
  }

  render() {
    const section = getActiveSection(this.stylesState);

    return html`
      <section class="page">
        <h2>Blade styles</h2>
        <p class="config-lead">
          Edit <code>config/blade_styles.ini</code>. A <strong>blade style</strong> is a recipe: a
          <strong>base blade</strong> (color + extend/retract) plus separate overlay layers for smoke,
          clash, lockup, and other effects. Use <code>solid</code> for a composable base with no
          built-in combat. Presets pick the whole recipe: <code>style = config smoke_blade</code>.
        </p>
        <details class="styles-help">
          <summary>What are blade style recipes?</summary>
          <ul>
            <li>
              <strong>Recipe</strong> — one <code>[section]</code> in this file; a stack of
              <code>layer =</code> lines composited bottom → top.
            </li>
            <li>
              <strong>Base layer</strong> — <code>solid</code>, <code>fire</code>, <code>rainbow</code>,
              <code>water_flow</code>, … fills the blade when ignited.
            </li>
            <li>
              <strong>Overlays</strong> — <code>clash</code>, <code>blast</code>, <code>lockup</code>,
              <code>swing</code>, … mostly transparent until triggered.
            </li>
            <li>
              <strong>Textures</strong> — <code>fire_mask</code>, <code>stripes</code>, … usually with
              <code>multiply</code> / <code>screen</code> / <code>add</code> and <code>opacity</code>.
            </li>
            <li>
              <strong>Variables</strong> — <code>base = cyan</code> + <code>{{base}}</code> in layers;
              presets override with <code>style = config section base=red</code>.
            </li>
          </ul>
          <p>
            Preview is approximate — verify on the saber. Full examples and build-from recipes:
            <a href="https://github.com/profezzorn/ProffieOS/blob/main/website/BLADE_STYLES.md"
              >website/BLADE_STYLES.md</a
            >.
          </p>
        </details>

        <div class="styles-layout">
          <div class="editor-pane">
            <wa-card>
              <div class="section-toolbar">
                <label>
                  Blade style (recipe)
                  <wa-select
                    .value=${encodeFileRecipe(this.stylesState.activeSectionId)}
                    @wa-change=${this.onRecipePickerChange}
                  >
                    ${this.renderRecipePickerOptions()}
                  </wa-select>
                </label>
                <wa-button variant="neutral" @click=${this.onNewSection}>New recipe</wa-button>
                <wa-button
                  variant="neutral"
                  ?disabled=${this.stylesState.sections.length <= 1}
                  @click=${this.onRemoveSection}
                >
                  Remove
                </wa-button>
              </div>

              ${section ? this.renderRecipeSummary(section) : nothing}

              ${section ? this.renderVars(section) : nothing}

              <p class="vars-heading">Recipe stack — layer styles (bottom → top)</p>
              <p class="hint">
                Click a layer to expand it inline (one at a time). Reorder with ↑↓ on each row (or
                inside the editor). Remove with the trash icon. Base color and in/out also live in
                <strong>Base blade</strong> when the bottom layer uses <code>{{base}}</code> /
                <code>{{ext}}</code> / <code>{{ret}}</code>.
              </p>
              ${section ? this.renderLayerStack(section) : nothing}

              <div class="layer-toolbar">
                <wa-button variant="brand" @click=${this.onAddLayer}>Add layer</wa-button>
              </div>
            </wa-card>
          </div>

          <div class="preview-pane">
            <wa-card>
              <po-blade-preview></po-blade-preview>
            </wa-card>
          </div>
        </div>

        <p class="hint">
          Changes update the Export page immediately. Preview approximates on-saber rendering.
        </p>
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
          <wa-option value=${option.value}>In file · ${option.label}</wa-option>
        `,
      )}
      ${library.map(
        (option) => html`
          <wa-option value=${option.value}>Library · ${option.label}</wa-option>
        `,
      )}
    `;
  }

  private renderRecipeSummary(section: StyleSection) {
    const description = recipeDescription(section, this.recipeCatalog);
    const stack = summarizeRecipeLayers(section);
    return html`
      <p class="recipe-summary">
        <strong>Layers:</strong> <code>${stack}</code>
      </p>
      ${description ? html`<p class="hint">${description}</p>` : nothing}
    `;
  }

  private renderVars(section: StyleSection) {
    const entries = baseSectionVarEntries(section);
    return html`
      <p class="vars-heading">Base blade</p>
      <p class="hint">
        Color and extend/retract timing for the bottom opaque layer only. Clash, lockup, blast, and
        other effects are configured on their layers below. Standard color names work in presets;
        extended and vivid colors export as <code>r,g,b</code>. Custom <code>#rrggbb</code> is also
        supported.
      </p>
      <div class="vars-grid">
        ${entries.length === 0
          ? html`<p class="hint">No base variables — select the bottom layer to edit args directly.</p>`
          : entries.map(
              ([key, value]) => html`
                <div class="var-row">
                  <span class="var-label">${key}</span>
                  <div class="var-controls">
                    ${this.renderVarInput(section.id, key, value)}
                    <button
                      type="button"
                      class="var-remove"
                      aria-label=${`Remove variable ${key}`}
                      title=${`Remove ${key}`}
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
        Add base variable
      </wa-button>
    `;
  }

  private renderLayerStack(section: StyleSection) {
    const layers = [...section.layers].reverse();
    const canRemove = section.layers.length > 1;
    return html`
      <div class="layer-stack" role="list">
        ${layers.map((layer, index) => {
          const stackIndex = section.layers.length - index;
          const layerIndex = section.layers.findIndex((row) => row.id === layer.id);
          const canMoveUp = layerIndex >= 0 && layerIndex < section.layers.length - 1;
          const canMoveDown = layerIndex > 0;
          const expanded = layer.id === this.selectedLayerId;
          const badge =
            layer.blend !== 'normal' || layer.opacity < 32768 ? layer.blend : nothing;
          return html`
            <div
              class="layer-item ${expanded ? 'layer-item--expanded' : ''}"
              role="listitem"
              id=${expanded ? 'selected-layer-item' : nothing}
            >
              <div class="layer-row" @click=${() => this.selectLayer(layer.id)}>
                <span class="layer-order">${stackIndex}</span>
                <span class="layer-label"
                  >${describeLayer(
                    layer.styleName,
                    resolveLayerArgs(layer, section.vars),
                    layer.blend,
                    layer.configSection,
                  )}</span
                >
                ${badge ? html`<span class="layer-badge">${badge}</span>` : nothing}
                <div class="layer-row-actions">
                  <button
                    type="button"
                    class="layer-reorder"
                    ?disabled=${!canMoveUp}
                    aria-label=${`Move layer ${stackIndex} toward top`}
                    title="Move toward top"
                    @click=${(event: Event) =>
                      this.onMoveLayerClick(event, section.id, layer.id, 'up')}
                  >
                    <wa-icon name="chevron-up" label=""></wa-icon>
                  </button>
                  <button
                    type="button"
                    class="layer-reorder"
                    ?disabled=${!canMoveDown}
                    aria-label=${`Move layer ${stackIndex} toward base`}
                    title="Move toward base"
                    @click=${(event: Event) =>
                      this.onMoveLayerClick(event, section.id, layer.id, 'down')}
                  >
                    <wa-icon name="chevron-down" label=""></wa-icon>
                  </button>
                  <button
                    type="button"
                    class="layer-remove"
                    ?disabled=${!canRemove}
                    aria-label=${`Remove layer ${stackIndex}`}
                    title=${canRemove ? 'Remove layer' : 'Cannot remove the only layer'}
                    @click=${(event: Event) =>
                      this.onRemoveLayerClick(event, section.id, layer.id)}
                  >
                    <wa-icon name="trash" label=""></wa-icon>
                  </button>
                </div>
              </div>
              ${expanded
                ? this.renderLayerForm(section, layer, canRemove, canMoveUp, canMoveDown)
                : nothing}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderLayerForm(
    section: StyleSection,
    layer: StyleLayer,
    canRemove: boolean,
    canMoveUp: boolean,
    canMoveDown: boolean,
  ) {
    const sectionId = section.id;
    const styleDef = layer.styleName === 'config' ? undefined : getNamedStyle(layer.styleName);
    const layerOptions = listLayerStylePickerOptions(this.stylesState.sections);
    let lastGroup = '';

    return html`
      <div class="layer-form" @click=${(event: Event) => event.stopPropagation()}>
        <div class="layer-form-grid">
          <label>
            Style
            <wa-select
              .value=${layerStylePickerValue(layer)}
              @wa-change=${this.onLayerStyleChange}
            >
              ${layerOptions.flatMap((option) => {
                const headers =
                  option.group !== lastGroup
                    ? ((lastGroup = option.group),
                      html`<wa-option disabled value="__group-${option.group}"
                        >${option.group}</wa-option
                      >`)
                    : nothing;
                return [headers, html`<wa-option value=${option.value}>${option.label}</wa-option>`];
              })}
            </wa-select>
          </label>
          <label>
            Blend
            <wa-select
              .value=${layer.blend}
              @wa-change=${(event: Event) =>
                this.patchLayer(sectionId, layer.id, {
                  blend: (event.target as HTMLSelectElement).value as LayerBlend,
                })}
            >
              <wa-option value="normal">normal</wa-option>
              <wa-option value="multiply">multiply</wa-option>
              <wa-option value="screen">screen</wa-option>
              <wa-option value="add">add</wa-option>
            </wa-select>
          </label>
          <label>
            Opacity (0–32768)
            <wa-input
              type="number"
              min="0"
              max="32768"
              .value=${String(layer.opacity)}
              @wa-input=${(event: Event) =>
                this.patchLayer(sectionId, layer.id, {
                  opacity: Number((event.target as HTMLInputElement).value) || 0,
                })}
            ></wa-input>
          </label>
        </div>
        ${layer.styleName === 'config'
          ? html`<p class="hint">Exports as <code>layer = config ${layer.configSection ?? '…'}</code>.</p>`
          : styleDef
            ? html`
                <div class="layer-form-grid">
                  ${styleDef.args.map((arg, index) => html`
                    <label>
                      ${arg.label}
                      ${this.renderLayerArgInput(section, layer, index, arg)}
                    </label>
                  `)}
                </div>
              `
            : nothing}
        <div class="layer-form-footer">
          <wa-button
            size="small"
            variant="neutral"
            ?disabled=${!canMoveDown}
            @click=${() => this.moveLayer(section.id, layer.id, 'down')}
          >
            ↓ Toward base
          </wa-button>
          <wa-button
            size="small"
            variant="neutral"
            ?disabled=${!canMoveUp}
            @click=${() => this.moveLayer(section.id, layer.id, 'up')}
          >
            ↑ Toward top
          </wa-button>
          <wa-button
            size="small"
            variant="danger"
            ?disabled=${!canRemove}
            @click=${() => this.removeLayer(section.id, layer.id)}
          >
            Remove layer
          </wa-button>
        </div>
      </div>
    `;
  }

  private onRecipePickerChange = (event: Event): void => {
    const decoded = decodeStylePickerValue((event.target as HTMLSelectElement).value);
    if (!decoded) {
      return;
    }
    if (decoded.kind === 'file') {
      activeSectionChanged(decoded.id);
      return;
    }
    if (decoded.kind === 'library') {
      configStyleAdded(decoded.id);
    }
  };

  private onNewSection = (): void => {
    styleSectionAdded();
  };

  private onRemoveSection = (): void => {
    styleSectionRemoved(this.stylesState.activeSectionId);
  };

  private onAddLayer = (): void => {
    styleLayerAdded({ sectionId: this.stylesState.activeSectionId });
  };

  private onRemoveLayerClick(event: Event, sectionId: string, layerId: string): void {
    event.stopPropagation();
    this.removeLayer(sectionId, layerId);
  }

  private onMoveLayerClick(
    event: Event,
    sectionId: string,
    layerId: string,
    direction: 'up' | 'down',
  ): void {
    event.stopPropagation();
    this.moveLayer(sectionId, layerId, direction);
  }

  private removeLayer(sectionId: string, layerId: string): void {
    const section = getActiveSection(this.stylesState);
    if (!section || section.layers.length <= 1) {
      return;
    }
    if (this.selectedLayerId === layerId) {
      this.selectedLayerId = '';
    }
    styleLayerRemoved({ sectionId, layerId });
  }

  private onAddBaseVar(sectionId: string): void {
    const section = getActiveSection(this.stylesState);
    const existing = new Set(Object.keys(section?.vars ?? {}));
    const candidates = ['base', 'ext', 'ret'];
    const key = candidates.find((name) => !existing.has(name)) ?? `base${existing.size + 1}`;
    sectionVarAdded({ sectionId, key, value: '' });
  }

  private onVarChange(sectionId: string, key: string, value: string): void {
    sectionVarChanged({ sectionId, key, value });
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

  private templateVarName(arg: string): string | undefined {
    const match = arg.trim().match(/^\{\{(\w+)\}\}$/);
    return match?.[1];
  }

  private renderLayerArgInput(
    section: StyleSection,
    layer: StyleLayer,
    index: number,
    arg: StyleArgDef,
  ) {
    const raw = layer.args[index] ?? arg.default;
    const varName = this.templateVarName(raw);
    const usesSectionVar = varName !== undefined && varName in section.vars;
    const value = usesSectionVar ? section.vars[varName]! : raw;

    const onValueChange = (next: string): void => {
      if (usesSectionVar && varName) {
        this.onVarChange(section.id, varName, next);
        return;
      }
      this.patchLayerArg(section.id, layer, index, next);
    };

    const field =
      arg.type === 'color'
        ? html`
            <po-color-input
              .value=${value}
              @color-change=${(event: CustomEvent<{ value: string }>) =>
                onValueChange(event.detail.value)}
            ></po-color-input>
          `
        : html`
            <wa-input
              .value=${value}
              @wa-input=${(event: Event) =>
                onValueChange((event.target as HTMLInputElement).value)}
            ></wa-input>
          `;

    return html`
      ${field}
      ${usesSectionVar
        ? html`<span class="hint">Section var <code>${varName}</code></span>`
        : nothing}
    `;
  }

  private patchLayerArg(
    sectionId: string,
    layer: StyleLayer,
    index: number,
    value: string,
  ): void {
    const args = [...layer.args];
    args[index] = value;
    this.patchLayer(sectionId, layer.id, { args });
  }

  private selectLayer(id: string): void {
    this.selectedLayerId = this.selectedLayerId === id ? '' : id;
    this.requestUpdate();
    if (this.selectedLayerId) {
      this.updateComplete.then(() => {
        this.querySelector('#selected-layer-item')?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    }
  }

  private patchLayer(sectionId: string, layerId: string, patch: Partial<StyleLayer>): void {
    styleLayerUpdated({ sectionId, layerId, patch });
  }

  private onLayerStyleChange = (event: Event): void => {
    const section = getActiveSection(this.stylesState);
    const layer = section?.layers.find((row) => row.id === this.selectedLayerId);
    if (!section || !layer) {
      return;
    }
    const decoded = decodeStylePickerValue((event.target as HTMLSelectElement).value);
    if (!decoded) {
      return;
    }
    if (decoded.kind === 'config') {
      styleLayerUpdated({
        sectionId: section.id,
        layerId: layer.id,
        patch: {
          styleName: 'config',
          configSection: decoded.id,
          args: [],
          blend: 'normal',
          opacity: 32768,
        },
      });
      return;
    }
    if (decoded.kind === 'layer') {
      const suggested = suggestedBlendForStyle(decoded.id);
      styleLayerUpdated({
        sectionId: section.id,
        layerId: layer.id,
        patch: { styleName: decoded.id, ...suggested, configSection: undefined },
      });
    }
  };

  private moveLayer(sectionId: string, layerId: string, direction: 'up' | 'down'): void {
    styleLayerMoved({ sectionId, layerId, direction });
  }
}

customElements.define('po-styles-page', PoStylesPage);
