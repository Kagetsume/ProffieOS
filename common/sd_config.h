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

// overlay → font → voice (/common). Overlay dirs are scanned first; missing files fall through.
inline char* ComposePresetFontWithOverlayAndVoice(const char* overlay,
                                                  const char* font_path,
                                                  const char* voice) {
  char* composed = ComposePresetFontWithVoice(font_path, voice);
  if (!overlay || !overlay[0]) return composed;
  char* overlay_norm = NormalizePresetFontPath((char*)mkstr(StringPiece(overlay)));
  if (!composed || !composed[0]) return overlay_norm;
  char combo[256];
  snprintf(combo, sizeof(combo), "%s;%s", overlay_norm, composed);
  free(overlay_norm);
  free(composed);
  return NormalizePresetFontPath((char*)mkstr(StringPiece(combo)));
}
#endif  // ENABLE_SD (font path helpers)

#ifdef ENABLE_SD_CONFIG_FILES

#include <stdlib.h>

#define SD_CONFIG_PRESETS_PATH "config/presets.ini"

struct SDPresetDef {
  LSPtr<char> font;
  LSPtr<char> font_overlay;
  LSPtr<char> voice;
  LSPtr<char> track;
  LSPtr<char> name;
  uint32_t variation;
#if NUM_BLADES > 0
  LSPtr<char> style[NUM_BLADES];
#endif
};

// One parsed preset. operator[] seeks config/presets.ini and fills this slot.
class SDPresetTable {
 public:
  SDPresetDef& operator[](size_t index);
  void Invalidate() { loaded_ = -1; }

 private:
  friend void LoadSDPresetBlock(size_t index);
  SDPresetDef slot_;
  int loaded_ = -1;
};

extern SDPresetTable sd_presets_storage;
extern uint32_t* sd_preset_offsets;
extern size_t sd_preset_count;
extern size_t sd_preset_offset_cap;
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

inline void ClearSDPresetDef(SDPresetDef* p) {
  if (!p) return;
  p->font.set("");
  p->font_overlay.set("");
  p->voice.set("");
  p->track.set("");
  p->name.set("");
  p->variation = 0;
#if NUM_BLADES > 0
  for (size_t b = 0; b < NUM_BLADES; b++) p->style[b].set("");
#endif
}

inline void SDPresetSkipBom(FileReader& f) {
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
}

// Grow the offset table by doubling. Returns false when realloc fails.
inline bool SDPresetPushOffset(uint32_t offset) {
  if (sd_preset_count == sd_preset_offset_cap) {
    size_t ncap = sd_preset_offset_cap ? sd_preset_offset_cap * 2 : 8;
    uint32_t* n = (uint32_t*)realloc(sd_preset_offsets, ncap * sizeof(uint32_t));
    if (!n) return false;
    sd_preset_offsets = n;
    sd_preset_offset_cap = ncap;
  }
  sd_preset_offsets[sd_preset_count++] = offset;
  return true;
}

inline void SDPresetFitOffsetTable() {
  if (sd_preset_count == 0) {
    free(sd_preset_offsets);
    sd_preset_offsets = nullptr;
    sd_preset_offset_cap = 0;
    return;
  }
  if (sd_preset_offset_cap == sd_preset_count) return;
  uint32_t* n = (uint32_t*)realloc(sd_preset_offsets, sd_preset_count * sizeof(uint32_t));
  if (!n) return;
  sd_preset_offsets = n;
  sd_preset_offset_cap = sd_preset_count;
}

// '=' already consumed and spaces skipped. LSPtr::set takes ownership of readString().
inline void SDPresetApplyField(SDPresetDef* p, const char* variable, FileReader& f, int* style_idx) {
  if (!strcmp(variable, "name")) {
    char* s = f.readString();
    p->name.set(s ? s : "");
  } else if (!strcmp(variable, "font")) {
    char* s = f.readString();
    p->font.set(s ? NormalizePresetFontPath(s) : "");
  } else if (!strcmp(variable, "font_overlay")) {
    char* s = f.readString();
    p->font_overlay.set(s ? NormalizePresetFontPath(s) : "");
  } else if (!strcmp(variable, "voice")) {
    char* s = f.readString();
    if (s) {
      StripIniTrailingLineEndings(s);
      p->voice.set(s);
    } else {
      p->voice.set("");
    }
  } else if (!strcmp(variable, "track")) {
    char* s = f.readString();
    p->track.set(s ? s : "");
  } else if (!strcmp(variable, "variation")) {
    char* s = f.readString();
    if (s) {
      p->variation = (uint32_t)strtol(s, nullptr, 10);
      free(s);
    }
  } else if (!strcmp(variable, "style")) {
    char* s = f.readString();
#if NUM_BLADES > 0
    if (style_idx && *style_idx >= 0 && *style_idx < (int)NUM_BLADES) {
      p->style[*style_idx].set(s ? s : "");
      (*style_idx)++;
      s = nullptr;
    }
#endif
    if (s) free(s);
  }
}

inline void LoadSDPresetBlock(size_t index) {
#ifdef ENABLE_SD
  SDPresetDef* p = &sd_presets_storage.slot_;
  ClearSDPresetDef(p);
  sd_presets_storage.loaded_ = (int)index;
  if (index >= sd_preset_count || !sd_preset_offsets) return;
  LOCK_SD(true);
  {
    ScopedFileReader sf;
    if (sf.Open(SD_CONFIG_PRESETS_PATH)) {
      FileReader& f = sf.Get();
      f.Seek(sd_preset_offsets[index]);
      f.skipwhite();
      char variable[33];
      variable[0] = 0;
      if (f.readVariable(variable) && !strcmp(variable, "new_preset")) {
        f.skipline();
        int style_idx = 0;
        while (f.Available()) {
          f.skipwhite();
          if (!f.Available()) break;
          if (f.Peek() == '#') { f.skipline(); continue; }
          variable[0] = 0;
          if (!f.readVariable(variable) || !variable[0]) { f.skipline(); continue; }
          if (!strcmp(variable, "new_preset") || !strcmp(variable, "end")) break;
          if (!f.Available() || f.Peek() != '=') { f.skipline(); continue; }
          f.Read();
          f.skipspace();
          SDPresetApplyField(p, variable, f, &style_idx);
          f.skipline();
        }
      }
    }
  }
  LOCK_SD(false);
#else
  (void)index;
#endif
}

inline SDPresetDef& SDPresetTable::operator[](size_t index) {
  if (loaded_ != (int)index) LoadSDPresetBlock(index);
  return slot_;
}

// Index config/presets.ini (file offset per new_preset). The active preset is loaded on demand.
// Call after SD is mounted, and before FindBlade() (see ProffieOS.ino) so UseSDConfig() is true
// when SetPreset runs. Does not require current_config.
// Format: same as save-dir presets.ini (new_preset, font=, font_overlay=, voice=, track=, style=, name=, variation=, end).
// Whitespace (space, tab, newline) is tolerated. Malformed lines or parts are ignored and do not crash.
inline void LoadSDConfig() {
#ifdef ENABLE_SD
#if SD_CONFIG_USE_COMPILED_PRESETS
  sd_config_active = false;
  sd_preset_count = 0;
  return;
#endif
  sd_config_active = false;
  free(sd_preset_offsets);
  sd_preset_offsets = nullptr;
  sd_preset_count = 0;
  sd_preset_offset_cap = 0;
  sd_presets_storage.Invalidate();
  LOCK_SD(true);
  ScopedFileReader sf;
  if (!sf.Open(SD_CONFIG_PRESETS_PATH)) {
    LOCK_SD(false);
    return;
  }
  FileReader& f = sf.Get();
  SDPresetSkipBom(f);
  bool offset_full = false;
  while (f.Available()) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#') { f.skipline(); continue; }
    uint32_t line_at = f.Tell();
    char variable[33];
    variable[0] = 0;
    if (!f.readVariable(variable)) { f.skipline(); continue; }
    if (!variable[0]) { f.skipline(); continue; }
    if (!strcmp(variable, "installed")) {
      if (f.Available() && f.Peek() == '=') {
        f.Read();
        f.skipspace();
      }
      f.skipline();
      continue;
    }
    if (!strcmp(variable, "new_preset")) {
      if (!SDPresetPushOffset(line_at)) {
        offset_full = true;
        break;
      }
      f.skipline();
      continue;
    }
    if (!strcmp(variable, "end")) break;
    f.skipline();
  }
  LOCK_SD(false);
  SDPresetFitOffsetTable();
  if (sd_preset_count > 0) {
    sd_config_active = true;
    PVLOG_STATUS << "SD config: indexed " << sd_preset_count << " presets from " SD_CONFIG_PRESETS_PATH;
    if (offset_full) PVLOG_STATUS << " (offset table alloc failed, rest not indexed)";
    PVLOG_STATUS << "\n";
  }
#else
  (void)0;
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
