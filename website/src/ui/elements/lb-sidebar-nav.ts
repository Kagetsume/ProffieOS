/**
 * Left sidebar — config file sections and export.
 *
 * @module ui/elements/lb-sidebar-nav
 */
import { html, nothing } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { parseRoute } from '../../router';
import {
  configRoutes,
  getRouteMeta,
  introRoutes,
  toolRoutes,
  type RouteId,
} from '../../route-config';
import { contextLogger } from '../../logger/index.js';
import {
  applySidebarCollapsed,
  getStoredSidebarCollapsed,
  setSidebarCollapsed,
} from '../sidebar-preference.js';
import { LbElement } from './lb-element.js';
import { sidebarNavI18n } from './lb-sidebar-nav.i18n.js';
import { sidebarNavKeys, sidebarNavRouteKeys } from './lb-sidebar-nav.keys.js';
import { lbSidebarNavStyles } from './lb-sidebar-nav.styles.js';

export class LbSidebarNav extends LbElement {
  private activeId: RouteId = parseRoute();

  static properties = {
    collapsed: { type: Boolean, reflect: true },
  };

  static styles = lbSidebarNavStyles;

  collapsed = false;

  /**
   * Subscribes to hash and custom route change events to keep active link in sync.
   *
   * @returns Nothing; registers listeners after calling `super.connectedCallback`.
   */
  connectedCallback(): void {
    const log = contextLogger('lb-sidebar-nav', 'connectedCallback');
    log.entry({ activeId: this.activeId });
    super.connectedCallback();
    this.collapsed = getStoredSidebarCollapsed();
    applySidebarCollapsed(this.collapsed);
    this.onRouteChange = this.onRouteChange.bind(this);
    window.addEventListener('hashchange', this.onRouteChange);
    document.addEventListener('lb-route-change', this.onRouteChange);
    this.activeId = parseRoute();
    log.exit({ activeId: this.activeId, collapsed: this.collapsed });
  }

  /**
   * Removes route change listeners when the sidebar is detached from the DOM.
   *
   * @returns Nothing; delegates to `super.disconnectedCallback` after cleanup.
   */
  disconnectedCallback(): void {
    const log = contextLogger('lb-sidebar-nav', 'disconnectedCallback');
    log.entry();
    window.removeEventListener('hashchange', this.onRouteChange);
    document.removeEventListener('lb-route-change', this.onRouteChange);
    super.disconnectedCallback();
    log.exit();
  }

  /**
   * Re-parses the current route and requests a re-render of nav link highlights.
   *
   * @returns Nothing; updates `activeId` and calls `requestUpdate`.
   */
  private onRouteChange(): void {
    const log = contextLogger('lb-sidebar-nav', 'onRouteChange');
    log.entry({ previousActiveId: this.activeId });
    this.activeId = parseRoute();
    this.requestUpdate();
    log.exit({ activeId: this.activeId });
  }

  /**
   * Persists sidebar width preference and updates layout classes.
   */
  private onToggleCollapsed = (): void => {
    this.collapsed = !this.collapsed;
    setSidebarCollapsed(this.collapsed);
  };

  /**
   * Renders one sidebar navigation link with icon, optional SD path, and stub badge.
   *
   * @param id Route identifier used for href and active-state comparison.
   * @param icon Font Awesome icon name for `wa-icon`.
   * @param sdPath Optional SD card config file path shown under the label.
   * @param stub When true, shows a subtle "soon" badge for unimplemented routes.
   * @returns Lit template for a single `<li>` navigation item.
   */
  private renderLink(id: RouteId, icon: string, sdPath?: string, stub?: boolean) {
    const current = this.activeId === id;
    const label = sidebarNavI18n.translate(sidebarNavRouteKeys[id]);
    const iconOnly = this.collapsed;
    return html`
      <li>
        <a
          class="nav-link ${stub ? 'nav-link--stub' : ''}"
          data-testid="sidebar-nav-link-${id}"
          href="#/${id}"
          aria-current=${current ? 'page' : 'false'}
          aria-label=${iconOnly ? label : nothing}
          title=${nothing}
        >
          <span class="nav-link-row">
            <wa-icon class="nav-icon" name=${icon} label=""></wa-icon>
            <span class="nav-label">${label}</span>
            ${stub
              ? html`<span class="nav-stub-badge" data-testid="sidebar-nav-stub-${id}"
                  >${sidebarNavI18n.translate(sidebarNavKeys.navStubSoon)}</span
                >`
              : nothing}
          </span>
          ${sdPath && !iconOnly ? html`<span class="nav-path">${sdPath}</span>` : nothing}
          ${iconOnly
            ? html`<span class="nav-hover-tooltip" role="tooltip">${label}</span>`
            : nothing}
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
    const renderRouteLink = (id: RouteId) => {
      const meta = getRouteMeta(id);
      return this.renderLink(id, meta?.icon ?? 'circle', meta?.sdPath, meta?.stub);
    };

    const toggleLabel = this.collapsed
      ? sidebarNavI18n.translate(sidebarNavKeys.toggleExpandAriaLabel)
      : sidebarNavI18n.translate(sidebarNavKeys.toggleCollapseAriaLabel);

    return html`
      <div class="sidebar-shell">
        <wa-button
          class="sidebar-toggle"
          data-testid="sidebar-nav-toggle"
          variant="neutral"
          appearance="plain"
          size="small"
          aria-expanded=${this.collapsed ? 'false' : 'true'}
          aria-label=${toggleLabel}
          @click=${this.onToggleCollapsed}
        >
          <wa-icon name="bars" aria-hidden="true"></wa-icon>
        </wa-button>
        <nav data-testid="sidebar-nav" aria-label=${sidebarNavI18n.translate(sidebarNavKeys.navAriaLabel)}>
          <div>
            <ul class="nav-list">
              ${introRoutes().map((route) => renderRouteLink(route.id))}
            </ul>
          </div>
          <div>
            <h2 class="nav-group-title">${sidebarNavI18n.translate(sidebarNavKeys.navConfigFiles)}</h2>
            <ul class="nav-list">
              ${configRoutes().map((route) => renderRouteLink(route.id))}
            </ul>
          </div>
          <div>
            <h2 class="nav-group-title">${sidebarNavI18n.translate(sidebarNavKeys.navOutput)}</h2>
            <ul class="nav-list">
              ${toolRoutes().map((route) => renderRouteLink(route.id))}
            </ul>
          </div>
        </nav>
      </div>
    `;
  }
}

customElements.define('lb-sidebar-nav', LbSidebarNav);
