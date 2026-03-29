#ifndef COMMON_BLADE_CONFIG_FILE_H
#define COMMON_BLADE_CONFIG_FILE_H

// Blade config file: defines which data line controls which blade, how many
// pixels are in that blade, and which FET/power lines map to which blade.
// File: config/blades.ini on SD card. Whitespace-tolerant; malformed lines ignored.
//
// Hardened: max line count (SD_BLADE_CONFIG_MAX_LINES); variable buffer 33; blade index
// and pixels read with bounded digit count (no readIntValue overflow); pin values
// bounded (numeric: at most 4 digits; word buffer 33); malformed lines skipped; file closed on exit.

#include "file_reader.h"
#include "lsfs.h"
#include "stdout.h"

#define SD_BLADE_CONFIG_PATH "config/blades.ini"
#define SD_BLADE_CONFIG_MAX_LINES 512
#define SD_MAX_BLADE_DEFS 16
#define SD_MAX_POWER_PINS_PER_BLADE 6
#define SD_MAX_SUB_BLADES_PER_BLADE 8

struct SDBladeDef {
  int data_pin;       // -1 = not set
  int pixels;         // 0 = not set
  int power_pin[SD_MAX_POWER_PINS_PER_BLADE];  // -1 = unused
  int sub_blade_first[SD_MAX_SUB_BLADES_PER_BLADE];  // -1 = unused
  int sub_blade_last[SD_MAX_SUB_BLADES_PER_BLADE];   // -1 = unused
  int sub_blade_count;  // 0 = use full strip; >0 = SubBlade ranges
};

extern SDBladeDef sd_blade_defs[SD_MAX_BLADE_DEFS];
extern size_t sd_blade_def_count;

inline bool UseBladeConfigFile() {
  return sd_blade_def_count > 0;
}

// Parse pin value from string: numeric (e.g. "20") or text constant (e.g. "bladePowerPin1").
// Defined in blade_config_pin_names.h (included after board config).
int ParseBladeConfigPinValue(const char* str);

// Read pin value from file: either integer or text constant (bladePowerPin1, bladePin, etc.).
// Numeric: at most 4 digits (or - and 3 digits) to avoid readIntValue overflow.
static inline int ReadPinValueFromFile(FileReader& f) {
  f.skipwhite();
  if (!f.Available()) return -1;
  int c = f.Peek();
  if (c >= '0' && c <= '9') {
    int val = 0;
    for (int d = 0; d < 4 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
      val = val * 10 + (f.Read() - '0');
    return val;
  }
  if (c == '-') {
    f.Read();
    if (!f.Available() || f.Peek() < '0' || f.Peek() > '9') return -1;
    int val = 0;
    for (int d = 0; d < 3 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
      val = val * 10 + (f.Read() - '0');
    return -val;
  }
  char word[33];
  int i = 0;
  while (f.Available() && i < 32) {
    c = f.Peek();
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
      word[i++] = (char)f.Read();
    else
      break;
  }
  word[i] = 0;
  return ParseBladeConfigPinValue(word);
}

// Load blade definitions from SD config/blades.ini if present.
// Format: blade=0 then data_pin=, pixels=, power_pin= (or power_pin1..6), optional sub_blade=first,last, end.
// Does not crash on malformed input; invalid lines are skipped.
inline void LoadBladeConfigFile() {
#ifdef ENABLE_SD
  sd_blade_def_count = 0;
  for (size_t i = 0; i < SD_MAX_BLADE_DEFS; i++) {
    sd_blade_defs[i].data_pin = -1;
    sd_blade_defs[i].pixels = 0;
    for (int j = 0; j < SD_MAX_POWER_PINS_PER_BLADE; j++)
      sd_blade_defs[i].power_pin[j] = -1;
    sd_blade_defs[i].sub_blade_count = 0;
    for (int j = 0; j < SD_MAX_SUB_BLADES_PER_BLADE; j++) {
      sd_blade_defs[i].sub_blade_first[j] = -1;
      sd_blade_defs[i].sub_blade_last[j] = -1;
    }
  }
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_BLADE_CONFIG_PATH)) {
    LOCK_SD(false);
    return;
  }
  int current_blade = -1;
  int line_count = 0;
  while (f.Available() && line_count < SD_BLADE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#') { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    if (!f.readVariable(variable)) { f.skipline(); line_count++; continue; }
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "end")) break;
    if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
    f.Read();
    f.skipwhite();
    if (!f.Available()) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "blade")) {
      // At most 2 digits (0..15) to avoid readIntValue overflow
      int idx = -1;
      if (f.Peek() >= '0' && f.Peek() <= '9') {
        idx = f.Read() - '0';
        if (f.Peek() >= '0' && f.Peek() <= '9') idx = idx * 10 + (f.Read() - '0');
      }
      if (idx >= 0 && idx < (int)SD_MAX_BLADE_DEFS) {
        if (current_blade >= 0 && current_blade < (int)SD_MAX_BLADE_DEFS &&
            (sd_blade_defs[current_blade].data_pin >= 0 || sd_blade_defs[current_blade].pixels > 0)) {
          if (sd_blade_def_count < (size_t)(current_blade + 1))
            sd_blade_def_count = (size_t)(current_blade + 1);
        }
        current_blade = idx;
      }
      f.skipline();
      line_count++;
      continue;
    }
    if (current_blade < 0 || current_blade >= (int)SD_MAX_BLADE_DEFS) { f.skipline(); line_count++; continue; }
    SDBladeDef& def = sd_blade_defs[current_blade];
    if (!strcmp(variable, "data_pin")) {
      def.data_pin = ReadPinValueFromFile(f);
      if (def.data_pin < 0) def.data_pin = -1;
    } else if (!strcmp(variable, "pixels")) {
      // At most 5 digits (65535) to avoid readIntValue overflow
      int p = 0;
      for (int d = 0; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        p = p * 10 + (f.Read() - '0');
      def.pixels = (p > 0 && p <= 65535) ? p : 0;
    } else if (!strcmp(variable, "power_pin")) {
      int p = ReadPinValueFromFile(f);
      if (p >= 0) {
        int j = 0;
        while (j < SD_MAX_POWER_PINS_PER_BLADE && def.power_pin[j] >= 0) j++;
        if (j < SD_MAX_POWER_PINS_PER_BLADE) def.power_pin[j] = p;
      }
    } else if (!strcmp(variable, "power_pin1")) { def.power_pin[0] = ReadPinValueFromFile(f); if (def.power_pin[0] < 0) def.power_pin[0] = -1; }
    } else if (!strcmp(variable, "power_pin2")) { def.power_pin[1] = ReadPinValueFromFile(f); if (def.power_pin[1] < 0) def.power_pin[1] = -1; }
    } else if (!strcmp(variable, "power_pin3")) { def.power_pin[2] = ReadPinValueFromFile(f); if (def.power_pin[2] < 0) def.power_pin[2] = -1; }
    } else if (!strcmp(variable, "power_pin4")) { def.power_pin[3] = ReadPinValueFromFile(f); if (def.power_pin[3] < 0) def.power_pin[3] = -1; }
    } else if (!strcmp(variable, "power_pin5")) { def.power_pin[4] = ReadPinValueFromFile(f); if (def.power_pin[4] < 0) def.power_pin[4] = -1; }
    } else if (!strcmp(variable, "power_pin6")) { def.power_pin[5] = ReadPinValueFromFile(f); if (def.power_pin[5] < 0) def.power_pin[5] = -1; }
    } else if (!strcmp(variable, "sub_blade") && def.sub_blade_count < SD_MAX_SUB_BLADES_PER_BLADE) {
      // sub_blade = first, last (two integers, comma-separated; max 5 digits each)
      int first = -1, last = -1;
      int v = 0, d = 0;
      for (; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        v = v * 10 + (f.Read() - '0');
      first = v;
      f.skipwhite();
      if (f.Available() && f.Peek() == ',') { f.Read(); f.skipwhite(); }
      v = 0; d = 0;
      for (; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        v = v * 10 + (f.Read() - '0');
      last = v;
      if (first >= 0 && last >= first && def.sub_blade_count < SD_MAX_SUB_BLADES_PER_BLADE) {
        def.sub_blade_first[def.sub_blade_count] = first;
        def.sub_blade_last[def.sub_blade_count] = last;
        def.sub_blade_count++;
      }
    }
    f.skipline();
    line_count++;
  }
  if (current_blade >= 0 && current_blade < (int)SD_MAX_BLADE_DEFS &&
      (sd_blade_defs[current_blade].data_pin >= 0 || sd_blade_defs[current_blade].pixels > 0)) {
    if (sd_blade_def_count < (size_t)(current_blade + 1))
      sd_blade_def_count = (size_t)(current_blade + 1);
  }
  f.Close();
  LOCK_SD(false);
  if (sd_blade_def_count > 0) {
    PVLOG_STATUS << "Blade config: loaded " << sd_blade_def_count << " blade defs from " SD_BLADE_CONFIG_PATH "\n";
  }
#endif
}

#endif  // COMMON_BLADE_CONFIG_FILE_H
