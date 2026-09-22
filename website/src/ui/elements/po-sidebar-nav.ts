/**
 * Left sidebar — config file sections and export.
 */
import { html, nothing } from 'lit';
import { parseRoute } from '../../router';
import {
  configRoutes,
  introRoutes,
  toolRoutes,
  type RouteId,
} from '../../route-config';
import { contextLogger } from '../../logger/index.js';
import { PoElement } from './po-element.js';
import { sidebarNavI18n } from './po-sidebar-nav.i18n.js';
import { sidebarNavKeys, sidebarNavRouteKeys } from './po-sidebar-nav.keys.js';
import { poSidebarNavStyles } from './po-sidebar-nav.styles.js';

export class PoSidebarNav extends PoElement {
  private activeId: RouteId = parseRoute();

  static styles = poSidebarNavStyles;

  /**
   * Subscribes to hash and custom route change events to keep active link in sync.
   *
   * @returns Nothing; registers listeners after calling `super.connectedCallback`.
   */
  connectedCallback(): void {
    const log = contextLogger('po-sidebar-nav', 'connectedCallback');
    log.entry({ activeId: this.activeId });
    super.connectedCallback();
    this.onRouteChange = this.onRouteChange.bind(this);
    window.addEventListener('hashchange', this.onRouteChange);
    document.addEventListener('po-route-change', this.onRouteChange);
    this.activeId = parseRoute();
    log.exit({ activeId: this.activeId });
  }

  /**
   * Removes route change listeners when the sidebar is detached from the DOM.
   *
   * @returns Nothing; delegates to `super.disconnectedCallback` after cleanup.
   */
  disconnectedCallback(): void {
    const log = contextLogger('po-sidebar-nav', 'disconnectedCallback');
    log.entry();
    window.removeEventListener('hashchange', this.onRouteChange);
    document.removeEventListener('po-route-change', this.onRouteChange);
    super.disconnectedCallback();
    log.exit();
  }

  /**
   * Re-parses the current route and requests a re-render of nav link highlights.
   *
   * @returns Nothing; updates `activeId` and calls `requestUpdate`.
   */
  private onRouteChange(): void {
    const log = contextLogger('po-sidebar-nav', 'onRouteChange');
    log.entry({ previousActiveId: this.activeId });
    this.activeId = parseRoute();
    this.requestUpdate();
    log.exit({ activeId: this.activeId });
  }

  /**
   * Renders one sidebar navigation link with optional SD path and stub badge.
   *
   * @param id Route identifier used for href and active-state comparison.
   * @param sdPath Optional SD card config file path shown under the label.
   * @param stub When true, appends a "coming soon" badge for unimplemented routes.
   * @returns Lit template for a single `<li>` navigation item.
   */
  private renderLink(id: RouteId, sdPath?: string, stub?: boolean) {
    const current = this.activeId === id;
    const label = sidebarNavI18n.translate(sidebarNavRouteKeys[id]);
    return html`
      <li>
        <a
          class="nav-link ${stub ? 'nav-link--stub' : ''}"
          data-testid="sidebar-nav-link-${id}"
          href="#/${id}"
          aria-current=${current ? 'page' : 'false'}
        >
          <span class="nav-label"
            >${label}${stub
              ? html`<span class="nav-stub-soon">${sidebarNavI18n.translate(sidebarNavKeys.navStubSoon)}</span>`
              : nothing}</span
          >
          ${sdPath ? html`<span class="nav-path">${sdPath}</span>` : nothing}
        </a>
      </li>
    `;
  }

  /**
   * Renders grouped sidebar navigation links for intro, config, and export routes.
   *
   * @returns Lit template for the full sidebar navigation tree.
   */
  render() {
    return html`
      <nav data-testid="sidebar-nav" aria-label=${sidebarNavI18n.translate(sidebarNavKeys.navAriaLabel)}>
        <div>
          <ul class="nav-list">
            ${introRoutes().map((route) => this.renderLink(route.id, route.sdPath, route.stub))}
          </ul>
        </div>
        <div>
          <h2 class="nav-group-title">${sidebarNavI18n.translate(sidebarNavKeys.navConfigFiles)}</h2>
          <ul class="nav-list">
            ${configRoutes().map((route) => this.renderLink(route.id, route.sdPath, route.stub))}
          </ul>
        </div>
        <div>
          <h2 class="nav-group-title">${sidebarNavI18n.translate(sidebarNavKeys.navOutput)}</h2>
          <ul class="nav-list">
            ${toolRoutes().map((route) => this.renderLink(route.id, route.sdPath, route.stub))}
          </ul>
        </div>
      </nav>
    `;
  }
}

customElements.define('po-sidebar-nav', PoSidebarNav);
