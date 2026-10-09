#ifndef COMMON_SD_CONFIG_FILES_H
#define COMMON_SD_CONFIG_FILES_H

// Opt-in SD card config/ INI support (not compiled unless defined in CONFIG_TOP).
//
// When enabled, firmware loads (when present on SD):
//   config/presets.ini, blades.ini, blade_styles.ini, board.ini, features.ini
//
// Define in your CONFIG_FILE (e.g. config/config-files-config.h):
//   #define ENABLE_SD_CONFIG_FILES
//
// Optional flash-heavy human docs (off by default): see common/help_text.h
//   #define ENABLE_CONFIG_FILE_HELP_TEXT
//
// Requires ENABLE_SD. Without this define, only compiled CONFIG_PRESETS / blades[] apply;
// style = config … and config/ INI files are not supported.

#endif  // COMMON_SD_CONFIG_FILES_H
