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

/**
 * Runs Web Awesome's `discover()` on a DOM root so undefined `wa-*` custom elements
 * inside shadow DOM are registered and upgraded.
 *
 * Failures are logged and swallowed so a broken discover call does not crash the host
 * component.
 *
 * @param root - Document, element, or shadow root to scan for undefined `wa-*` tags.
 * @returns Resolves when `discover` completes (or after logging a failure).
 */
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
 *
 * Automatically discovers and upgrades `wa-*` elements rendered into the component's
 * shadow root after Lit updates and on subtree mutations.
 */
export class PoElement extends LitElement {
  private waObserver: MutationObserver | null = null;
  private discoverFrame = 0;

  /**
   * Lit lifecycle hook invoked when the element is inserted into the document.
   *
   * Delegates to `LitElement.connectedCallback` after logging the host tag name.
   *
   * @returns Nothing.
   */
  connectedCallback(): void {
    const log = contextLogger('po-element', 'connectedCallback');
    log.entry({ tagName: this.tagName });
    super.connectedCallback();
    log.exit();
  }

  /**
   * Lit lifecycle hook invoked when the element is removed from the document.
   *
   * Stops the Web Awesome mutation observer, cancels any pending discover animation
   * frame, then delegates to `LitElement.disconnectedCallback`.
   *
   * @returns Nothing.
   */
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

  /**
   * Lit lifecycle hook invoked after the first render completes.
   *
   * Starts observing shadow-root mutations and schedules an initial Web Awesome
   * discover pass.
   *
   * @param _changed - Map of property names to previous values (unused).
   * @returns Nothing.
   */
  protected firstUpdated(_changed: PropertyValues): void {
    this.startWebAwesomeObserver();
    this.scheduleWebAwesomeDiscover();
  }

  /**
   * Lit lifecycle hook invoked after every subsequent render.
   *
   * Schedules a coalesced Web Awesome discover pass so newly rendered `wa-*` tags
   * are upgraded.
   *
   * @param _changed - Map of property names to previous values (unused).
   * @returns Nothing.
   */
  protected updated(_changed: PropertyValues): void {
    this.scheduleWebAwesomeDiscover();
  }

  /**
   * Attaches a `MutationObserver` on the render root to detect dynamically added
   * `wa-*` elements and trigger discover when the shadow subtree changes.
   *
   * No-op when the render root is neither a `ShadowRoot` nor an `HTMLElement`.
   *
   * @returns Nothing.
   */
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

  /**
   * Disconnects and clears the Web Awesome mutation observer, if one is active.
   *
   * @returns Nothing.
   */
  private stopWebAwesomeObserver(): void {
    this.waObserver?.disconnect();
    this.waObserver = null;
  }

  /**
   * Coalesces discover calls to a single animation frame so rapid Lit DOM writes
   * trigger at most one `discover` per frame.
   *
   * Cancels any previously scheduled frame before requesting a new one.
   *
   * @returns Nothing.
   */
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
