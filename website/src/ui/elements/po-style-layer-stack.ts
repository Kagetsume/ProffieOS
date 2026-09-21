/**
 * Expandable layer stack for one blade style recipe section.
 *
 * @module ui/elements/po-style-layer-stack
 */
import { html, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import { describeLayer, getNamedStyle, type StyleArgDef } from '../../model/style-catalog';
import {
  decodeStylePickerValue,
  layerStylePickerValue,
  listLayerStylePickerOptions,
} from '../../model/style-picker';
import { resolveLayerArgs, type LayerBlend, type StyleLayer, type StyleSection } from '../../model/style-sections';
import {
  $styleSections,
  activeLayerChanged,
  getActiveSection,
  sectionVarChanged,
  styleLayerMoved,
  styleLayerRemoved,
  styleLayerUpdated,
  suggestedBlendForStyle,
} from '../../stores/styleSections';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { styleLayerStackI18n } from './po-style-layer-stack.i18n.js';
import { styleLayerStackKeys } from './po-style-layer-stack.keys.js';
import { poStyleLayerStackStyles } from './po-style-layer-stack.styles.js';
import './po-color-input.js';

export class PoStyleLayerStack extends PoElement {
  static styles = poStyleLayerStackStyles;

  private readonly stylesController = new EffectorController(this, $styleSections);

  private scrollTargetId = '';

  /**
   * Renders the expandable layer stack for the active style recipe section.
   *
   * @returns Lit template for the layer stack, or `nothing` when no section is active.
   */
  render() {
    const section = getActiveSection(this.stylesController.value);
    if (!section) {
      return nothing;
    }
    return this.renderLayerStack(section);
  }

  /**
   * Scrolls the expanded layer into view after the active layer changes.
   *
   * @returns Nothing; schedules scroll via `updateComplete` when a target is set.
   */
  protected updated(): void {
    if (!this.scrollTargetId) {
      return;
    }
    const targetId = this.scrollTargetId;
    this.scrollTargetId = '';
    this.updateComplete.then(() => {
      this.scrollToTarget(targetId);
    });
  }

  /**
   * Smoothly scrolls a layer item element into the nearest visible viewport edge.
   *
   * @param targetId DOM id of the element to scroll into view.
   * @returns Nothing; no-ops when the target element is not found.
   */
  private scrollToTarget(targetId: string): void {
    const element = this.shadowRoot?.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * Renders all layers in display order with expand, reorder, and remove controls.
   *
   * @param section Style recipe section whose layers are listed.
   * @returns Lit template for the ordered layer stack list.
   */
  private renderLayerStack(section: StyleSection) {
    const activeLayerId = this.stylesController.value.activeLayerId;
    const layers = [...section.layers].reverse();
    const canRemove = section.layers.length > 1;
    return html`
      <div class="layer-stack" role="list">
        ${layers.map((layer, index) => {
          const stackIndex = section.layers.length - index;
          const layerIndex = section.layers.findIndex((row) => row.id === layer.id);
          const canMoveUp = layerIndex >= 0 && layerIndex < section.layers.length - 1;
          const canMoveDown = layerIndex > 0;
          const expanded = layer.id === activeLayerId;
          const badge =
            layer.blend !== 'normal' || layer.opacity < 32768 ? layer.blend : nothing;
          return html`
            <div
              class="layer-item ${expanded ? 'layer-item--expanded' : ''}"
              role="listitem"
              id=${expanded ? 'selected-layer-item' : nothing}
            >
              <div class="layer-row" @click=${() => this.toggleLayer(layer.id, activeLayerId)}>
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
                    aria-label=${styleLayerStackI18n.translate(styleLayerStackKeys.moveTowardTopAria, { stackIndex })}
                    title=${styleLayerStackI18n.translate(styleLayerStackKeys.moveTowardTopTitle)}
                    @click=${(event: Event) =>
                      this.onMoveLayerClick(event, section.id, layer.id, 'up')}
                  >
                    <wa-icon name="chevron-up" label=""></wa-icon>
                  </button>
                  <button
                    type="button"
                    class="layer-reorder"
                    ?disabled=${!canMoveDown}
                    aria-label=${styleLayerStackI18n.translate(styleLayerStackKeys.moveTowardBaseAria, { stackIndex })}
                    title=${styleLayerStackI18n.translate(styleLayerStackKeys.moveTowardBaseTitle)}
                    @click=${(event: Event) =>
                      this.onMoveLayerClick(event, section.id, layer.id, 'down')}
                  >
                    <wa-icon name="chevron-down" label=""></wa-icon>
                  </button>
                  <button
                    type="button"
                    class="layer-remove"
                    ?disabled=${!canRemove}
                    aria-label=${styleLayerStackI18n.translate(styleLayerStackKeys.removeLayerAria, { stackIndex })}
                    title=${canRemove
                      ? styleLayerStackI18n.translate(styleLayerStackKeys.removeLayerTitle)
                      : styleLayerStackI18n.translate(styleLayerStackKeys.removeLayerOnlyTitle)}
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

  /**
   * Renders the expanded editor form for one style layer.
   *
   * @param section Parent style recipe section providing shared vars.
   * @param layer Layer definition being edited.
   * @param canRemove Whether the layer may be removed (more than one layer exists).
   * @param canMoveUp Whether the layer can move toward the blade tip.
   * @param canMoveDown Whether the layer can move toward the blade base.
   * @returns Lit template for the layer style, blend, opacity, and arg controls.
   */
  private renderLayerForm(
    section: StyleSection,
    layer: StyleLayer,
    canRemove: boolean,
    canMoveUp: boolean,
    canMoveDown: boolean,
  ) {
    const sectionId = section.id;
    const styleDef = layer.styleName === 'config' ? undefined : getNamedStyle(layer.styleName);
    const layerOptions = listLayerStylePickerOptions(this.stylesController.value.sections);
    let lastGroup = '';
    return html`
      <div class="layer-form" @click=${(event: Event) => event.stopPropagation()}>
        <div class="layer-form-grid">
          <label>
            ${styleLayerStackI18n.translate(styleLayerStackKeys.labelStyle)}
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
            ${styleLayerStackI18n.translate(styleLayerStackKeys.labelBlend)}
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
            ${styleLayerStackI18n.translate(styleLayerStackKeys.labelOpacity)}
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
          ? html`<p class="hint">${styleLayerStackI18n.translate(styleLayerStackKeys.hintConfigExport, {
              configSection: layer.configSection ?? '…',
            })}</p>`
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
            @click=${() => styleLayerMoved({ sectionId, layerId: layer.id, direction: 'down' })}
          >
            ${styleLayerStackI18n.translate(styleLayerStackKeys.buttonTowardBase)}
          </wa-button>
          <wa-button
            size="small"
            variant="neutral"
            ?disabled=${!canMoveUp}
            @click=${() => styleLayerMoved({ sectionId, layerId: layer.id, direction: 'up' })}
          >
            ${styleLayerStackI18n.translate(styleLayerStackKeys.buttonTowardTop)}
          </wa-button>
          <wa-button
            size="small"
            variant="danger"
            ?disabled=${!canRemove}
            @click=${() => this.removeLayer(sectionId, layer.id)}
          >
            ${styleLayerStackI18n.translate(styleLayerStackKeys.buttonRemoveLayer)}
          </wa-button>
        </div>
      </div>
    `;
  }

  /**
   * Expands or collapses a layer row by toggling the active layer id.
   *
   * @param id Layer id that was clicked.
   * @param activeLayerId Currently expanded layer id, if any.
   * @returns Nothing; dispatches `activeLayerChanged` and may queue scroll.
   */
  private toggleLayer(id: string, activeLayerId: string): void {
    const log = contextLogger('po-style-layer-stack', 'toggleLayer');
    log.entry({ id, activeLayerId });
    const next = activeLayerId === id ? '' : id;
    if (next) {
      log.debug('branch: expanding layer', { layerId: next });
      this.scrollTargetId = 'selected-layer-item';
    } else {
      log.debug('branch: collapsing active layer');
    }
    activeLayerChanged(next);
    log.exit({ nextActiveLayerId: next });
  }

  /**
   * Handles remove-button clicks without toggling the layer row.
   *
   * @param event Click event from the remove button.
   * @param sectionId Id of the style recipe section owning the layer.
   * @param layerId Id of the layer to remove.
   * @returns Nothing; delegates to `removeLayer` after stopping propagation.
   */
  private onRemoveLayerClick(event: Event, sectionId: string, layerId: string): void {
    const log = contextLogger('po-style-layer-stack', 'onRemoveLayerClick');
    log.entry({ sectionId, layerId });
    event.stopPropagation();
    this.removeLayer(sectionId, layerId);
    log.exit();
  }

  /**
   * Handles reorder-button clicks without toggling the layer row.
   *
   * @param event Click event from a move-up or move-down button.
   * @param sectionId Id of the style recipe section owning the layer.
   * @param layerId Id of the layer to reorder.
   * @param direction Stack direction: `up` toward tip or `down` toward base.
   * @returns Nothing; dispatches `styleLayerMoved` after stopping propagation.
   */
  private onMoveLayerClick(
    event: Event,
    sectionId: string,
    layerId: string,
    direction: 'up' | 'down',
  ): void {
    const log = contextLogger('po-style-layer-stack', 'onMoveLayerClick');
    log.entry({ sectionId, layerId, direction });
    event.stopPropagation();
    styleLayerMoved({ sectionId, layerId, direction });
    log.exit();
  }

  /**
   * Removes a layer when the section has more than one layer.
   *
   * @param sectionId Id of the style recipe section owning the layer.
   * @param layerId Id of the layer to remove.
   * @returns Nothing; dispatches `styleLayerRemoved` or no-ops when blocked.
   */
  private removeLayer(sectionId: string, layerId: string): void {
    const log = contextLogger('po-style-layer-stack', 'removeLayer');
    log.entry({ sectionId, layerId });
    const section = getActiveSection(this.stylesController.value);
    if (!section || section.layers.length <= 1) {
      log.debug('branch: cannot remove — section missing or only one layer');
      log.exit('blocked');
      return;
    }
    log.debug('branch: removing layer');
    styleLayerRemoved({ sectionId, layerId });
    log.exit();
  }

  /**
   * Applies a partial update to one style layer in the store.
   *
   * @param sectionId Id of the style recipe section owning the layer.
   * @param layerId Id of the layer to update.
   * @param patch Fields to merge into the layer definition.
   * @returns Nothing; dispatches `styleLayerUpdated`.
   */
  private patchLayer(sectionId: string, layerId: string, patch: Partial<StyleLayer>): void {
    const log = contextLogger('po-style-layer-stack', 'patchLayer');
    log.entry({ sectionId, layerId, patchKeys: Object.keys(patch) });
    styleLayerUpdated({ sectionId, layerId, patch });
    log.exit();
  }

  /**
   * Switches the active layer between named styles and config-section references.
   *
   * @param event Change event from the layer style `<wa-select>`.
   * @returns Nothing; dispatches `styleLayerUpdated` with decoded picker value.
   */
  private onLayerStyleChange = (event: Event): void => {
    const log = contextLogger('po-style-layer-stack', 'onLayerStyleChange');
    const rawValue = (event.target as HTMLSelectElement).value;
    log.entry({ value: rawValue });
    const section = getActiveSection(this.stylesController.value);
    const activeLayerId = this.stylesController.value.activeLayerId;
    const layer = section?.layers.find((row) => row.id === activeLayerId);
    if (!section || !layer) {
      log.debug('branch: no active section or layer — ignoring');
      log.exit('ignored');
      return;
    }
    const decoded = decodeStylePickerValue(rawValue);
    if (!decoded) {
      log.debug('branch: decode failed — ignoring change');
      log.exit('ignored');
      return;
    }
    if (decoded.kind === 'config') {
      log.debug('branch: switching to config layer', { configSection: decoded.id });
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
      log.exit('config');
      return;
    }
    if (decoded.kind === 'layer') {
      log.debug('branch: switching to named style', { styleName: decoded.id });
      const suggested = suggestedBlendForStyle(decoded.id);
      styleLayerUpdated({
        sectionId: section.id,
        layerId: layer.id,
        patch: { styleName: decoded.id, ...suggested, configSection: undefined },
      });
      log.exit('layer');
    }
  };

  /**
   * Extracts a section variable name from a `{{var}}` template placeholder.
   *
   * @param arg Raw layer argument string that may reference a section var.
   * @returns Variable name when the arg is a template reference; otherwise undefined.
   */
  private templateVarName(arg: string): string | undefined {
    const match = arg.trim().match(/^\{\{(\w+)\}\}$/);
    return match?.[1];
  }

  /**
   * Renders an input for one style-layer argument, resolving section var bindings.
   *
   * @param section Parent style recipe section providing shared vars.
   * @param layer Layer whose args array is edited.
   * @param index Zero-based index of the argument within the layer.
   * @param arg Style catalog metadata describing the argument type and default.
   * @returns Lit template for the arg input and optional section-var hint.
   */
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

    /**
     * Persists a layer arg edit to the section var or layer args array.
     *
     * @param next New argument value string from the input control.
     * @returns Nothing; dispatches `sectionVarChanged` or `patchLayer`.
     */
    const onValueChange = (next: string): void => {
      const changeLog = contextLogger('po-style-layer-stack', 'onLayerArgValueChange');
      changeLog.entry({ layerId: layer.id, index, next });
      if (usesSectionVar && varName) {
        changeLog.debug('branch: updating section var', { varName });
        sectionVarChanged({ sectionId: section.id, key: varName, value: next });
        changeLog.exit('section-var');
        return;
      }
      changeLog.debug('branch: updating layer arg');
      const args = [...layer.args];
      args[index] = next;
      this.patchLayer(section.id, layer.id, { args });
      changeLog.exit('layer-arg');
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
        ? html`<span class="hint">${styleLayerStackI18n.translate(styleLayerStackKeys.hintSectionVar, { varName })}</span>`
        : nothing}
    `;
  }
}

customElements.define('po-style-layer-stack', PoStyleLayerStack);
