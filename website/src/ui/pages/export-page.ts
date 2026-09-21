/**
 * Export route — live preview of generated INI files.
 *
 * @module ui/pages/export-page
 */
import { $export } from '../../stores/export';
import { mountCopyPanel } from '../copy-panel';

type ExportFiles = ReturnType<typeof $export.getState>;

/**
 * Mount the Export page into `root`.
 *
 * @returns Cleanup — unsubscribe from `$export`
 */
export function mountExportPage(root: HTMLElement): () => void {
  root.innerHTML = `
    <section class="page">
      <h2>Export</h2>
      <p>Copy or download generated INI files for your SD card <code>config/</code> folder.</p>
      <div class="export-panels">
        <div id="export-blades"></div>
        <div id="export-blade-styles"></div>
        <div id="export-presets"></div>
        <div id="export-board"></div>
        <div id="export-features"></div>
      </div>
    </section>
  `;

  let latest: ExportFiles = $export.getState();
  const refreshers: Array<(content: string) => void> = [];

  const mount = (
    selector: string,
    title: string,
    filename: string,
    pick: (files: ExportFiles) => string,
  ) => {
    const panelRoot = root.querySelector(selector) as HTMLElement;
    const refresh = mountCopyPanel(panelRoot, {
      title,
      filename,
      getContent: () => pick(latest),
    });
    refreshers.push(refresh);
  };

  mount('#export-blades', 'blades.ini', 'blades.ini', (files) => files.bladesIni);
  mount(
    '#export-blade-styles',
    'blade_styles.ini',
    'blade_styles.ini',
    (files) => files.bladeStylesIni,
  );
  mount('#export-presets', 'presets.ini', 'presets.ini', (files) => files.presetsIni);
  mount('#export-board', 'board.ini', 'board.ini', (files) => files.boardIni);
  mount('#export-features', 'features.ini', 'features.ini', (files) => files.featuresIni);

  const unwatch = $export.watch((files) => {
    latest = files;
    refreshers.forEach((refresh, index) => {
      const keys: (keyof ExportFiles)[] = [
        'bladesIni',
        'bladeStylesIni',
        'presetsIni',
        'boardIni',
        'featuresIni',
      ];
      refresh(files[keys[index]!]);
    });
  });

  return () => {
    unwatch();
  };
}
