/**
 * Import route mount — inserts {@link LbImportPage}.
 *
 * @module ui/pages/import-page
 */
import '../elements/lb-import-page.js';
import { mountCustomElementPage } from './mount-page';

/**
 * Mounts the saber config import page (`lb-import-page`) into a route container.
 *
 * @param root - DOM node that becomes the page shell (typically the router outlet).
 * @returns Cleanup callback that removes the mounted page from `root`.
 */
export function mountImportPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'lb-import-page');
}
