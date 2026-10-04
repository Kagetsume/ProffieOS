/**
 * Features route mount — inserts {@link LbFeaturesPage}.
 *
 * @module ui/pages/features-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the board features editor page (`lb-features-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountFeaturesPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'lb-features-page');
}
