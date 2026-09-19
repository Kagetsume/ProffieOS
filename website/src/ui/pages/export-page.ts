/**
 * Export route — live preview of generated INI files.
 *
 * Subscribes to `$export` and refreshes {@link mountCopyPanel} when wiring changes.
 * Phase 1: `blades.ini` only.
 *
 * @module ui/pages/export-page
 */
import { $export } from '../../stores/export';
import { mountCopyPanel } from '../copy-panel';

/**
 * Mount the Export page into `root`.
 *
 * @returns Cleanup — unsubscribe from `$export`
 */
export function mountExportPage(root: HTMLElement): () => void {
  root.innerHTML = `
    <section class="page">
      <h2>Export</h2>
      <p>Copy or download generated INI files. Phase 1 exports <code>blades.ini</code> only; presets and styles come in later phases.</p>
      <div id="export-blades"></div>
    </section>
  `;

  const panelRoot = root.querySelector('#export-blades')!;
  let refreshPanel: ((content: string) => void) | null = null;
  let latest = '';

  const unwatch = $export.watch((files) => {
    latest = files.bladesIni;
    if (refreshPanel) {
      refreshPanel(latest);
    }
  });

  refreshPanel = mountCopyPanel(panelRoot, {
    title: 'blades.ini',
    filename: 'blades.ini',
    getContent: () => latest,
  });

  return () => {
    unwatch();
  };
}
