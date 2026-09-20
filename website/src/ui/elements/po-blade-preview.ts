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
import type { PreviewSimState } from '../../preview/simulation.js';
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
import { PoElement } from './po-element.js';

const DEFAULT_PIXEL_COUNT = 144;
const HILT_ROTATOR_WIDTH_REM = 11;
const HILT_ASPECT = HILT_SVG_NATURAL_HEIGHT / HILT_SVG_NATURAL_WIDTH;

export class PoBladePreview extends PoElement {
  private activeSectionId = $styleSections.getState().activeSectionId;
  private simState: PreviewSimState = $previewSim.getState();

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

  private pixelCount = DEFAULT_PIXEL_COUNT;
  private previewTimeMs = 0;
  private resizeObserver: ResizeObserver | null = null;
  private unwatchWiring?: () => void;
  private unwatchStyles?: () => void;
  private unwatchSim?: () => void;
  private animFrame = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.unwatchWiring = $wiring.watch((blades) => {
      const main = blades.find((b) => b.type === 'ws2811');
      this.pixelCount = main?.pixels ?? blades[0]?.pixels ?? DEFAULT_PIXEL_COUNT;
      this.scheduleLayout();
    });
    this.unwatchStyles = $styleSections.watch((state) => {
      this.activeSectionId = state.activeSectionId;
      this.requestUpdate();
      this.scheduleLayout();
    });
    this.unwatchSim = $previewSim.watch((state) => {
      if (state === this.simState) {
        return;
      }
      this.simState = state;
      this.requestUpdate();
    });
    this.startAnimation();
  }

  disconnectedCallback(): void {
    this.unwatchWiring?.();
    this.unwatchStyles?.();
    this.unwatchSim?.();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
    super.disconnectedCallback();
  }

  protected firstUpdated(): void {
    const stack = this.renderRoot.querySelector<HTMLElement>('.saber-stack');
    const hilt = this.renderRoot.querySelector<HTMLImageElement>('.hilt-img');

    hilt?.addEventListener('load', () => this.scheduleLayout());
    hilt?.addEventListener('error', () => this.scheduleLayout());

    if (stack) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
      this.resizeObserver.observe(stack);
    }

    this.scheduleLayout();
  }

  render() {
    const { transition, powered } = this.simState;
    const combatReady = powered && transition === 'none';
    const canPowerOn =
      (!powered && transition === 'none') || transition === 'postoff';
    const canPowerOff =
      (powered && transition === 'none') ||
      transition === 'preon' ||
      transition === 'extending';
    const showBladeAngle = combatReady && this.simState.lockupActive;

    return html`
      <div class="saber-stack">
        <div class="blade-slot">
          <canvas class="preview-blade" aria-label="Blade preview"></canvas>
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
            Power on
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!canPowerOff} @click=${this.onPowerOff}>
            Power off
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onBlast}>
            Blast
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onClash}>
            Clash
          </wa-button>
          <wa-button size="small" variant="neutral" ?disabled=${!combatReady} @click=${this.onSwing}>
            Swing
          </wa-button>
        </div>
        <div class="preview-controls-row preview-controls-row--toggles">
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>Lockup</span>
            <wa-switch
              size="small"
              .checked=${this.simState.lockupActive}
              ?disabled=${!combatReady}
              @change=${this.onLockupChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>Lightning Block</span>
            <wa-switch
              size="small"
              .checked=${this.simState.lbActive}
              ?disabled=${!combatReady}
              @change=${this.onLbChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>Drag</span>
            <wa-switch
              size="small"
              .checked=${this.simState.dragActive}
              ?disabled=${!combatReady}
              @change=${this.onDragChange}
            ></wa-switch>
          </div>
          <div class="combat-toggle ${combatReady ? '' : 'combat-toggle--disabled'}">
            <span>Melt</span>
            <wa-switch
              size="small"
              .checked=${this.simState.meltActive}
              ?disabled=${!combatReady}
              @change=${this.onMeltChange}
            ></wa-switch>
          </div>
        </div>
        ${showBladeAngle
          ? html`
              <label class="blade-angle-control">
                <span class="blade-angle-label">
                  Blade angle
                  <span class="blade-angle-value"
                    >${Math.round(this.simState.bladeAngleNorm * 100)}%</span
                  >
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  .value=${String(Math.round(this.simState.bladeAngleNorm * 100))}
                  @input=${this.onBladeAngleInput}
                />
                <span class="blade-angle-hint">Moves responsive lockup zone (hilt ↔ tip)</span>
              </label>
            `
          : nothing}
      </div>

      <p class="preview-caption">
        Approximate preview (simplified layer math, not firmware) · ${this.activeSectionId || '—'}
        ${this.simState.transition !== 'none' ? ` · ${this.simState.transition}` : ''}
      </p>
    `;
  }

  private activeSection() {
    return getActiveSection($styleSections.getState()) ?? null;
  }

  private onPowerOn = (): void => {
    previewPowerOnClicked(this.activeSection());
  };

  private onPowerOff = (): void => {
    previewPowerOffClicked(this.activeSection());
  };

  private onBlast = (): void => {
    previewEventTriggered({ event: 'blast', section: this.activeSection() });
  };

  private onClash = (): void => {
    previewEventTriggered({ event: 'clash', section: this.activeSection() });
  };

  private onSwing = (): void => {
    previewEventTriggered({ event: 'swing', section: this.activeSection() });
  };

  private applySimState(): void {
    this.simState = $previewSim.getState();
    this.requestUpdate();
    this.scheduleLayout();
  }

  private onLockupChange = (event: Event): void => {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    previewLockupChanged(Boolean(control.checked));
    this.applySimState();
  };

  private onLbChange = (event: Event): void => {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    previewLbChanged(Boolean(control.checked));
    this.applySimState();
  };

  private onDragChange = (event: Event): void => {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    previewDragChanged(Boolean(control.checked));
    this.applySimState();
  };

  private onMeltChange = (event: Event): void => {
    const control = event.currentTarget as HTMLElement & { checked?: boolean };
    previewMeltChanged(Boolean(control.checked));
    this.applySimState();
  };

  private onBladeAngleInput = (event: Event): void => {
    const control = event.target as HTMLInputElement;
    previewBladeAngleChanged(Number(control.value) / 100);
    this.applySimState();
    this.layoutAndDraw();
  };

  private startAnimation(): void {
    const tick = () => {
      const now = performance.now();
      this.previewTimeMs = now;
      syncPreviewClock(now);
      this.simState = $previewSim.getState();
      this.layoutAndDraw();
      this.animFrame = requestAnimationFrame(tick);
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  private scheduleLayout = (): void => {
    requestAnimationFrame(() => this.layoutAndDraw());
  };

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
