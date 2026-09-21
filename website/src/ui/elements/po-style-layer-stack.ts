/**
 * Expandable layer stack for one blade style recipe section.
 *
 * @module ui/elements/po-style-layer-stack
 */
import { html, css, nothing } from 'lit';
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
import './po-color-input.js';

export class PoStyleLayerStack extends PoElement {
  static styles = css`
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
  `;

  private readonly stylesController = new EffectorController(this, $styleSections);

  private scrollTargetId = '';

  render() {
    const section = getActiveSection(this.stylesController.value);
    if (!section) {
      return nothing;
    }
    return this.renderLayerStack(section);
  }

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

  private scrollToTarget(targetId: string): void {
    const element = this.shadowRoot?.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

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

  private onRemoveLayerClick(event: Event, sectionId: string, layerId: string): void {
    const log = contextLogger('po-style-layer-stack', 'onRemoveLayerClick');
    log.entry({ sectionId, layerId });
    event.stopPropagation();
    this.removeLayer(sectionId, layerId);
    log.exit();
  }

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

  private patchLayer(sectionId: string, layerId: string, patch: Partial<StyleLayer>): void {
    const log = contextLogger('po-style-layer-stack', 'patchLayer');
    log.entry({ sectionId, layerId, patchKeys: Object.keys(patch) });
    styleLayerUpdated({ sectionId, layerId, patch });
    log.exit();
  }

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
