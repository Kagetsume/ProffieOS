/**
 * Wiring route mount — inserts {@link LbWiringPage}.
 *
 * @module ui/pages/wiring-page
 */
import '../elements/lb-wiring-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the blade wiring editor page (`lb-wiring-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountWiringPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'lb-wiring-page');
}
