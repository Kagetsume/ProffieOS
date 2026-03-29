#ifndef COMMON_SD_CONFIG_H
#define COMMON_SD_CONFIG_H

// SD-card-driven configuration: presets (and optionally blade configs) can be
// defined by INI files on the SD card instead of compiled CONFIG_PRESETS.
// Board/hardware config (NUM_BLADES, pins, blade drivers) still comes from
// CONFIG_FILE; only the preset list is overridden when SD config is present.

#include "malloc_helper.h"
#include "file_reader.h"
#include "lsfs.h"
#include "stdout.h"
#include "blade_config.h"

#ifndef NUM_BLADES
#error sd_config.h requires NUM_BLADES (include after CONFIG_FILE)
#endif

#define SD_CONFIG_PRESETS_PATH "config/presets.ini"
#define SD_PRESETS_CONFIG_MAX_LINES 2048  // Cap to avoid runaway on huge/malformed file
#define SD_MAX_PRESETS 64

struct SDPresetDef {
  LSPtr<char> font;
  LSPtr<char> track;
  LSPtr<char> name;
  uint32_t variation;
#if NUM_BLADES > 0
  LSPtr<char> style[NUM_BLADES];
#endif
};

extern SDPresetDef sd_presets_storage[SD_MAX_PRESETS];
extern size_t sd_preset_count;
extern bool sd_config_active;

inline bool UseSDConfig() {
  return sd_config_active && sd_preset_count > 0;
}

inline size_t GetNumPresets() {
  if (UseSDConfig()) return sd_preset_count;
  return current_config ? current_config->num_presets : 0;
}

// Load preset list from SD card config/presets.ini if present.
// Call after SD is mounted and after FindBlade() (so current_config is set).
// Format: same as save-dir presets.ini (new_preset, font=, track=, style=, name=, variation=, end).
// Whitespace (space, tab, newline) is tolerated. Malformed lines or parts are ignored and do not crash.
inline void LoadSDConfig() {
#ifdef ENABLE_SD
  sd_config_active = false;
  sd_preset_count = 0;
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_CONFIG_PRESETS_PATH)) {
    LOCK_SD(false);
    return;
  }
  int preset_count = 0;
  int current_style_idx = 0;
  for (size_t i = 0; i < SD_MAX_PRESETS; i++) {
    sd_presets_storage[i].font.set("");
    sd_presets_storage[i].track.set("");
    sd_presets_storage[i].name.set("");
    sd_presets_storage[i].variation = 0;
#if NUM_BLADES > 0
    for (size_t b = 0; b < NUM_BLADES; b++) sd_presets_storage[i].style[b].set("");
#endif
  }
  int line_count = 0;
  while (f.Available() && line_count < SD_PRESETS_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#') { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    if (!f.readVariable(variable)) { f.skipline(); line_count++; continue; }
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "installed")) {
      if (f.Available() && f.Peek() == '=') { f.Read(); f.skipspace(); while (f.Available() && f.Peek() != '\n') f.Read(); }
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "new_preset")) {
      if (preset_count >= 2 && sd_preset_count < SD_MAX_PRESETS) sd_preset_count++;
      preset_count++;
      current_style_idx = 0;
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "end")) {
      if (preset_count >= 1 && sd_preset_count < SD_MAX_PRESETS) sd_preset_count++;
      break;
    }
    if (preset_count == 0) { f.skipline(); line_count++; continue; }
    if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
    f.Read();
    f.skipspace();
    size_t idx = sd_preset_count < SD_MAX_PRESETS ? sd_preset_count : (SD_MAX_PRESETS - 1);
    if (idx >= SD_MAX_PRESETS) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "name")) {
      char* s = f.readString();
      sd_presets_storage[idx].name.set(s ? s : "");
      if (s) free(s);
    } else if (!strcmp(variable, "font")) {
      char* s = f.readString();
      sd_presets_storage[idx].font.set(s ? s : "");
      if (s) free(s);
    } else if (!strcmp(variable, "track")) {
      char* s = f.readString();
      sd_presets_storage[idx].track.set(s ? s : "");
      if (s) free(s);
    } else if (!strcmp(variable, "variation")) {
      char* s = f.readString();
      if (s) {
        sd_presets_storage[idx].variation = (uint32_t)strtol(s, nullptr, 10);
        free(s);
      }
    } else if (!strcmp(variable, "style")) {
      char* s = f.readString();
#if NUM_BLADES > 0
      if (current_style_idx >= 0 && current_style_idx < (int)NUM_BLADES) {
        sd_presets_storage[idx].style[current_style_idx].set(s ? s : "");
        current_style_idx++;
      }
#endif
      if (s) free(s);
    }
    f.skipline();
    line_count++;
  }
  f.Close();
  LOCK_SD(false);
  if (sd_preset_count > 0) {
    sd_config_active = true;
    PVLOG_STATUS << "SD config: loaded " << sd_preset_count << " presets from " SD_CONFIG_PRESETS_PATH "\n";
  }
#endif  // ENABLE_SD
}

#endif  // COMMON_SD_CONFIG_H
