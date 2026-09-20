/**
 * Thin mount helpers for Lit page custom elements.
 *
 * @module ui/pages/mount-page
 */
import type { RouteMeta } from '../../route-config';

/**
 * Mount a custom element tag into `root`.
 *
 * @returns Cleanup — clears `root`
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
 * Mount {@link PoConfigStubPage} with route metadata.
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
