/**
 * Blade styles route mount — inserts {@link PoStylesPage}.
 *
 * @module ui/pages/styles-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Blade styles page into `root`. */
export function mountStylesPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-styles-page');
}
