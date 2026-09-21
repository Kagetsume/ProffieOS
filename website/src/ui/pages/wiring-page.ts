/**
 * Wiring route mount — inserts {@link PoWiringPage}.
 *
 * @module ui/pages/wiring-page
 */
import '../elements/po-wiring-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the blade wiring editor page (`po-wiring-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountWiringPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-wiring-page');
}
