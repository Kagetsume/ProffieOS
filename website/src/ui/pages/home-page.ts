/**
 * Home / intro route mount — inserts {@link PoHomePage}.
 *
 * @module ui/pages/home-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Home page into `root`. */
export function mountHomePage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-home-page');
}
