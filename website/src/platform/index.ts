/**
 * Platform layer — saber filesystem port and path helpers.
 *
 * @module platform
 */

export {
  BLADE_STYLES_INI,
  BLADES_INI,
  BOARD_INI,
  FEATURES_INI,
  PRESETS_INI,
  SABER_CONFIG_FILES,
  normalizeSaberRelativePath,
  type SaberConfigFileId,
  type SaberConfigFileSpec,
} from './saber-paths.js';
export { initPlatformStorage } from './init.js';
export {
  getSaberStorage,
  isDesktopStorage,
  setSaberStorage,
  type SaberStorage,
} from './storage.js';
