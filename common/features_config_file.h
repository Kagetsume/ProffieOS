#ifndef COMMON_FEATURES_CONFIG_FILE_H
#define COMMON_FEATURES_CONFIG_FILE_H

// Feature toggles (gesture, twist on/off) for easier contest-specific management.
// File: config/features.ini on SD card. Loaded after config/board.ini; values
// overwrite gesture/twist from board.ini when present. Same struct (board_config_file).
//
// Hardened: same as board config (bounded reads, max lines, malformed skipped).

#include "board_config_file.h"

#define SD_FEATURES_CONFIG_PATH "config/features.ini"
#define SD_FEATURES_CONFIG_MAX_LINES 128

// Load config/features.ini if present. Call after LoadBoardConfigFile().
// Sets gesture, twist_on, twist_off in board_config_file (overwrites if present).
// Safe when SD disabled (no-op). Does not crash on malformed input.
inline void LoadFeaturesConfigFile() {
#ifdef ENABLE_SD
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_FEATURES_CONFIG_PATH)) {
    LOCK_SD(false);
    return;
  }

  int line_count = 0;
  while (f.Available() && line_count < SD_FEATURES_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = '\0';
    if (!f.readVariable(variable)) { f.skipline(); line_count++; continue; }
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    f.skipwhite();
    if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
    f.Read();
    f.skipwhite();
    if (!f.Available()) { f.skipline(); line_count++; continue; }

    if (!strcmp(variable, "gesture")) {
      int v = ParseOnOffValue(f);
      if (v >= 0) board_config_file.gesture = v;
    } else if (!strcmp(variable, "twist_on")) {
      int v = ParseOnOffValue(f);
      if (v >= 0) board_config_file.twist_on = v;
    } else if (!strcmp(variable, "twist_off")) {
      int v = ParseOnOffValue(f);
      if (v >= 0) board_config_file.twist_off = v;
    }
    f.skipline();
    line_count++;
  }
  f.Close();
  LOCK_SD(false);
#endif
}

#endif  // COMMON_FEATURES_CONFIG_FILE_H
