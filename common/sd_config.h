#ifndef COMMON_SD_CONFIG_H
#define COMMON_SD_CONFIG_H

// SD preset list override (config/presets.ini) when ENABLE_SD_CONFIG_FILES is set.
// See common/sd_config_files.h.

#include "malloc_helper.h"
#include "blade_config.h"

#ifndef NUM_BLADES
#error sd_config.h requires NUM_BLADES (include after CONFIG_FILE)
#endif

#ifdef ENABLE_SD
#include "file_reader.h"
#include <string.h>

// Trim spaces/tabs/CR/LF; each ;-separated font path is rooted with '/' for SD (trailing slashes removed).
static char* NormalizePresetFontPath(char* s) {
  if (!s) return nullptr;
  char* p = s;
  while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
  if (p != s) memmove(s, p, strlen(p) + 1);
  StripIniTrailingLineEndings(s);
  size_t n = strlen(s);
  while (n > 0 && (s[n - 1] == ' ' || s[n - 1] == '\t')) s[--n] = 0;

  if (!*s) {
    free(s);
    return (char*)mkstr(StringPiece(""));
  }

  char buf[128];
  char* out = buf;
  const char* const end = buf + sizeof(buf) - 1;
  const char* seg = s;
  bool first = true;
  while (seg) {
    const char* semi = strchr(seg, ';');
    size_t len = semi ? (size_t)(semi - seg) : strlen(seg);
    const char* t = seg;
    while (len > 0 && (t[0] == ' ' || t[0] == '\t')) {
      t++;
      len--;
    }
    while (len > 0 && (t[len - 1] == ' ' || t[len - 1] == '\t')) len--;
    while (len > 1 && t[len - 1] == '/') len--;
    if (len > 0) {
      if (!first) {
        if (out >= end) break;
        *out++ = ';';
      }
      first = false;
      if (t[0] != '/') {
        if (out + 1 + len > end) break;
        *out++ = '/';
      }
      if (out + len > end) break;
      memcpy(out, t, len);
      out += len;
    }
    seg = semi ? semi + 1 : nullptr;
  }
  *out = 0;
  free(s);
  if (out == buf) return (char*)mkstr(StringPiece(""));
  return (char*)mkstr(StringPiece(buf));
}

#ifndef PRESET_VOICE_DEFAULT_DIR
#define PRESET_VOICE_DEFAULT_DIR "common"
#endif

// Legacy presets.ini used font=Name;common — strip before appending voice=/common.
static bool IsLegacyCommonVoiceSegment(const char* seg) {
  if (!seg) return false;
  while (*seg == ' ' || *seg == '\t') seg++;
  if (*seg == '/') seg++;
  return strcasecmp(seg, PRESET_VOICE_DEFAULT_DIR) == 0;
}

static char* StripLegacyTrailingCommonFromFont(char* s) {
  if (!s || !*s) return s;
  char* last_semi = strrchr(s, ';');
  if (!last_semi || !IsLegacyCommonVoiceSegment(last_semi + 1)) return s;
  *last_semi = 0;
  size_t n = strlen(s);
  while (n > 0 && (s[n - 1] == ' ' || s[n - 1] == '\t')) s[--n] = 0;
  return s;
}

// Builds hybrid-font search path: primary font, then voice pack directory on SD.
// voice omitted or empty → /common (SD:/common/). voice= set → full path only (e.g. /common/AltPack).
inline char* ComposePresetFontWithVoice(const char* font_path, const char* voice) {
  const char* voice_in =
      (voice && voice[0]) ? voice : PRESET_VOICE_DEFAULT_DIR;
  char* voice_path = NormalizePresetFontPath((char*)mkstr(StringPiece(voice_in)));
  if (!font_path || !font_path[0]) return voice_path;
  char* font_only = StripLegacyTrailingCommonFromFont((char*)mkstr(StringPiece(font_path)));
  char combo[256];
  snprintf(combo, sizeof(combo), "%s;%s", font_only, voice_path);
  free(font_only);
  free(voice_path);
  return NormalizePresetFontPath((char*)mkstr(StringPiece(combo)));
}
#endif  // ENABLE_SD (font path helpers)

#ifdef ENABLE_SD_CONFIG_FILES

#define SD_CONFIG_PRESETS_PATH "config/presets.ini"
#define SD_PRESETS_CONFIG_MAX_LINES 2048
#define SD_MAX_PRESETS 64

struct SDPresetDef {
  LSPtr<char> font;
  LSPtr<char> voice;
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

#ifndef SD_CONFIG_USE_COMPILED_PRESETS
#define SD_CONFIG_USE_COMPILED_PRESETS 0
#endif

inline bool UseSDConfig() {
#if SD_CONFIG_USE_COMPILED_PRESETS
  return false;
#else
  return sd_config_active && sd_preset_count > 0;
#endif
}

inline size_t GetNumPresets() {
  if (UseSDConfig()) return sd_preset_count;
  return current_config ? current_config->num_presets : 0;
}

// Load preset list from SD card config/presets.ini if present.
// Call after SD is mounted, and before FindBlade() (see ProffieOS.ino) so UseSDConfig() is true
// when SetPreset runs. Does not require current_config.
// Format: same as save-dir presets.ini (new_preset, font=, voice=, track=, style=, name=, variation=, end).
// Whitespace (space, tab, newline) is tolerated. Malformed lines or parts are ignored and do not crash.
inline void LoadSDConfig() {
#ifdef ENABLE_SD
#if SD_CONFIG_USE_COMPILED_PRESETS
  sd_config_active = false;
  sd_preset_count = 0;
  return;
#endif
  sd_config_active = false;
  sd_preset_count = 0;
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_CONFIG_PRESETS_PATH)) {
    LOCK_SD(false);
    return;
  }
  // UTF-8 BOM (common from Windows editors) breaks readVariable on the first line (e.g. "new_preset").
  if (f.Available() && (unsigned char)f.Peek() == 0xEF) {
    int bom_pos = f.Tell();
    f.Read();
    if (f.Available() && (unsigned char)f.Peek() == 0xBB) {
      f.Read();
      if (f.Available() && (unsigned char)f.Peek() == 0xBF) {
        f.Read();
      } else {
        f.Seek(bom_pos);
      }
    } else {
      f.Seek(bom_pos);
    }
  }
  int preset_count = 0;
  int current_style_idx = 0;
  for (size_t i = 0; i < SD_MAX_PRESETS; i++) {
    sd_presets_storage[i].font.set("");
    sd_presets_storage[i].voice.set("");
    sd_presets_storage[i].track.set("");
    sd_presets_storage[i].name.set("");
    sd_presets_storage[i].variation = 0;
#if NUM_BLADES > 0
    for (size_t b = 0; b < NUM_BLADES; b++) sd_presets_storage[i].style[b].set("");
#endif
  }
  int line_count = 0;
  bool parsed_end_line = false;
  while (f.Available() && line_count < SD_PRESETS_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#') { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    if (!f.readVariable(variable)) { f.skipline(); line_count++; continue; }
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "installed")) {
      if (f.Available() && f.Peek() == '=') {
        f.Read();
        f.skipspace();
      }
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "new_preset")) {
      // Advance to next preset slot before reading the new block (was >=2, which
      // overwrote slot 0 for every preset until the 3rd new_preset).
      if (preset_count >= 1 && sd_preset_count < SD_MAX_PRESETS) sd_preset_count++;
      preset_count++;
      current_style_idx = 0;
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "end")) {
      if (preset_count >= 1 && sd_preset_count < SD_MAX_PRESETS) sd_preset_count++;
      parsed_end_line = true;
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
      // LSPtr owns s; do not free here.
    } else if (!strcmp(variable, "font")) {
      char* s = f.readString();
      sd_presets_storage[idx].font.set(s ? NormalizePresetFontPath(s) : "");
    } else if (!strcmp(variable, "voice")) {
      char* s = f.readString();
      if (s) {
        StripIniTrailingLineEndings(s);
        sd_presets_storage[idx].voice.set(s);
      } else {
        sd_presets_storage[idx].voice.set("");
      }
    } else if (!strcmp(variable, "track")) {
      char* s = f.readString();
      sd_presets_storage[idx].track.set(s ? s : "");
      // LSPtr owns s; do not free here.
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
        s = nullptr;
      }
#endif
      if (s) free(s);
    }
    f.skipline();
    line_count++;
  }
  // If the file has no "end" line (EOF or line limit), finalize the last preset
  // the same way "end" would, or sd_preset_count stays 0 and UseSDConfig() is false.
  if (!parsed_end_line && preset_count >= 1 && sd_preset_count < SD_MAX_PRESETS) {
    sd_preset_count++;
  }
  f.Close();
  LOCK_SD(false);
  if (sd_preset_count > 0) {
    sd_config_active = true;
    PVLOG_STATUS << "SD config: loaded " << sd_preset_count << " presets from " SD_CONFIG_PRESETS_PATH "\n";
  }
#endif  // ENABLE_SD
}

#else  // !ENABLE_SD_CONFIG_FILES

inline bool UseSDConfig() { return false; }

inline size_t GetNumPresets() {
  return current_config ? current_config->num_presets : 0;
}

inline void LoadSDConfig() {}

#endif  // ENABLE_SD_CONFIG_FILES

#endif  // COMMON_SD_CONFIG_H
