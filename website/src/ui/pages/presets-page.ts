/**
 * Presets route — `config/presets.ini`.
 *
 * @module ui/pages/presets-page
 */
import '../elements/index.js';
import { mountCustomElementPage } from './mount-page';

/** Mount the Presets page into `root`. */
export function mountPresetsPage(root: HTMLElement): () => void {
  return mountCustomElementPage(root, 'po-presets-page');
}
