/**
 * Features route mount — inserts {@link PoFeaturesPage}.
 *
 * @module ui/pages/features-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Features page into `root`. */
export function mountFeaturesPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-features-page');
}
