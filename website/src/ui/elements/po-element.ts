/**
 * Base class for ProffieOS Lit components that host Web Awesome (`wa-*`) tags.
 *
 * Web Awesome's autoloader only observes the document tree — not open shadow roots.
 * {@link discover} scans a root for `:not(:defined)` `wa-*` elements and loads them.
 * This base class re-runs `discover` on the shadow root after Lit updates and when
 * the shadow subtree mutates.
 *
 * @see https://github.com/shoelace-style/shoelace/pull/1236
 * @module ui/elements/po-element
 */
import { LitElement, type PropertyValues } from 'lit';
import { discover } from '@awesome.me/webawesome';
import { contextLogger } from '../../logger/index.js';

type DiscoverRoot = Document | Element | ShadowRoot;

/** Debounced `discover()` for one shadow root (shared scheduling per element). */
async function runWebAwesomeDiscover(root: DiscoverRoot): Promise<void> {
  const log = contextLogger('po-element', 'runWebAwesomeDiscover');
  log.entry();
  try {
    await discover(root);
    log.exit();
  } catch (error) {
    log.warn('Web Awesome discover failed:', error);
    log.exit('failed', error);
  }
}

/**
 * Superclass for all `<po-*>` Lit components using shadow DOM + Web Awesome.
 */
export class PoElement extends LitElement {
  private waObserver: MutationObserver | null = null;
  private discoverFrame = 0;

  connectedCallback(): void {
    const log = contextLogger('po-element', 'connectedCallback');
    log.entry({ tagName: this.tagName });
    super.connectedCallback();
    log.exit();
  }

  disconnectedCallback(): void {
    const log = contextLogger('po-element', 'disconnectedCallback');
    log.entry({ tagName: this.tagName, hasPendingFrame: !!this.discoverFrame });
    this.stopWebAwesomeObserver();
    if (this.discoverFrame) {
      log.debug('branch: cancel pending discover frame', { frame: this.discoverFrame });
      cancelAnimationFrame(this.discoverFrame);
      this.discoverFrame = 0;
    }
    super.disconnectedCallback();
    log.exit();
  }

  protected firstUpdated(_changed: PropertyValues): void {
    this.startWebAwesomeObserver();
    this.scheduleWebAwesomeDiscover();
  }

  protected updated(_changed: PropertyValues): void {
    this.scheduleWebAwesomeDiscover();
  }

  /** Observe shadow-root mutations so dynamically added `wa-*` tags are discovered. */
  private startWebAwesomeObserver(): void {
    this.stopWebAwesomeObserver();
    const root = this.renderRoot;
    if (!(root instanceof ShadowRoot || root instanceof HTMLElement)) {
      return;
    }

    this.waObserver = new MutationObserver(() => {
      this.scheduleWebAwesomeDiscover();
    });
    this.waObserver.observe(root, { childList: true, subtree: true });
  }

  private stopWebAwesomeObserver(): void {
    this.waObserver?.disconnect();
    this.waObserver = null;
  }

  /** Coalesce discover calls to one animation frame (Lit batches DOM writes). */
  private scheduleWebAwesomeDiscover(): void {
    if (this.discoverFrame) {
      cancelAnimationFrame(this.discoverFrame);
    }
    this.discoverFrame = requestAnimationFrame(() => {
      this.discoverFrame = 0;
      const root = this.renderRoot;
      if (root instanceof ShadowRoot || root instanceof HTMLElement) {
        void runWebAwesomeDiscover(root);
      }
    });
  }
}
