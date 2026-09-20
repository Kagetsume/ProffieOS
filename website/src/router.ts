/**
 * Hash-based client router for static hosting.
 *
 * Routes use `location.hash` (`#/board`, `#/blades`, …). Sidebar navigation is
 * handled by {@link PoSidebarNav}; this module mounts page content into `#page-root`.
 *
 * @module router
 */
import {
  DEFAULT_ROUTE_ID,
  ROUTE_ALIASES,
  type RouteId,
} from './route-config';

/** Internal route registration record. */
type Route = {
  id: RouteId;
  label: string;
  mount: (root: HTMLElement) => () => void;
};

const routes: Route[] = [];

/**
 * Register a page route. Call from `main.ts` before `startRouter`.
 */
export function registerRoute(route: Route): void {
  routes.push(route);
}

/** All registered routes (read-only). */
export function getRoutes(): readonly Route[] {
  return routes;
}

/**
 * Parse the current hash into a route id. Defaults to {@link DEFAULT_ROUTE_ID}.
 */
export function parseRoute(): RouteId {
  const segment = location.hash.replace(/^#\/?/, '').split('/')[0] || DEFAULT_ROUTE_ID;
  const resolved = (ROUTE_ALIASES[segment] ?? segment) as RouteId;
  const match = routes.find((route) => route.id === resolved);
  return match?.id ?? DEFAULT_ROUTE_ID;
}

/** Navigate programmatically by setting the hash. */
export function navigate(id: RouteId): void {
  location.hash = `#/${id}`;
}

/**
 * Wire up hash navigation and page mounting.
 *
 * @param pageRoot - `#page-root` element where pages render
 * @returns Cleanup function (remove hash listener, unmount active page)
 */
export function startRouter(pageRoot: HTMLElement): () => void {
  let cleanup: (() => void) | null = null;

  const renderPage = () => {
    const id = parseRoute();
    cleanup?.();
    const route = routes.find((r) => r.id === id) ?? routes[0]!;
    cleanup = route.mount(pageRoot);
    document.dispatchEvent(new CustomEvent('po-route-change', { detail: { id } }));
  };

  window.addEventListener('hashchange', renderPage);
  renderPage();

  return () => {
    window.removeEventListener('hashchange', renderPage);
    cleanup?.();
  };
}
