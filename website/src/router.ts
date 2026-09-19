/**
 * Hash-based client router for static hosting.
 *
 * Routes use `location.hash` (`#/wiring`, `#/export`) so no server rewrite rules
 * are needed. Each route provides a `mount` function that returns cleanup.
 *
 * @module router
 */

/** Known application routes (Phase 1). */
export type RouteId = 'wiring' | 'export';

/** Internal route registration record. */
type Route = {
  id: RouteId;
  hash: string;
  label: string;
  /** Mount page into `root`; return function to unsubscribe/remove listeners. */
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
 * Parse the current hash into a route id. Defaults to `wiring`.
 */
export function parseRoute(): RouteId {
  const hash = location.hash.replace(/^#\/?/, '') || 'wiring';
  const match = routes.find((r) => r.id === hash);
  return match?.id ?? 'wiring';
}

/** Navigate programmatically by setting the hash. */
export function navigate(id: RouteId): void {
  location.hash = `#/${id}`;
}

/**
 * Wire up hash navigation, top nav buttons, and page mounting.
 *
 * @param pageRoot - `#page-root` element where pages render
 * @param navRoot - `#nav` element for route buttons
 * @returns Cleanup function (remove hash listener, unmount active page)
 */
export function startRouter(pageRoot: HTMLElement, navRoot: HTMLElement): () => void {
  let cleanup: (() => void) | null = null;

  const renderNav = (activeId: RouteId) => {
    navRoot.innerHTML = routes
      .map(
        (r) =>
          `<wa-button variant="${r.id === activeId ? 'brand' : 'neutral'}" data-route="${r.id}">${r.label}</wa-button>`,
      )
      .join('');

    navRoot.querySelectorAll('[data-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        navigate(btn.getAttribute('data-route') as RouteId);
      });
    });
  };

  const renderPage = () => {
    const id = parseRoute();
    cleanup?.();
    renderNav(id);
    const route = routes.find((r) => r.id === id) ?? routes[0]!;
    cleanup = route.mount(pageRoot);
  };

  window.addEventListener('hashchange', renderPage);
  renderPage();

  return () => {
    window.removeEventListener('hashchange', renderPage);
    cleanup?.();
  };
}
