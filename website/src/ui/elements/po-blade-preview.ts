/**
 * Upward-facing saber mock — rotated/scaled hilt SVG + vertical blade canvas above.
 *
 * @module ui/elements/po-blade-preview
 */
import { html, nothing, type PropertyValues } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { renderStylePreview } from '../../preview/frame.js';
import { HILT_SVG_URL } from '../../preview/hilt-asset.js';
import {
  HILT_SVG_NATURAL_HEIGHT,
  HILT_SVG_NATURAL_WIDTH,
  applyVerticalBladeCanvas,
  clipBladeVisibleLength,
  drawBladeWithSoftEdges,
  featherBladeSides,
  hiltVisualBoxFromRotatorWidth,
  measureVerticalSaberLayout,
} from '../../preview/vertical-layout.js';
import {
  previewCombatControlEnabled,
  sectionPreviewCapabilities,
} from '../../preview/preview-capabilities.js';
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
import {
  HILT_ROTATOR_WIDTH_REM,
  poBladePreviewStyles,
} from './po-blade-preview.styles.js';

const DEFAULT_PIXEL_COUNT = 144;

/**
 * Live saber style preview — vertical blade canvas, hilt graphic, and preview simulation controls.
 *
 * Renders the active style section onto a canvas and wires buttons/toggles to the preview store.
 */
export class PoBladePreview extends PoElement {
  private readonly stylesController = new EffectorController(this, $styleSections);
  private readonly simController = new EffectorController(this, $previewSim);
  private readonly wiringController = new EffectorController(this, $wiring);

  static styles = poBladePreviewStyles;

  private previewTimeMs = 0;
  private resizeObserver: ResizeObserver | null = null;
  private animFrame = 0;
  private layoutFrame = 0;
  private hiltLoadAbort: AbortController | null = null;
  private bladeSharpCanvas: HTMLCanvasElement | null = null;
  private bladeSharpCtx: CanvasRenderingContext2D | null = null;
  private stylesWatch?: () => void;

  /**
   * Starts the preview animation loop when the element is attached to the document.
   */
  connectedCallback(): void {
    const log = contextLogger('po-blade-preview', 'connectedCallback');
    log.entry();
    super.connectedCallback();
    this.stylesWatch = $styleSections.watch(() => {
      this.scheduleLayout();
    });
    this.startAnimation();
    log.exit();
  }

  /**
   * Tears down observers, pending animation frames, and hilt image listeners on detach.
   */
  disconnectedCallback(): void {
    const log = contextLogger('po-blade-preview', 'disconnectedCallback');
    log.entry();
    this.stylesWatch?.();
    this.stylesWatch = undefined;
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

  /**
   * Wires hilt image load/error handlers and a resize observer after the first render.
   */
  protected firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed);
    const stack = this.renderRoot.querySelector<HTMLElement>('[data-testid="blade-preview-stack"]');
    const hilt = this.renderRoot.querySelector<HTMLImageElement>('[data-testid="blade-preview-hilt"]');

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

  /**
   * Schedules a layout pass whenever Lit finishes an update that may affect sizing.
   */
  protected updated(changed: PropertyValues): void {
    super.updated(changed);
    this.scheduleLayout();
  }

  /**
   * Re-measures layout after the hilt SVG finishes loading.
   */
  private onHiltLoad(): void {
    const log = contextLogger('po-blade-preview', 'onHiltLoad');
    log.entry();
    log.debug('branch: hilt image loaded — scheduling layout');
    this.scheduleLayout();
    log.exit();
  }

  /**
   * Re-measures layout with fallback sizing when the hilt SVG fails to load.
   */
  private onHiltError(): void {
    const log = contextLogger('po-blade-preview', 'onHiltError');
    log.entry();
    log.debug('branch: hilt image failed — scheduling layout with fallback sizing');
    this.scheduleLayout();
    log.exit();
  }

  /**
   * Pixel count for preview rendering — prefers the first NeoPixel blade, else the first blade.
   *
   * @returns Number of LEDs to simulate on the preview canvas.
   */
  private get pixelCount(): number {
    const blades = this.wiringController.value;
    const main = blades.find((b) => b.type === 'ws2811');
    return main?.pixels ?? blades[0]?.pixels ?? DEFAULT_PIXEL_COUNT;
  }

  /**
   * Resolves the currently active style section from the styles store.
   *
   * @returns Active section object, or `null` when none is selected.
   */
  private activeSection() {
    return getActiveSection($styleSections.getState()) ?? null;
  }

  /**
   * Reads `checked` synchronously from a Web Awesome `wa-switch` change event.
   *
   * @param event - `change` event from the switch.
   * @returns Switch state, or `null` when it cannot be resolved.
   */
  private readSwitchChecked(event: Event): boolean | null {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    if (typeof control.checked === 'boolean') {
      return control.checked;
    }
    const input = control.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    return input ? input.checked : null;
  }

  /**
   * Dispatches a preview-store update from a `wa-switch` `change` event.
   *
   * @param event - `change` event from the switch.
   * @param dispatch - Effector event accepting the resolved checked value.
   */
  private onCombatSwitchChange = (
    event: Event,
    dispatch: (checked: boolean) => void,
  ): void => {
    const checked = this.readSwitchChecked(event);
    if (checked === null) {
      return;
    }
    dispatch(checked);
    this.scheduleLayout();
  };

  /**
   * Triggers the preview power-on transition for the active style section.
   */
  private onPowerOn = (): void => {
    const log = contextLogger('po-blade-preview', 'onPowerOn');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering power on', { sectionId: section?.id ?? null });
    previewPowerOnClicked(section);
    this.scheduleLayout();
    log.exit();
  };

  /**
   * Triggers the preview power-off transition for the active style section.
   */
  private onPowerOff = (): void => {
    const log = contextLogger('po-blade-preview', 'onPowerOff');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering power off', { sectionId: section?.id ?? null });
    previewPowerOffClicked(section);
    this.scheduleLayout();
    log.exit();
  };

  /**
   * Fires a one-shot blast effect on the active style section.
   */
  private onBlast = (): void => {
    const log = contextLogger('po-blade-preview', 'onBlast');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering blast event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'blast', section });
    this.scheduleLayout();
    log.exit();
  };

  /**
   * Fires a one-shot clash effect on the active style section.
   */
  private onClash = (): void => {
    const log = contextLogger('po-blade-preview', 'onClash');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering clash event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'clash', section });
    this.scheduleLayout();
    log.exit();
  };

  /**
   * Fires a one-shot swing effect on the active style section.
   */
  private onSwing = (): void => {
    const log = contextLogger('po-blade-preview', 'onSwing');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering swing event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'swing', section });
    this.scheduleLayout();
    log.exit();
  };

  /**
   * Fires a one-shot force effect on the active style section (`force_glow` overlay).
   */
  private onForce = (): void => {
    const log = contextLogger('po-blade-preview', 'onForce');
    log.entry();
    const section = this.activeSection();
    log.debug('branch: triggering force event', { sectionId: section?.id ?? null });
    previewEventTriggered({ event: 'force', section });
    this.scheduleLayout();
    log.exit();
  };

  /** @param event - Change/input event from the lockup `wa-switch`. */
  private onLockupChange = (event: Event): void => {
    this.onCombatSwitchChange(event, previewLockupChanged);
  };

  /** @param event - Change/input event from the lightning-block `wa-switch`. */
  private onLbChange = (event: Event): void => {
    this.onCombatSwitchChange(event, previewLbChanged);
  };

  /** @param event - Change/input event from the drag `wa-switch`. */
  private onDragChange = (event: Event): void => {
    this.onCombatSwitchChange(event, previewDragChanged);
  };

  /** @param event - Change/input event from the melt `wa-switch`. */
  private onMeltChange = (event: Event): void => {
    this.onCombatSwitchChange(event, previewMeltChanged);
  };

  /**
   * Updates normalized blade angle (0–1) from the lockup angle slider.
   *
   * @param event - Input event from the blade-angle range control.
   */
  private onBladeAngleInput = (event: Event): void => {
    const log = contextLogger('po-blade-preview', 'onBladeAngleInput');
    const control = event.target as HTMLInputElement;
    const norm = Number(control.value) / 100;
    log.entry({ value: control.value, norm });
    log.debug('branch: updating blade angle');
    previewBladeAngleChanged(norm);
    this.scheduleLayout();
    log.exit({ norm });
  };

  /**
   * Starts a `requestAnimationFrame` loop that syncs preview time and redraws the blade canvas.
   */
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

  /**
   * Coalesces layout and draw work to the next animation frame.
   */
  private scheduleLayout = (): void => {
    if (this.layoutFrame) {
      cancelAnimationFrame(this.layoutFrame);
    }
    this.layoutFrame = requestAnimationFrame(() => {
      this.onLayoutFrame();
    });
  };

  /**
   * Runs a single deferred layout-and-draw pass when still connected.
   */
  private onLayoutFrame(): void {
    this.layoutFrame = 0;
    if (!this.isConnected) {
      return;
    }
    this.layoutAndDraw();
  }

  /**
   * Measures the displayed hilt bounding box, falling back to CSS rem sizing.
   *
   * @returns Hilt display width and height in CSS pixels.
   */
  private measureHiltBox(): { width: number; height: number } {
    const stage = this.renderRoot.querySelector<HTMLElement>('[data-testid="blade-preview-hilt-stage"]');

    if (stage) {
      const rect = stage.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }

    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return hiltVisualBoxFromRotatorWidth(rootFont * HILT_ROTATOR_WIDTH_REM);
  }

  /**
   * Sizes the preview canvas from hilt layout and draws the current style frame.
   */
  private layoutAndDraw(): void {
    const canvas = this.renderRoot.querySelector<HTMLCanvasElement>(
      '[data-testid="blade-preview-canvas"]',
    );
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

  /**
   * Renders style preview pixels onto the blade canvas with tip clipping and length fraction.
   *
   * @param ctx - 2D canvas context configured for the blade element.
   * @param layout - Vertical saber layout metrics from {@link measureVerticalSaberLayout}.
   */
  private drawPreviewBlade(
    ctx: CanvasRenderingContext2D,
    layout: ReturnType<typeof measureVerticalSaberLayout>,
  ): void {
    const { bladeCssWidth, bladeCssHeight, bladeTipRadius, pixelCssHeight } = layout;
    const pixelCount = this.pixelCount;
    const section = getActiveSection($styleSections.getState());

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

    if (lengthFraction <= 0) {
      ctx.clearRect(0, 0, bladeCssWidth, bladeCssHeight);
      return;
    }

    const sharpCtx = this.ensureBladeSharpContext(layout);
    sharpCtx.clearRect(0, 0, bladeCssWidth, bladeCssHeight);
    const visibleHeight = bladeCssHeight * lengthFraction;
    sharpCtx.save();
    clipBladeVisibleLength(
      sharpCtx,
      bladeCssWidth,
      bladeCssHeight,
      bladeTipRadius,
      visibleHeight,
    );

    const count = frame.pixelCount;
    for (let i = 0; i < count; i += 1) {
      if (frame.pixels.a[i]! <= 0) {
        continue;
      }
      const y = bladeCssHeight - (i + 1) * pixelCssHeight;
      sharpCtx.fillStyle = `rgb(${frame.pixels.r[i]}, ${frame.pixels.g[i]}, ${frame.pixels.b[i]})`;
      sharpCtx.fillRect(0, y, bladeCssWidth, Math.ceil(pixelCssHeight) + 1);
    }

    featherBladeSides(sharpCtx, bladeCssWidth, bladeCssHeight);
    sharpCtx.restore();
    drawBladeWithSoftEdges(ctx, this.bladeSharpCanvas!, layout);
  }

  /**
   * Reuses an offscreen canvas for the sharp LED rows before edge softening.
   *
   * @param layout - Current vertical saber layout metrics.
   * @returns 2D context for the sharp pass (CSS pixel coordinates).
   */
  private ensureBladeSharpContext(
    layout: ReturnType<typeof measureVerticalSaberLayout>,
  ): CanvasRenderingContext2D {
    if (!this.bladeSharpCanvas) {
      this.bladeSharpCanvas = document.createElement('canvas');
    }
    const dpr = layout.devicePixelRatio;
    const backingW = layout.bladeBackingWidth;
    const backingH = layout.bladeBackingHeight;
    if (this.bladeSharpCanvas.width !== backingW || this.bladeSharpCanvas.height !== backingH) {
      this.bladeSharpCanvas.width = backingW;
      this.bladeSharpCanvas.height = backingH;
      this.bladeSharpCtx = null;
    }
    if (!this.bladeSharpCtx) {
      this.bladeSharpCtx = this.bladeSharpCanvas.getContext('2d');
    }
    if (!this.bladeSharpCtx) {
      throw new Error('2d context unavailable for blade sharp pass');
    }
    this.bladeSharpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return this.bladeSharpCtx;
  }

  /**
   * Builds the saber stack, preview controls, and status caption from store state.
   *
   * @returns Lit template for the full blade preview UI.
   */
  render() {
    const simState = this.simController.value;
    const stylesState = this.stylesController.value;
    const activeSectionId = stylesState.activeSectionId;
    const activeSection = getActiveSection(stylesState);
    const previewCaps = sectionPreviewCapabilities(activeSection, stylesState.sections);
    const { transition, powered } = simState;
    const combatReady = powered && transition === 'none';
    const canBlast = previewCombatControlEnabled(previewCaps, combatReady, 'blast');
    const canClash = previewCombatControlEnabled(previewCaps, combatReady, 'clash');
    const canSwing = previewCombatControlEnabled(previewCaps, combatReady, 'swing');
    const canForce = previewCombatControlEnabled(previewCaps, combatReady, 'force');
    const canLockup = previewCombatControlEnabled(previewCaps, combatReady, 'lockup');
    const canDrag = previewCombatControlEnabled(previewCaps, combatReady, 'drag');
    const canMelt = previewCombatControlEnabled(previewCaps, combatReady, 'melt');
    const canLb = previewCombatControlEnabled(previewCaps, combatReady, 'lb');
    const canPowerOn =
      (!powered && transition === 'none') || transition === 'postoff';
    const canPowerOff =
      (powered && transition === 'none') ||
      transition === 'preon' ||
      transition === 'extending';
    const showBladeAngle = combatReady && simState.lockupActive;

    return html`
      <div class="saber-stack" data-testid="blade-preview-stack">
        <div class="blade-slot">
          <canvas
            class="preview-blade"
            data-testid="blade-preview-canvas"
            aria-label=${bladePreviewI18n.translate(bladePreviewKeys.ariaLabel)}
          ></canvas>
        </div>
        <div class="hilt-stage" data-testid="blade-preview-hilt-stage">
          <div class="hilt-rotator">
            <img
              class="hilt-img"
              data-testid="blade-preview-hilt"
              src=${HILT_SVG_URL}
              alt=""
              width="${HILT_SVG_NATURAL_WIDTH}"
              height="${HILT_SVG_NATURAL_HEIGHT}"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <div class="preview-controls" data-testid="blade-preview-controls">
        <div class="preview-controls-row preview-controls-row--buttons">
          <wa-button
            data-testid="blade-preview-power-on"
            size="small"
            variant="brand"
            ?disabled=${!canPowerOn}
            @click=${this.onPowerOn}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.powerOn)}
          </wa-button>
          <wa-button
            data-testid="blade-preview-power-off"
            size="small"
            variant="neutral"
            ?disabled=${!canPowerOff}
            @click=${this.onPowerOff}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.powerOff)}
          </wa-button>
          <wa-button
            data-testid="blade-preview-blast"
            size="small"
            variant="neutral"
            ?disabled=${!canBlast}
            @click=${this.onBlast}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.blast)}
          </wa-button>
          <wa-button
            data-testid="blade-preview-clash"
            size="small"
            variant="neutral"
            ?disabled=${!canClash}
            @click=${this.onClash}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.clash)}
          </wa-button>
          <wa-button
            data-testid="blade-preview-swing"
            size="small"
            variant="neutral"
            ?disabled=${!canSwing}
            @click=${this.onSwing}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.swing)}
          </wa-button>
          <wa-button
            data-testid="blade-preview-force"
            size="small"
            variant="neutral"
            ?disabled=${!canForce}
            @click=${this.onForce}
          >
            ${bladePreviewI18n.translate(bladePreviewKeys.force)}
          </wa-button>
        </div>
        <div class="preview-controls-row preview-controls-row--toggles">
          <div class="combat-toggle ${canLockup ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.lockup)}</span>
            <wa-switch
              size="small"
              .checked=${simState.lockupActive}
              ?disabled=${!canLockup}
              @change=${this.onLockupChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${canLb ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.lightningBlock)}</span>
            <wa-switch
              size="small"
              .checked=${simState.lbActive}
              ?disabled=${!canLb}
              @change=${this.onLbChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${canDrag ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.drag)}</span>
            <wa-switch
              size="small"
              .checked=${simState.dragActive}
              ?disabled=${!canDrag}
              @change=${this.onDragChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${canMelt ? '' : 'combat-toggle--disabled'}">
            <span>${bladePreviewI18n.translate(bladePreviewKeys.melt)}</span>
            <wa-switch
              size="small"
              .checked=${simState.meltActive}
              ?disabled=${!canMelt}
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
}

customElements.define('po-blade-preview', PoBladePreview);
