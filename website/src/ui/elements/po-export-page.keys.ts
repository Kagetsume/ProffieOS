/**
 * i18n keys for {@link PoExportPage}.
 *
 * @module ui/elements/po-export-page.keys
 */
export const exportPageKeys = {
  title: 'title',
  lead: 'lead',
  summary: 'summary',
} as const;

export type ExportFileId = 'blades' | 'bladeStyles' | 'presets' | 'board' | 'features';

export const exportFileTabKeys: Record<ExportFileId, string> = {
  blades: 'tab.blades',
  bladeStyles: 'tab.bladeStyles',
  presets: 'tab.presets',
  board: 'tab.board',
  features: 'tab.features',
} as const;
