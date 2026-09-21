/**
 * Upward-facing saber mock — rotated/scaled hilt SVG + vertical blade canvas above.
 */
import { html, css, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { renderStylePreview } from '../../preview/frame.js';
import { HILT_SVG_URL } from '../../preview/hilt-asset.js';
import {
  HILT_SVG_NATURAL_HEIGHT,
  HILT_SVG_NATURAL_WIDTH,
  applyVerticalBladeCanvas,
  clipBladeSilhouette,
  hiltVisualBoxFromRotatorWidth,
  measureVerticalSaberLayout,
} from '../../preview/vertical-layout.js';
import {
  $previewSim,
  previewBladeAngleChanged,
  previewEventTriggered,
  previewDragChanged,
  previewLbChanged,
  previewLockupChanged,
  previewMeltChanged,
  previewPowerOffClicked,
  previewPowerOnClicked,
  syncPreviewClock,
} from '../../stores/previewEvents.js';
import { $styleSections, getActiveSection } from '../../stores/styleSections.js';
import { $wiring } from '../../stores/wiring.js';
import { contextLogger } from '../../logger/index.js';
import { EffectorController } from '../effector-controller.js';
import { PoElement } from './po-element.js';
import { bladePreviewI18n } from './po-blade-preview.i18n.js';
import { bladePreviewKeys } from './po-blade-preview.keys.js';

const DEFAULT_PIXEL_COUNT = 144;
const HILT_ROTATOR_WIDTH_REM = 11;
const HILT_ASPECT = HILT_SVG_NATURAL_HEIGHT / HILT_SVG_NATURAL_WIDTH;

export class PoBladePreview extends PoElement {
  private readonly stylesController = new EffectorController(this, $styleSections);
  private readonly simController = new EffectorController(this, $previewSim);
  private readonly wiringController = new EffectorController(this, $wiring);

  static styles = css`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    .saber-stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      width: fit-content;
      max-width: 100%;
      margin: 0 auto;
    }

    .blade-slot {
      display: flex;
      justify-content: center;
      width: 100%;
      flex-shrink: 0;
    }

    .preview-blade {
      display: block;
      flex-shrink: 0;
      box-shadow: 0 0 14px rgba(100, 200, 255, 0.4);
    }

    .hilt-stage {
      position: relative;
      flex-shrink: 0;
      width: calc(${HILT_ROTATOR_WIDTH_REM}rem * ${HILT_ASPECT});
      height: ${HILT_ROTATOR_WIDTH_REM}rem;
      max-width: 85%;
    }

    .hilt-rotator {
      position: absolute;
      left: 50%;
      top: 50%;
      width: ${HILT_ROTATOR_WIDTH_REM}rem;
      transform: translate(-50%, -50%) rotate(-90deg);
      transform-origin: center center;
    }

    .hilt-img {
      display: block;
      width: 100%;
      height: auto;
      pointer-events: none;
      user-select: none;
    }

    .preview-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
      margin: 0.75rem 0 0;
      width: 100%;
    }

    .preview-controls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      justify-content: center;
      width: 100%;
    }

    .preview-controls-row--buttons wa-button {
      min-width: 4.5rem;
    }

    .combat-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8125rem;
      font-weight: 600;
      padding: 0.15rem 0.35rem;
      opacity: 0.85;
    }

    .combat-toggle--disabled {
      opacity: 0.45;
      pointer-events: none;
    }

    .blade-angle-control {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      width: min(100%, 16rem);
      margin-top: 0.15rem;
      font-size: 0.8125rem;
      font-weight: 600;
    }

    .blade-angle-label {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .blade-angle-value {
      font-weight: normal;
      font-variant-numeric: tabular-nums;
      opacity: 0.75;
    }

    .blade-angle-control input[type='range'] {
      width: 100%;
      margin: 0;
      accent-color: var(--wa-color-brand-50, #0ea5e9);
    }

    .blade-angle-hint {
      font-weight: normal;
      font-size: 0.75rem;
      opacity: 0.7;
      line-height: 1.35;
    }

    .preview-caption {
      margin: 0.5rem 0 0;
      font-size: 0.7rem;
      opacity: 0.6;
      text-align: center;
    }
  `;

  private previewTimeMs = 0;
  private resizeObserver: ResizeObserver | null = null;
  private animFrame = 0;
  private layoutFrame = 0;
  private hiltLoadAbort: AbortController | null = null;

  connectedCallback(): void {
    const log = contextLogger('po-blade-preview', 'connectedCallback');
    log.entry();
    super.connectedCallback();
    this.startAnimation();
    log.exit();
  }

  disconnectedCallback(): void {
    const log = contextLogger('po-blade-preview', 'disconnectedCallback');
    log.entry();
    if (this.hiltLoadAbort) {
      log.debug('branch: aborting hilt image load');
      this.hiltLoadAbort.abort();
    }
    this.hiltLoadAbort = null;
    if (this.resizeObserver) {
      log.debug('branch: disconnecting resize observer');
      this.resizeObserver.disconnect();
    }
    this.resizeObserver = null;
    if (this.layoutFrame) {
      log.debug('branch: cancelling pending layout frame');
      cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = 0;
    }
    if (this.animFrame) {
      log.debug('branch: cancelling animation frame');
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
    super.disconnectedCallback();
    log.exit();
  }

  protected firstUpdated(): void {
    const stack = this.renderRoot.querySelector<HTMLElement>('.saber-stack');
    const hilt = this.renderRoot.querySelector<HTMLImageElement>('.hilt-img');

    this.hiltLoadAbort?.abort();
    this.hiltLoadAbort = new AbortController();
    const { signal } = this.hiltLoadAbort;
    if (hilt) {
      hilt.addEventListener('load', () => this.onHiltLoad(), { signal });
      hilt.addEventListener('error', () => this.onHiltError(), { signal });
    }

    if (stack) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
      this.resizeObserver.observe(stack);
    }

    this.scheduleLayout();
  }

  private onHiltLoad(): void {
    const log = contextLogger('po-blade-preview', 'onHiltLoad');
    log.entry();
    log.debug('branch: hilt image loaded — scheduling layout');
    this.scheduleLayout();
    log.exit();
  }

  private onHiltError(): void {
    const log = contextLogger('po-blade-preview', 'onHiltError');
    log.entry();
    log.debug('branch: hilt image failed — scheduling layout with fallback sizing');
    this.scheduleLayout();
    log.exit();
  }

  protected updated(): void {
    this.scheduleLayout();
  }

  private get pixelCount(): number {
    const blades = this.wiringController.value;
    const main = blades.find((b) => b.type === 'ws2811');
    return main?.pixels ?? blades[0]?.pixels ?? DEFAULT_PIXEL_COUNT;
  }

  render() {
    const simState = this.simController.value;
    const activeSectionId = this.stylesController.value.activeSectionId;
    const { transition, powered } = simState;
    const combatReady = powered && transition === 'none';
    const canPowerOn =
      (!powered && transition === 'none') || transition === 'postoff';
    const canPowerOff =
      (powered && transition === 'none') ||
      transition === 'preon' ||
      transition === 'extending';
    const showBladeAngle = combatReady && simState.lockupActive;

    return html`
      <div class="saber-stack">
        <div class="blade-slot">
          <canvas class="preview-blade" aria-label=${bladePreviewI18n.translate(bladePreviewKeys.ariaLabel)}></canvas>
        </div>
        <div class="hilt-stage">
          <div class="hilt-rotator">
            <img
              class="hilt-img"
              src=${HILT_SVG_URL}
              alt=""
              width="${HILT_SVG_NATURAL_WIDTH}"
              height="${HILT_SVG_NATURAL_HEIGHT}"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div class="preview-controls">
        <div class="preview-controls-row preview-controls-row--buttons">
          <wa-button size="small" variant="brand" ?disabled=${!canPowerOn} @click=${this.onPowerOn}>
            ${bladePreviewI18n.translate(bladePreviewKeys.powerOn)}
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!canPowerOff} @click=${this.onPowerOff}>
            ${bladePreviewI18n.translate(bladePreviewKeys.powerOff)}
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onBlast}>
            ${bladePreviewI18n.translate(bladePreviewKeys.blast)}
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onClash}>
            ${bladePreviewI18n.translate(bladePreviewKeys.clash)}
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onSwing}>
            ${bladePreviewI18n.translate(bladePreviewKeys.swing)}
          </wa-button>
        </div>
        <div class="preview-controls-row preview-controls-row--toggles">
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.lockup)}</span>
            <wa-switch
              size="small"
              .checked=${simState.lockupActive}
              ?disabled=${!combatReady}
              @change=${this.onLockupChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.lightningBlock)}</span>
            <wa-switch
              size="small"
              .checked=${simState.lbActive}
              ?disabled=${!combatReady}
              @change=${this.onLbChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.drag)}</span>
            <wa-switch
              size="small"
              .checked=${simState.dragActive}
              ?disabled=${!combatReady}
              @change=${this.onDragChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.melt)}</span>
            <wa-switch
              size="small"
              .checked=${simState.meltActive}
              ?disabled=${!combatReady}
              @change=${this.onMeltChange}
            ></wa-switch>
          </div>
        </div>
        ${showBladeAngle
          ? html`
              <label class="blade-angle-control">
                <span class="blade-angle-label">
                  ${bladePreviewI18n.translate(bladePreviewKeys.bladeAngle)}
                  <span class="blade-angle-value"
                    >${Math.round(simState.bladeAngleNorm * 100)}%</span
                  >
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(simState.bladeAngleNorm * 100))}
                  @input=${this.onBladeAngleInput}
                />
                <span class="blade-angle-hint">${bladePreviewI18n.translate(bladePreviewKeys.bladeAngleHint)}</span>
              </label>
            `
          : nothing}
      </div>

      <p class="preview-caption">
        ${bladePreviewI18n.translate(bladePreviewKeys.caption, {
          sectionId: activeSectionId || '—',
          transitionSuffix:
            simState.transition !== 'none' ? ` · ${simState.transition}` : '',
        })}
      </p>
    `;
  }

  private activeSection() {
    return getActiveSection(this.stylesController.value) ?? null;
  }

  private onPowerOn = (): void => {
    const log = contextLogger('po-blade-preview', 'onPowerOn');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering power on', { sectionId: section?.id ?? null });
    previewPowerOnClicked(section);
    log.exit();
  };

  private onPowerOff = (): void => {
    const log = contextLogger('po-blade-preview', 'onPowerOff');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering power off', { sectionId: section?.id ?? null });
    previewPowerOffClicked(section);
    log.exit();
  };

  private onBlast = (): void => {
    const log = contextLogger('po-blade-preview', 'onBlast');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering blast event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'blast', section });
    log.exit();
  };

  private onClash = (): void => {
    const log = contextLogger('po-blade-preview', 'onClash');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering clash event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'clash', section });
    log.exit();
  };

  private onSwing = (): void => {
    const log = contextLogger('po-blade-preview', 'onSwing');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering swing event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'swing', section });
    log.exit();
  };

  private onLockupChange = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onLockupChange');
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    const checked = Boolean(control.checked);
    log.entry({ checked });
    log.debug('branch: updating lockup state');
    previewLockupChanged(checked);
    log.exit({ checked });
  };

  private onLbChange = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onLbChange');
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    const checked = Boolean(control.checked);
    log.entry({ checked });
    log.debug('branch: updating lightning block state');
    previewLbChanged(checked);
    log.exit({ checked });
  };

  private onDragChange = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onDragChange');
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    const checked = Boolean(control.checked);
    log.entry({ checked });
    log.debug('branch: updating drag state');
    previewDragChanged(checked);
    log.exit({ checked });
  };

  private onMeltChange = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onMeltChange');
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    const checked = Boolean(control.checked);
    log.entry({ checked });
    log.debug('branch: updating melt state');
    previewMeltChanged(checked);
    log.exit({ checked });
  };

  private onBladeAngleInput = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onBladeAngleInput');
    const control = event.target as HTMLInputElement;
    const norm = Number(control.value) / 100;
    log.entry({ value: control.value, norm });
    log.debug('branch: updating blade angle');
    previewBladeAngleChanged(norm);
    log.exit({ norm });
  };

  private startAnimation(): void {
    const log = contextLogger('po-blade-preview', 'startAnimation');
    log.entry();
    const tick = () => {
      if (!this.isConnected) {
        log.debug('branch: disconnected — stopping animation loop');
        this.animFrame = 0;
        return;
      }
      const now = performance.now();
      this.previewTimeMs = now;
      syncPreviewClock(now);
      this.layoutAndDraw();
      this.animFrame = requestAnimationFrame(tick);
    };
    log.debug('branch: scheduling animation loop');
    this.animFrame = requestAnimationFrame(tick);
    log.exit('scheduled');
  }

  private scheduleLayout = (): void => {
    if (this.layoutFrame) {
      cancelAnimationFrame(this.layoutFrame);
    }
    this.layoutFrame = requestAnimationFrame(() => {
      this.onLayoutFrame();
    });
  };

  private onLayoutFrame(): void {
    this.layoutFrame = 0;
    if (!this.isConnected) {
      return;
    }
    this.layoutAndDraw();
  }

  private measureHiltBox(): { width: number; height: number } {
    const stage = this.renderRoot.querySelector<HTMLElement>('.hilt-stage');

    if (stage) {
      const rect = stage.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }

    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return hiltVisualBoxFromRotatorWidth(rootFont * HILT_ROTATOR_WIDTH_REM);
  }

  private layoutAndDraw(): void {
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>('.preview-blade');
    if (!canvas) {
      return;
    }

    const hilt = this.measureHiltBox();
    const layout = measureVerticalSaberLayout({
      hiltDisplayWidth: hilt.width,
      hiltDisplayHeight: hilt.height,
      pixelCount: this.pixelCount,
      devicePixelRatio: window.devicePixelRatio || 1,
    });

    const ctx = applyVerticalBladeCanvas(canvas, layout);
    this.drawPreviewBlade(ctx, layout);
  }

  private drawPreviewBlade(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof measureVerticalSaberLayout>,
  ): void {
    const { bladeCssWidth, bladeCssHeight, bladeTipRadius, pixelCssHeight } = layout;
    const pixelCount = this.pixelCount;
    const section = getActiveSection(this.stylesController.value);

    if (!section) {
      return;
    }

    const frame = renderStylePreview(
      section,
      pixelCount,
      this.previewTimeMs,
      $previewSim.getState(),
    );
    const lengthFraction = frame.lengthFraction;
    ctx.clearRect(0, 0, bladeCssWidth, bladeCssHeight);

    if (lengthFraction <= 0) {
      return;
    }

    ctx.save();
    clipBladeSilhouette(ctx, bladeCssWidth, bladeCssHeight, bladeTipRadius);

    const visibleHeight = bladeCssHeight * lengthFraction;
    ctx.beginPath();
    ctx.rect(0, bladeCssHeight - visibleHeight, bladeCssWidth, visibleHeight);
    ctx.clip();

    const count = frame.pixelCount;
    for (let i = 0; i < count; i += 1) {
      if (frame.pixels.a[i]! <= 0) {
        continue;
      }
      const y = bladeCssHeight - (i + 1) * pixelCssHeight;
      ctx.fillStyle = `rgb(${frame.pixels.r[i]}, ${frame.pixels.g[i]}, ${frame.pixels.b[i]})`;
      ctx.fillRect(0, y, bladeCssWidth, Math.ceil(pixelCssHeight) + 1);
    }

    ctx.restore();
  }
}

customElements.define('po-blade-preview', PoBladePreview);
