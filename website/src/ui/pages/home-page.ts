/**
 * Home / intro route mount — inserts {@link PoHomePage}.
 *
 * @module ui/pages/home-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the home / intro page (`po-home-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountHomePage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-home-page');
}
