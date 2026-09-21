/**
 * Blade styles route mount — inserts {@link PoStylesPage}.
 *
 * @module ui/pages/styles-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the blade styles editor page (`po-styles-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountStylesPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-styles-page');
}
