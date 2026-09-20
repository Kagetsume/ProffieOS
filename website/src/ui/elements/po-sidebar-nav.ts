/**
 * Left sidebar — config file sections and export.
 */
import { html, css, nothing } from 'lit';
import { parseRoute } from '../../router';
import {
  configRoutes,
  introRoutes,
  toolRoutes,
  type RouteId,
} from '../../route-config';
import { PoElement } from './po-element.js';

export class PoSidebarNav extends PoElement {
  private activeId: RouteId = parseRoute();

  static styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }

      nav {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .nav-group-title {
        margin: 0 0 0.35rem;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        opacity: 0.65;
      }

      .nav-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .nav-link {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        padding: 0.55rem 0.65rem;
        border-radius: var(--wa-border-radius-medium, 6px);
        text-decoration: none;
        color: inherit;
        border: 1px solid transparent;
        transition: background 0.15s ease;
      }

      .nav-link:hover {
        background: var(--wa-color-neutral-90, #e4e4e7);
      }

      .nav-link[aria-current='page'] {
        background: var(--wa-color-brand-95, #e0f2fe);
        border-color: var(--wa-color-brand-80, #7dd3fc);
        font-weight: 600;
      }

      .nav-label {
        font-size: 0.925rem;
        line-height: 1.25;
      }

      .nav-path {
        font-family: ui-monospace, monospace;
        font-size: 0.72rem;
        opacity: 0.7;
        line-height: 1.2;
        word-break: break-all;
      }

      .nav-link--stub .nav-label::after {
        content: ' · soon';
        font-weight: normal;
        font-size: 0.75rem;
        opacity: 0.65;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    this.onRouteChange = this.onRouteChange.bind(this);
    window.addEventListener('hashchange', this.onRouteChange);
    document.addEventListener('po-route-change', this.onRouteChange);
    this.activeId = parseRoute();
  }

  disconnectedCallback(): void {
    window.removeEventListener('hashchange', this.onRouteChange);
    document.removeEventListener('po-route-change', this.onRouteChange);
    super.disconnectedCallback();
  }

  private onRouteChange(): void {
    this.activeId = parseRoute();
    this.requestUpdate();
  }

  render() {
    return html`
      <nav aria-label="Application sections">
        <div>
          <ul class="nav-list">
            ${introRoutes().map((route) => this.renderLink(route.id, route.label, route.sdPath, route.stub))}
          </ul>
        </div>
        <div>
          <h2 class="nav-group-title">Config files</h2>
          <ul class="nav-list">
            ${configRoutes().map((route) => this.renderLink(route.id, route.label, route.sdPath, route.stub))}
          </ul>
        </div>
        <div>
          <h2 class="nav-group-title">Output</h2>
          <ul class="nav-list">
            ${toolRoutes().map((route) => this.renderLink(route.id, route.label, route.sdPath, route.stub))}
          </ul>
        </div>
      </nav>
    `;
  }

  private renderLink(id: RouteId, label: string, sdPath?: string, stub?: boolean) {
    const current = this.activeId === id;
    return html`
      <li>
        <a
          class="nav-link ${stub ? 'nav-link--stub' : ''}"
          href="#/${id}"
          aria-current=${current ? 'page' : 'false'}
        >
          <span class="nav-label">${label}</span>
          ${sdPath ? html`<span class="nav-path">${sdPath}</span>` : nothing}
        </a>
      </li>
    `;
  }
}

customElements.define('po-sidebar-nav', PoSidebarNav);
