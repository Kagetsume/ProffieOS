/**
 * Thin mount helpers for Lit page custom elements.
 *
 * @module ui/pages/mount-page
 */
import type { RouteMeta } from '../../route-config';

/**
 * Mounts a registered custom element tag as the sole child of a route container.
 *
 * Clears any existing content in `root`, creates the element, and appends it.
 * The returned cleanup function clears `root` when the route is torn down.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @param tagName - Custom element tag to instantiate (for example `po-home-page`).
 * @returns Cleanup callback that removes all children from `root`.
 */
export function mountCustomElementPage(root: HTMLElement, tagName: string): () => void {
  root.innerHTML = '';
  const element = document.createElement(tagName);
  root.appendChild(element);
  return () => {
    root.innerHTML = '';
  };
}

/**
 * Mounts {@link PoConfigStubPage} with SD-card path and copy from route metadata.
 *
 * Used for config sections that are not yet fully implemented in the web editor.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @param meta - Route descriptor supplying label, SD path, and description text.
 * @returns Cleanup callback that removes all children from `root`.
 */
export function mountConfigStubPage(root: HTMLElement, meta: RouteMeta): () => void {
  root.innerHTML = '';
  const element = document.createElement('po-config-stub-page') as HTMLElement & {
    title: string;
    sdPath: string;
    description: string;
  };
  element.title = meta.label;
  element.sdPath = meta.sdPath ?? '';
  element.description = meta.description;
  root.appendChild(element);
  return () => {
    root.innerHTML = '';
  };
}
