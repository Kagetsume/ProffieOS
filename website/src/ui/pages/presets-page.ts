/**
 * Presets route stub — `config/presets.ini`.
 *
 * @module ui/pages/presets-page
 */
import { getRouteMeta } from '../../route-config';
import '../elements/index.js';
import { mountConfigStubPage } from './mount-page';

/** Mount the Presets stub page into `root`. */
export function mountPresetsPage(root: HTMLElement): () => void {
  return mountConfigStubPage(root, getRouteMeta('presets')!);
}
