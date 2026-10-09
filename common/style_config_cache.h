#ifndef COMMON_STYLE_CONFIG_CACHE_H
#define COMMON_STYLE_CONFIG_CACHE_H

// Section offset index + heap layer cache for config/blade_styles.ini (low RAM boot).
// Included from style_config_file.h after parser helpers are defined.

#include "style_config_boot_log.h"
#include "file_reader.h"
#include <stdlib.h>
#include <string.h>

struct StyleConfigSectionIndexEntry {
  char name[64];
  uint32_t offset;  // file position of '[' starting a [section] header
};

struct StyleConfigLayersCacheEntry {
  char section[64];
  int nlayers;
  char* layers;  // nlayers * STYLE_CONFIG_LAYER_STR_LEN bytes on heap
};

// Grown to the number of [section] headers. Not a fixed table.
static StyleConfigSectionIndexEntry* style_config_section_index = nullptr;
static size_t style_config_section_index_count = 0;
static size_t style_config_section_index_cap = 0;
static bool style_config_section_index_ready = false;

// Parsed layer text for the sections the active preset uses.
static StyleConfigLayersCacheEntry* style_config_layers_cache = nullptr;
static int style_config_layers_cache_count = 0;
static int style_config_layers_cache_cap = 0;

inline int StyleConfigLayersCacheCount() { return style_config_layers_cache_count; }

static StylePaletteCacheEntry style_config_global_palette_cache[STYLE_PALETTE_CACHE_MAX];
static int style_config_global_palette_ncache = 0;
static bool style_config_global_palettes_loaded = false;

inline void StyleConfigFreeSectionIndex() {
  free(style_config_section_index);
  style_config_section_index = nullptr;
  style_config_section_index_count = 0;
  style_config_section_index_cap = 0;
  style_config_section_index_ready = false;
}

inline bool StyleConfigAppendSection(const char* name, uint32_t offset) {
  if (!name || !name[0]) return true;
  if (style_config_section_index_count == style_config_section_index_cap) {
    size_t ncap = style_config_section_index_cap ? style_config_section_index_cap * 2 : 8;
    StyleConfigSectionIndexEntry* n = (StyleConfigSectionIndexEntry*)realloc(
        style_config_section_index, ncap * sizeof(StyleConfigSectionIndexEntry));
    if (!n) return false;
    style_config_section_index = n;
    style_config_section_index_cap = ncap;
  }
  StyleConfigSectionIndexEntry* e =
      &style_config_section_index[style_config_section_index_count++];
  strncpy(e->name, name, sizeof(e->name) - 1);
  e->name[sizeof(e->name) - 1] = '\0';
  e->offset = offset;
  return true;
}

inline void StyleConfigFitSectionIndex() {
  if (style_config_section_index_count == 0) {
    StyleConfigFreeSectionIndex();
    return;
  }
  if (style_config_section_index_cap == style_config_section_index_count) return;
  StyleConfigSectionIndexEntry* n = (StyleConfigSectionIndexEntry*)realloc(
      style_config_section_index,
      style_config_section_index_count * sizeof(StyleConfigSectionIndexEntry));
  if (!n) return;
  style_config_section_index = n;
  style_config_section_index_cap = style_config_section_index_count;
}

inline void StyleConfigEnsurePalettesLoaded() {
  if (style_config_global_palettes_loaded) return;
#ifdef ENABLE_SD
  LOCK_SD(true);
  {
    ScopedFileReader sf;
    if (sf.Open(SD_STYLE_CONFIG_PATH)) {
      style_config_global_palette_ncache = 0;
      StyleConfigScanPalettes(sf.Get(), style_config_global_palette_cache,
                              &style_config_global_palette_ncache);
    }
  }
  LOCK_SD(false);
#endif
  style_config_global_palettes_loaded = true;
}

inline bool StyleConfigParsePresetConfigSection(const char* style, char* section_out,
                                                size_t section_max) {
  if (!style || !section_out || section_max == 0) return false;
  const char* p = style;
  while (*p == ' ' || *p == '\t') p++;
  if (strncmp(p, "config", 6) != 0) return false;
  p += 6;
  if (*p && *p != ' ' && *p != '\t') return false;
  while (*p == ' ' || *p == '\t') p++;
  if (!*p) return false;
  size_t i = 0;
  while (*p && *p != ' ' && *p != '\t' && i < section_max - 1) section_out[i++] = *p++;
  section_out[i] = '\0';
  return section_out[0] != '\0';
}

inline int StyleConfigFindSectionOffset(const char* section_name, uint32_t* offset_out) {
  if (!style_config_section_index_ready || !section_name || !offset_out) return -1;
  for (size_t i = 0; i < style_config_section_index_count; i++) {
    if (!strcmp(style_config_section_index[i].name, section_name)) {
      *offset_out = style_config_section_index[i].offset;
      return (int)i;
    }
  }
  return -1;
}

inline void StyleConfigBuildSectionIndexFromSd() {
#ifdef ENABLE_SD
  StyleConfigFreeSectionIndex();
  // Index pass only — no palette scan or layer load at boot (see sd_boot_style_warm.h).
  LOCK_SD(true);
  ScopedFileReader sf;
  if (!sf.Open(SD_STYLE_CONFIG_PATH)) {
    LOCK_SD(false);
    return;
  }
  FileReader& f = sf.Get();
  int line_count = 0;
  while (f.Available() && line_count < SD_STYLE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') {
      f.skipline();
      line_count++;
      continue;
    }
    if (f.Peek() == '[') {
      uint32_t off = f.Tell();
      f.Read();
      f.skipwhite();
      char name[64];
      name[0] = 0;
      int ni = 0;
      while (f.Available() && ni < 63 && f.Peek() != ']') {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        name[ni++] = (char)f.Read();
        name[ni] = 0;
      }
      f.skipline();
      while (ni > 0 && (name[ni - 1] == ' ' || name[ni - 1] == '\t' || name[ni - 1] == '\r'))
        name[--ni] = 0;
      StripIniTrailingLineEndings(name);
      const char* p = name;
      while (*p == ' ' || *p == '\t' || *p == '\r') p++;
      if (p[0] && !StyleConfigAppendSection(p, off)) {
        StyleConfigStatusPrintf("Style config: section index alloc failed, rest not indexed");
        break;
      }
      line_count++;
      continue;
    }
    f.skipline();
    line_count++;
  }
  LOCK_SD(false);
  StyleConfigFitSectionIndex();
  style_config_section_index_ready = style_config_section_index_count > 0;
  StyleConfigStatusPrintf("Style config: indexed %u sections",
                          (unsigned)style_config_section_index_count);
#else
  StyleConfigFreeSectionIndex();
#endif
}

inline void StyleConfigFreeLayersCacheEntry(StyleConfigLayersCacheEntry* e) {
  if (!e) return;
  if (e->layers) free(e->layers);
  e->layers = nullptr;
  e->nlayers = 0;
  e->section[0] = 0;
}

inline void StyleConfigFitLayersCache() {
  if (style_config_layers_cache_count <= 0) {
    free(style_config_layers_cache);
    style_config_layers_cache = nullptr;
    style_config_layers_cache_cap = 0;
    style_config_layers_cache_count = 0;
    return;
  }
  if (style_config_layers_cache_cap == style_config_layers_cache_count) return;
  StyleConfigLayersCacheEntry* n = (StyleConfigLayersCacheEntry*)realloc(
      style_config_layers_cache,
      (size_t)style_config_layers_cache_count * sizeof(StyleConfigLayersCacheEntry));
  if (!n) return;
  style_config_layers_cache = n;
  style_config_layers_cache_cap = style_config_layers_cache_count;
}

inline StyleConfigLayersCacheEntry* StyleConfigLayersCacheAppendSlot() {
  if (style_config_layers_cache_count >= style_config_layers_cache_cap) {
    int ncap = style_config_layers_cache_cap ? style_config_layers_cache_cap * 2 : 2;
    StyleConfigLayersCacheEntry* n = (StyleConfigLayersCacheEntry*)realloc(
        style_config_layers_cache, (size_t)ncap * sizeof(StyleConfigLayersCacheEntry));
    if (!n) return nullptr;
    style_config_layers_cache = n;
    style_config_layers_cache_cap = ncap;
  }
  StyleConfigLayersCacheEntry* e = &style_config_layers_cache[style_config_layers_cache_count++];
  memset(e, 0, sizeof(*e));
  return e;
}

inline void StyleConfigClearLayersCache() {
  for (int i = 0; i < style_config_layers_cache_count; i++)
    StyleConfigFreeLayersCacheEntry(&style_config_layers_cache[i]);
  style_config_layers_cache_count = 0;
  StyleConfigFitLayersCache();
}

inline int StyleConfigCopyLayersFromCache(const char* section_name,
                                          char layers[][STYLE_CONFIG_LAYER_STR_LEN], int max_layers) {
  if (!section_name || !layers || max_layers <= 0) return 0;
  for (int i = 0; i < style_config_layers_cache_count; i++) {
    StyleConfigLayersCacheEntry* e = &style_config_layers_cache[i];
    if (strcmp(e->section, section_name) != 0) continue;
    if (e->nlayers <= 0 || !e->layers) return 0;
    int n = e->nlayers;
    if (n > max_layers) n = max_layers;
    memcpy(layers, e->layers, (size_t)n * STYLE_CONFIG_LAYER_STR_LEN);
    return n;
  }
  return 0;
}

inline void StyleConfigStoreLayersInCache(const char* section_name,
                                          char layers[][STYLE_CONFIG_LAYER_STR_LEN], int count) {
  if (!section_name || !section_name[0] || !layers || count <= 0) return;
  if (count > STYLE_CONFIG_MAX_LAYERS) count = STYLE_CONFIG_MAX_LAYERS;

  for (int i = 0; i < style_config_layers_cache_count; i++) {
    if (!strcmp(style_config_layers_cache[i].section, section_name)) {
      StyleConfigFreeLayersCacheEntry(&style_config_layers_cache[i]);
      style_config_layers_cache[i].layers =
          (char*)malloc((size_t)count * STYLE_CONFIG_LAYER_STR_LEN);
      if (!style_config_layers_cache[i].layers) {
        style_config_layers_cache_count--;
        if (i < style_config_layers_cache_count)
          style_config_layers_cache[i] = style_config_layers_cache[style_config_layers_cache_count];
        return;
      }
      strncpy(style_config_layers_cache[i].section, section_name,
              sizeof(style_config_layers_cache[i].section) - 1);
      style_config_layers_cache[i].section[sizeof(style_config_layers_cache[i].section) - 1] = '\0';
      style_config_layers_cache[i].nlayers = count;
      memcpy(style_config_layers_cache[i].layers, layers, (size_t)count * STYLE_CONFIG_LAYER_STR_LEN);
      return;
    }
  }

  StyleConfigLayersCacheEntry* e = StyleConfigLayersCacheAppendSlot();
  if (!e) return;
  strncpy(e->section, section_name, sizeof(e->section) - 1);
  e->section[sizeof(e->section) - 1] = '\0';
  e->nlayers = count;
  e->layers = (char*)malloc((size_t)count * STYLE_CONFIG_LAYER_STR_LEN);
  if (!e->layers) {
    style_config_layers_cache_count--;
    e->section[0] = 0;
    return;
  }
  memcpy(e->layers, layers, (size_t)count * STYLE_CONFIG_LAYER_STR_LEN);
}

inline int StyleConfigPruneLayersCacheExcept(const char sections[][64], int nsections) {
  const int before = style_config_layers_cache_count;
  if (nsections <= 0) {
    StyleConfigClearLayersCache();
    return before;
  }
  int w = 0;
  for (int i = 0; i < style_config_layers_cache_count; i++) {
    bool keep = false;
    for (int j = 0; j < nsections; j++) {
      if (sections[j][0] && !strcmp(style_config_layers_cache[i].section, sections[j])) {
        keep = true;
        break;
      }
    }
    if (keep) {
      if (w != i) style_config_layers_cache[w] = style_config_layers_cache[i];
      w++;
    } else {
      StyleConfigFreeLayersCacheEntry(&style_config_layers_cache[i]);
    }
  }
  style_config_layers_cache_count = w;
  StyleConfigFitLayersCache();
  return before - w;
}

// Parse section body until next [section] or EOF. Caller positions f at '[' of target section.
inline int StyleConfigParseSectionAtReader(
    FileReader& f, const char* section_name, StyleConfigSectionState* st,
    char layers[][STYLE_CONFIG_LAYER_STR_LEN], int max_layers, StylePaletteCacheEntry* palette_cache,
    int palette_ncache, char include_stack[][STYLE_PATH_MAX]) {
  if (!section_name || !st || !layers || max_layers <= 0 || !palette_cache || !include_stack)
    return 0;
  if (f.Peek() != '[') return 0;
  f.Read();
  f.skipwhite();
  char name[64];
  name[0] = 0;
  int i = 0;
  while (f.Available() && i < 63 && f.Peek() != ']') {
    int c = f.Peek();
    if (c == '\n' || c == '\r') break;
    name[i++] = (char)f.Read();
    name[i] = 0;
  }
  f.skipline();
  while (i > 0 && (name[i - 1] == ' ' || name[i - 1] == '\t' || name[i - 1] == '\r')) name[--i] = 0;
  StripIniTrailingLineEndings(name);
  const char* p = name;
  while (*p == ' ' || *p == '\t' || *p == '\r') p++;
  if (strcmp(p, section_name) != 0) return 0;

  int count = 0;
  int line_count = 0;
  while (f.Available() && count < max_layers && line_count < SD_STYLE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') {
      f.skipline();
      line_count++;
      continue;
    }
    if (f.Peek() == '[') {
      StyleConfigFlushPendingStructuredLayer(st, layers, &count, max_layers);
      break;
    }
    char variable[33];
    variable[0] = 0;
    f.readVariable(variable);
    if (!variable[0]) {
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "version")) {
      f.skipline();
      line_count++;
      continue;
    }
    if (!strcmp(variable, "layer")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, &count, max_layers);
      if (count >= max_layers) {
        f.skipline();
        line_count++;
        continue;
      }
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') {
        f.skipline();
        line_count++;
        continue;
      }
      f.Read();
      f.skipwhite();
      char temp[STYLE_CONFIG_LAYER_STR_LEN];
      int ti = 0;
      while (f.Available() && ti < (int)sizeof(temp) - 1) {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        temp[ti++] = (char)f.Read();
      }
      temp[ti] = 0;
      while (ti > 0 && (temp[ti - 1] == ' ' || temp[ti - 1] == '\t' || temp[ti - 1] == '\r'))
        temp[--ti] = 0;
      StripIniTrailingLineEndings(temp);
      StyleConfigExpandLocalVars(layers[count], STYLE_CONFIG_LAYER_STR_LEN, temp, st->keys, st->vals,
                                 st->var_count, st->preset_override_count, st->preset_override_keys,
                                 st->preset_override_vals);
      if (layers[count][0]) count++;
    } else if (!strncmp(variable, "layer.", 6)) {
      char sty[20];
      char sl[32];
      if (!StyleConfigParseLayerDot(variable, sty, sizeof(sty), sl, sizeof(sl))) {
        f.skipline();
        line_count++;
        continue;
      }
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') {
        f.skipline();
        line_count++;
        continue;
      }
      f.Read();
      f.skipwhite();
      char valbuf[STYLE_CONFIG_LOCAL_VAL_LEN];
      int vi = 0;
      while (f.Available() && vi < STYLE_CONFIG_LOCAL_VAL_LEN - 1) {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        valbuf[vi++] = (char)f.Read();
      }
      valbuf[vi] = 0;
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r'))
        valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigApplyStructuredLayerLine(st, sty, sl, valbuf, layers, &count, max_layers);
    } else if (!strcmp(variable, "palette")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, &count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') {
        f.skipline();
        line_count++;
        continue;
      }
      f.Read();
      f.skipwhite();
      char palname[STYLE_CONFIG_LOCAL_VAL_LEN];
      int vi = 0;
      while (f.Available() && vi < (int)sizeof(palname) - 1) {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        palname[vi++] = (char)f.Read();
      }
      palname[vi] = 0;
      while (vi > 0 && (palname[vi - 1] == ' ' || palname[vi - 1] == '\t' || palname[vi - 1] == '\r'))
        palname[--vi] = 0;
      StripIniTrailingLineEndings(palname);
      StyleConfigEnsurePalettesLoaded();
      const StylePaletteCacheEntry* pal = StyleConfigFindPalette(
          style_config_global_palette_cache, style_config_global_palette_ncache, palname);
      StyleConfigMergePaletteMissing(st->keys, st->vals, &st->var_count, pal);
    } else if (!strcmp(variable, "include")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, &count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') {
        f.skipline();
        line_count++;
        continue;
      }
      f.Read();
      f.skipwhite();
      char pathbuf[STYLE_PATH_MAX];
      int pi = 0;
      while (f.Available() && pi < (int)sizeof(pathbuf) - 1) {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        pathbuf[pi++] = (char)f.Read();
      }
      pathbuf[pi] = 0;
      while (pi > 0 && (pathbuf[pi - 1] == ' ' || pathbuf[pi - 1] == '\t' || pathbuf[pi - 1] == '\r'))
        pathbuf[--pi] = 0;
      StripIniTrailingLineEndings(pathbuf);
      f.skipline();
      line_count++;
      char norm[STYLE_PATH_MAX];
      if (StyleConfigNormalizeIncludePath(pathbuf, norm, sizeof(norm)) &&
          !StyleConfigPathInStack(norm, include_stack, 0)) {
        strncpy(include_stack[0], norm, STYLE_PATH_MAX - 1);
        include_stack[0][STYLE_PATH_MAX - 1] = '\0';
        ScopedFileReader inc;
        if (inc.Open(norm)) {
          StyleConfigProcessStyleFragment(inc.Get(), st, layers, &count, max_layers, palette_cache,
                                          palette_ncache, &line_count, 1, include_stack);
        }
      }
      continue;
    } else {
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') {
        f.skipline();
        line_count++;
        continue;
      }
      f.Read();
      f.skipwhite();
      char valbuf[STYLE_CONFIG_LOCAL_VAL_LEN];
      int vi = 0;
      while (f.Available() && vi < STYLE_CONFIG_LOCAL_VAL_LEN - 1) {
        int c = f.Peek();
        if (c == '\n' || c == '\r') break;
        valbuf[vi++] = (char)f.Read();
      }
      valbuf[vi] = 0;
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r'))
        valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigSetOrOverrideVar(st->keys, st->vals, &st->var_count, variable, valbuf);
    }
    f.skipline();
    line_count++;
  }
  StyleConfigFlushPendingStructuredLayer(st, layers, &count, max_layers);
  StyleConfigPublishTransition(st, layers, &count, max_layers);
  return count;
}

// Seek-load one [section] using an already-open blade_styles.ini (index must be ready).
inline int StyleConfigLoadLayersFromIndexedOpenFile(
    FileReader& f, const char* section_name, char layers[][STYLE_CONFIG_LAYER_STR_LEN],
    int max_layers, int override_count,
    const char (*override_keys)[STYLE_CONFIG_LOCAL_KEY_LEN],
    const char (*override_vals)[STYLE_CONFIG_LOCAL_VAL_LEN]) {
  if (!section_name || !section_name[0] || !layers || max_layers <= 0) return 0;
  if (!style_config_section_index_ready) return 0;
  uint32_t section_off = 0;
  if (StyleConfigFindSectionOffset(section_name, &section_off) < 0) return 0;
  StyleConfigSectionState st;
  memset(&st, 0, sizeof(st));
  int oc = override_count;
  if (oc < 0) oc = 0;
  else if (oc > STYLE_CONFIG_MAX_LOCAL_VARS) oc = STYLE_CONFIG_MAX_LOCAL_VARS;
  st.preset_override_count = oc;
  st.preset_override_keys = override_keys;
  st.preset_override_vals = override_vals;
  char include_stack[STYLE_INCLUDE_MAX_DEPTH][STYLE_PATH_MAX];
  memset(include_stack, 0, sizeof(include_stack));
  f.Seek(section_off);
  return StyleConfigParseSectionAtReader(
      f, section_name, &st, layers, max_layers, style_config_global_palette_cache,
      style_config_global_palette_ncache, include_stack);
}

#endif  // COMMON_STYLE_CONFIG_CACHE_H
