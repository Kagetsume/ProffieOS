/**
 * i18n keys for {@link LbExportPage}.
 *
 * @module ui/elements/lb-export-page.keys
 */
export const exportPageKeys = {
  title: 'title',
  lead: 'lead',
  summary: 'summary',
  desktopWriteLead: 'desktopWriteLead',
  saberRootNotSet: 'saberRootNotSet',
  writeAllConfig: 'writeAllConfig',
  writeFile: 'writeFile',
  statusChooseFolder: 'statusChooseFolder',
  statusWroteFile: 'statusWroteFile',
  statusWroteAll: 'statusWroteAll',
  statusWriteErrors: 'statusWriteErrors',
} as const;

export type ExportFileId = 'blades' | 'bladeStyles' | 'presets' | 'board' | 'features';

export const exportFileTabKeys: Record<ExportFileId, string> = {
  blades: 'tab.blades',
  bladeStyles: 'tab.bladeStyles',
  presets: 'tab.presets',
  board: 'tab.board',
  features: 'tab.features',
} as const;
