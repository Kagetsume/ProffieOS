/**
 * Relative paths under a ProffieOS saber (SD) root.
 *
 * @module platform/saber-paths
 */

/** SD path for layer style recipes (forward slashes, no leading slash). */
export const BLADE_STYLES_INI = 'config/blade_styles.ini';

export const BLADES_INI = 'config/blades.ini';
export const PRESETS_INI = 'config/presets.ini';
export const BOARD_INI = 'config/board.ini';
export const FEATURES_INI = 'config/features.ini';

export type SaberConfigFileId = 'blades' | 'bladeStyles' | 'presets' | 'board' | 'features';

export type SaberConfigFileSpec = {
  id: SaberConfigFileId;
  relativePath: string;
  label: string;
};

/** Known config files the editor can import and export. */
export const SABER_CONFIG_FILES: SaberConfigFileSpec[] = [
  { id: 'blades', relativePath: BLADES_INI, label: 'blades.ini' },
  { id: 'bladeStyles', relativePath: BLADE_STYLES_INI, label: 'blade_styles.ini' },
  { id: 'presets', relativePath: PRESETS_INI, label: 'presets.ini' },
  { id: 'board', relativePath: BOARD_INI, label: 'board.ini' },
  { id: 'features', relativePath: FEATURES_INI, label: 'features.ini' },
];

/**
 * Normalizes a saber-relative path to forward slashes without a leading slash.
 *
 * @param relative Path relative to saber root.
 */
export function normalizeSaberRelativePath(relative: string): string {
  return relative.replace(/\\/g, '/').replace(/^\/+/, '');
}
