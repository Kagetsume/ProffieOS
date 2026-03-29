#ifndef COMMON_BOARD_CONFIG_FILE_H
#define COMMON_BOARD_CONFIG_FILE_H

// Board hardware config: buttons, OLED. Optionally gesture/twist (overridden by config/features.ini when present).
// File: config/board.ini on SD card. For feature toggles (gesture, twist_on, twist_off) use config/features.ini
// so contest-specific files can override without touching hardware. Whitespace-tolerant; malformed lines ignored.
//
// Hardened: null/invalid handled; variable buffer bounded (readVariable uses 33 chars);
// malformed lines skipped (missing '=', unknown variable); max line count to avoid runaway;
// ParseOnOffValue word buffer capped; buttons read as single digit 1..3 only (no readIntValue overflow).

#include "file_reader.h"
#include "lsfs.h"
#include <string.h>

#define SD_BOARD_CONFIG_PATH "config/board.ini"
#define SD_BOARD_CONFIG_MAX_LINES 512

// Runtime board config from config/board.ini. -1 or 0 = not set (use compile default).
struct BoardConfigFile {
  int gesture;      // 1=on, 0=off, -1=not set
  int twist_on;     // 1=on, 0=off, -1=not set
  int twist_off;    // 1=on, 0=off, -1=not set
  int oled;         // 1=on, 0=off, -1=not set
  int bluetooth;    // 1=on, 0=off, -1=not set (Serial3 / BT serial when ENABLE_SERIAL)
  int buttons;     // 1, 2, or 3; -1=not set
  bool file_found; // true if config/board.ini was present and parsed
};

extern BoardConfigFile board_config_file;

// Load config/board.ini if present. Safe to call when SD disabled (no-op).
// Does not crash on malformed input; invalid lines are skipped.
void LoadBoardConfigFile();

// True if config/board.ini was found and loaded.
inline bool UseBoardConfigFile() {
  return board_config_file.file_found;
}

// Parse on/off value: "on", "off", "1", "0", "true", "false" (case-insensitive).
// Returns 1 for on, 0 for off, -1 if not recognized. Bounded: word buffer 16 chars.
inline int ParseOnOffValue(FileReader& f) {
  f.skipwhite();
  if (!f.Available()) return -1;
  int c = f.Peek();
  if (c == '0') { f.Read(); return 0; }
  if (c == '1') { f.Read(); return 1; }
  char word[16];
  int i = 0;
  const int word_max = 15;
  while (f.Available() && i < word_max) {
    c = f.Peek();
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) {
      word[i++] = (char)(c >= 'A' && c <= 'Z' ? c + 32 : c);
      f.Read();
    } else
      break;
  }
  if (i >= (int)sizeof(word)) i = word_max;
  word[i] = '\0';
  if (i == 2 && word[0] == 'o' && word[1] == 'n') return 1;
  if (i == 3 && word[0] == 'o' && word[1] == 'f' && word[2] == 'f') return 0;
  if (i == 4 && word[0] == 't' && word[1] == 'r' && word[2] == 'u' && word[3] == 'e') return 1;
  if (i == 5 && word[0] == 'f' && word[1] == 'a' && word[2] == 'l' && word[3] == 's' && word[4] == 'e') return 0;
  return -1;
}

// Load board config from SD config/board.ini if present.
// Format: gesture=on|off, twist_on=on|off, twist_off=on|off, oled=on|off, bluetooth=on|off, buttons=1|2|3.
// Does not crash on malformed input; invalid lines are skipped.
inline void LoadBoardConfigFile() {
#ifdef ENABLE_SD
  board_config_file.gesture = -1;
  board_config_file.twist_on = -1;
  board_config_file.twist_off = -1;
  board_config_file.oled = -1;
  board_config_file.bluetooth = -1;
  board_config_file.buttons = -1;
  board_config_file.file_found = false;

  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_BOARD_CONFIG_PATH)) {
    LOCK_SD(false);
    return;
  }
  board_config_file.file_found = true;

  int line_count = 0;
  while (f.Available() && line_count < SD_BOARD_CONFIG_MAX_LINES) {
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
    } else if (!strcmp(variable, "oled")) {
      int v = ParseOnOffValue(f);
      if (v >= 0) board_config_file.oled = v;
    } else if (!strcmp(variable, "bluetooth")) {
      int v = ParseOnOffValue(f);
      if (v >= 0) board_config_file.bluetooth = v;
    } else if (!strcmp(variable, "buttons")) {
      // Single digit 1-3 only to avoid readIntValue() overflow on huge digit strings
      int c = f.Peek();
      if (c >= '1' && c <= '3') {
        int v = c - '0';
        f.Read();
        board_config_file.buttons = v;
      }
    }
    f.skipline();
    line_count++;
  }
  f.Close();
  LOCK_SD(false);
#endif
}

// Getters: when file is present and value was set, return that; otherwise -1 (use compile default).
inline int BoardConfigGesture() { return board_config_file.gesture; }
inline int BoardConfigTwistOn() { return board_config_file.twist_on; }
inline int BoardConfigTwistOff() { return board_config_file.twist_off; }
inline int BoardConfigOled() { return board_config_file.oled; }
inline int BoardConfigBluetooth() { return board_config_file.bluetooth; }
inline int BoardConfigButtons() { return board_config_file.buttons; }

// True if gesture is explicitly on (1) or off (0). When -1, use compile-time default.
inline bool BoardConfigGestureEnabled() {
  return board_config_file.file_found && board_config_file.gesture == 1;
}
inline bool BoardConfigTwistOnEnabled() {
  return board_config_file.file_found && board_config_file.twist_on == 1;
}
inline bool BoardConfigTwistOffEnabled() {
  return board_config_file.file_found && board_config_file.twist_off == 1;
}
inline bool BoardConfigOledEnabled() {
  return board_config_file.file_found && board_config_file.oled == 1;
}
// Bluetooth (Serial3): when no board file, default on; when file present, on only if bluetooth != 0.
inline bool BoardConfigBluetoothEnabled() {
  return !board_config_file.file_found || board_config_file.bluetooth != 0;
}
// Effective button count: file value 1/2/3 if set, else -1 (use NUM_BUTTONS).
inline int BoardConfigNumButtons() {
  return board_config_file.buttons;
}

#endif  // COMMON_BOARD_CONFIG_FILE_H
