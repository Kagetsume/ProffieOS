#ifndef COMMON_STYLE_CONFIG_FILE_H
#define COMMON_STYLE_CONFIG_FILE_H

// Blade style config file: defines named styles as layers of other styles.
// File: config/blade_styles.ini on SD card.
// Format: [style_name] then layer=<style string> lines; each layer is composed in order.
// Easy to read: one section per effect, one line per layer (rainbow, fire, strobe, etc.).
//
// Safety (invariants for parser hardening):
// - SD_STYLE_CONFIG_MAX_LINES caps total lines scanned per pass; layer/value reads cap at buffer size - 1
//   and always NUL-terminate; variable names from FileReader::readVariable are at most 32 chars + NUL.
// - STYLE_CONFIG_MAX_LAYERS, STYLE_CONFIG_MAX_LOCAL_VARS, STYLE_PALETTE_CACHE_MAX, STYLE_INCLUDE_MAX_DEPTH
//   bound RAM and recursion; include paths are normalized and cycle-checked.
// - After StyleConfigFlushPendingStructuredLayer, a plain layer = line is skipped if count >= max_layers
//   so layers[count] is never written out of range.
// - LoadStyleConfigLayers clamps override_count to [0, STYLE_CONFIG_MAX_LOCAL_VARS] before use so preset
//   k=v pairs never index past override buffer bounds.
// - Line endings: values read with bounded Peek loops stop at \n or \r (leave terminator for skipline);
//   FileReader::skipline() consumes LF, CRLF, or CR-only. Preset/font/track/style values use readString(),
//   which treats \n and \r as line ends without storing CR (see file_reader.h).
// - Helpers null-check pointers where misuse would be UB; preset override counts are clamped in
//   StyleConfigExpandLocalVars; strncpy targets are always sized arrays.

#include "file_reader.h"
#include "lsfs.h"
#include "strfun.h"
#include <stdio.h>
#include <string.h>

#define SD_STYLE_CONFIG_PATH "config/blade_styles.ini"
#define SD_STYLE_CONFIG_MAX_LINES 4096  // Cap to avoid runaway on huge/malformed file
#define STYLE_CONFIG_MAX_LAYERS 16   // Cap for RAM: loading buffer is MAX_LAYERS*LAYER_STR_LEN
// A.4: Per config style, stack holds MAX_LAYERS * this (e.g. 16×384 ≈ 6.1 KiB in style_parser.h).
#define STYLE_CONFIG_LAYER_STR_LEN 384
#define STYLE_STRUCT_MAX_ARGS 12
#define STYLE_CONFIG_MAX_LOCAL_VARS 16
#define STYLE_CONFIG_LOCAL_KEY_LEN 32
#define STYLE_CONFIG_LOCAL_VAL_LEN 128
#define STYLE_PALETTE_CACHE_MAX 8
#define STYLE_INCLUDE_MAX_DEPTH 4
#define STYLE_PATH_MAX 64

// Keys/vals, pending structured layer.<style>.<slot> (Phase B), shared across includes.
struct StyleConfigSectionState {
  char keys[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_KEY_LEN];
  char vals[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_VAL_LEN];
  int var_count;
  // Preset line tokens (config <section> k=v ...): win over file/palette for {{name}} (Phase D).
  int preset_override_count;
  const char (*preset_override_keys)[STYLE_CONFIG_LOCAL_KEY_LEN];
  const char (*preset_override_vals)[STYLE_CONFIG_LOCAL_VAL_LEN];
  char pending_struct_style[20];
  char pending_struct_args[STYLE_STRUCT_MAX_ARGS][STYLE_CONFIG_LOCAL_VAL_LEN];
  uint16_t pending_struct_mask;
  int pending_struct_nargs;
  const char* const * pending_struct_defaults;
};

struct StylePaletteCacheEntry {
  char name[STYLE_CONFIG_LOCAL_KEY_LEN];
  char keys[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_KEY_LEN];
  char vals[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_VAL_LEN];
  int nvars;
};

inline int StyleConfigFindVarKeyIndex(const char keys[][STYLE_CONFIG_LOCAL_KEY_LEN], int nvars,
                                      const char* key) {
  if (!keys || !key) return -1;
  if (nvars < 0) nvars = 0;
  if (nvars > STYLE_CONFIG_MAX_LOCAL_VARS) nvars = STYLE_CONFIG_MAX_LOCAL_VARS;
  for (int i = 0; i < nvars; i++) {
    if (!strcmp(keys[i], key)) return i;
  }
  return -1;
}

inline void StyleConfigSetOrOverrideVar(char keys[][STYLE_CONFIG_LOCAL_KEY_LEN],
                                        char vals[][STYLE_CONFIG_LOCAL_VAL_LEN],
                                        int* var_count,
                                        const char* key,
                                        const char* value) {
  if (!keys || !vals || !var_count) return;
  if (!key || !key[0]) return;
  if (!value) value = "";
  int ix = StyleConfigFindVarKeyIndex(keys, *var_count, key);
  if (ix >= 0) {
    strncpy(vals[ix], value, STYLE_CONFIG_LOCAL_VAL_LEN - 1);
    vals[ix][STYLE_CONFIG_LOCAL_VAL_LEN - 1] = '\0';
    return;
  }
  if (*var_count >= STYLE_CONFIG_MAX_LOCAL_VARS) return;
  strncpy(keys[*var_count], key, STYLE_CONFIG_LOCAL_KEY_LEN - 1);
  keys[*var_count][STYLE_CONFIG_LOCAL_KEY_LEN - 1] = '\0';
  strncpy(vals[*var_count], value, STYLE_CONFIG_LOCAL_VAL_LEN - 1);
  vals[*var_count][STYLE_CONFIG_LOCAL_VAL_LEN - 1] = '\0';
  (*var_count)++;
}

// Merge palette keys into vars only for keys not already set (locals win over palette for same key if set first).
inline void StyleConfigMergePaletteMissing(char keys[][STYLE_CONFIG_LOCAL_KEY_LEN],
                                           char vals[][STYLE_CONFIG_LOCAL_VAL_LEN],
                                           int* var_count,
                                           const StylePaletteCacheEntry* pal) {
  if (!pal || !var_count) return;
  int n = pal->nvars;
  if (n < 0) n = 0;
  if (n > STYLE_CONFIG_MAX_LOCAL_VARS) n = STYLE_CONFIG_MAX_LOCAL_VARS;
  for (int i = 0; i < n; i++) {
    if (StyleConfigFindVarKeyIndex(keys, *var_count, pal->keys[i]) < 0)
      StyleConfigSetOrOverrideVar(keys, vals, var_count, pal->keys[i], pal->vals[i]);
  }
}

inline const StylePaletteCacheEntry* StyleConfigFindPalette(const StylePaletteCacheEntry* cache,
                                                             int ncache,
                                                             const char* name) {
  if (!cache || ncache <= 0 || !name || !name[0]) return nullptr;
  for (int i = ncache - 1; i >= 0; i--) {
    if (!strcmp(cache[i].name, name)) return &cache[i];
  }
  return nullptr;
}

inline bool StyleConfigPathInStack(const char* path, char path_stack[][STYLE_PATH_MAX], int depth) {
  if (!path || !path_stack || depth < 0) return false;
  for (int i = 0; i < depth; i++) {
    if (!strcmp(path_stack[i], path)) return true;
  }
  return false;
}

// Paths must stay under SD root: only forward slashes, no "..". Relative paths use config/blade_styles/.
inline bool StyleConfigNormalizeIncludePath(const char* in, char* out, size_t out_max) {
  if (!in || !out || out_max < 16) return false;
  char work[STYLE_PATH_MAX];
  int wi = 0;
  while (*in == ' ' || *in == '\t' || *in == '\r') in++;
  while (*in && wi < (int)sizeof(work) - 1) work[wi++] = *in++;
  work[wi] = '\0';
  while (wi > 0 && (work[wi - 1] == ' ' || work[wi - 1] == '\t' || work[wi - 1] == '\r')) work[--wi] = '\0';
  StripIniTrailingLineEndings(work);
  if (!work[0]) return false;
  if (strstr(work, "..")) return false;
  for (const char* p = work; *p; p++) {
    if (*p == '\\') return false;
  }
  if (!strncmp(work, "config/", 7)) {
    if (strlen(work) >= out_max) return false;
    strncpy(out, work, out_max - 1);
    out[out_max - 1] = '\0';
    return true;
  }
  if (!strncmp(work, "blade_styles/", 13)) {
    int n = snprintf(out, out_max, "config/%s", work);
    if (n < 0 || (size_t)n >= out_max) return false;
    return true;
  }
  int n = snprintf(out, out_max, "config/blade_styles/%s", work);
  if (n < 0 || (size_t)n >= out_max) return false;
  return true;
}

// First pass: fill cache with [palette_name] sections (name after "palette_" prefix).
// Top-level `include = path` merges palette sections from another file (bounded depth, cycle-safe).
inline void StyleConfigScanPalettesRecursive(FileReader& f, StylePaletteCacheEntry* cache, int* nout,
                                             int include_depth, char path_stack[][STYLE_PATH_MAX]) {
  if (!cache || !nout || !path_stack) return;
  int line_count = 0;
  bool in_palette = false;
  int cur = -1;
  while (f.Available() && line_count < SD_STYLE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') { f.skipline(); line_count++; continue; }
    if (f.Peek() == '[') {
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
      while (ni > 0 && (name[ni - 1] == ' ' || name[ni - 1] == '\t' || name[ni - 1] == '\r')) name[--ni] = 0;
      StripIniTrailingLineEndings(name);
      const char* p = name;
      while (*p == ' ' || *p == '\t' || *p == '\r') p++;
      in_palette = false;
      cur = -1;
      if (strlen(p) > 8 && !strncmp(p, "palette_", 8)) {
        if (*nout < STYLE_PALETTE_CACHE_MAX) {
          cur = *nout;
          (*nout)++;
          in_palette = true;
          strncpy(cache[cur].name, p + 8, STYLE_CONFIG_LOCAL_KEY_LEN - 1);
          cache[cur].name[STYLE_CONFIG_LOCAL_KEY_LEN - 1] = '\0';
          cache[cur].nvars = 0;
        }
      }
      line_count++;
      continue;
    }
    if (!in_palette) {
      uint32_t pos = f.Tell();
      char variable[33];
      variable[0] = 0;
      f.readVariable(variable);
      if (!strcmp(variable, "include")) {
        f.skipwhite();
        if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
        while (pi > 0 && (pathbuf[pi - 1] == ' ' || pathbuf[pi - 1] == '\t' || pathbuf[pi - 1] == '\r')) pathbuf[--pi] = 0;
        StripIniTrailingLineEndings(pathbuf);
        f.skipline();
        line_count++;
        char norm[STYLE_PATH_MAX];
        if (include_depth >= STYLE_INCLUDE_MAX_DEPTH) continue;
        if (!StyleConfigNormalizeIncludePath(pathbuf, norm, sizeof(norm))) continue;
        if (StyleConfigPathInStack(norm, path_stack, include_depth)) continue;
        strncpy(path_stack[include_depth], norm, STYLE_PATH_MAX - 1);
        path_stack[include_depth][STYLE_PATH_MAX - 1] = '\0';
        FileReader inc;
        if (!inc.Open(norm)) continue;
        StyleConfigScanPalettesRecursive(inc, cache, nout, include_depth + 1, path_stack);
        inc.Close();
        continue;
      }
      f.Seek(pos);
      f.skipline();
      line_count++;
      continue;
    }
    if (cur < 0) { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    f.readVariable(variable);
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "version")) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "layer") || !strcmp(variable, "palette") || !strcmp(variable, "include")) {
      f.skipline();
      line_count++;
      continue;
    }
    f.skipwhite();
    if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
    while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r')) valbuf[--vi] = 0;
    StripIniTrailingLineEndings(valbuf);
    StyleConfigSetOrOverrideVar(cache[cur].keys, cache[cur].vals, &cache[cur].nvars, variable, valbuf);
    f.skipline();
    line_count++;
  }
}

inline void StyleConfigScanPalettes(FileReader& f, StylePaletteCacheEntry* cache, int* nout) {
  if (!cache || !nout) return;
  *nout = 0;
  f.Rewind();
  char stack[STYLE_INCLUDE_MAX_DEPTH][STYLE_PATH_MAX];
  StyleConfigScanPalettesRecursive(f, cache, nout, 0, stack);
  f.Rewind();
}

// Expand {{name}} in `in` using keys/vals (nvars entries). Preset overrides (if any) win over locals.
// Output bounded by out_max; malformed {{...}} left as-is.
inline void StyleConfigExpandLocalVars(char* out, size_t out_max, const char* in,
                                       const char keys[][STYLE_CONFIG_LOCAL_KEY_LEN],
                                       const char vals[][STYLE_CONFIG_LOCAL_VAL_LEN],
                                       int nvars,
                                       int preset_override_count = 0,
                                       const char (*preset_override_keys)[STYLE_CONFIG_LOCAL_KEY_LEN] = nullptr,
                                       const char (*preset_override_vals)[STYLE_CONFIG_LOCAL_VAL_LEN] = nullptr) {
  if (!out || out_max == 0) return;
  out[0] = '\0';
  if (!in) return;
  if (!keys || !vals) nvars = 0;
  else if (nvars < 0) nvars = 0;
  else if (nvars > STYLE_CONFIG_MAX_LOCAL_VARS) nvars = STYLE_CONFIG_MAX_LOCAL_VARS;
  if (preset_override_count < 0) preset_override_count = 0;
  else if (preset_override_count > STYLE_CONFIG_MAX_LOCAL_VARS) preset_override_count = STYLE_CONFIG_MAX_LOCAL_VARS;
  if (preset_override_count > 0 && (!preset_override_keys || !preset_override_vals))
    preset_override_count = 0;
  size_t o = 0;
  while (*in && o + 1 < out_max) {
    if (in[0] == '{' && in[1] == '{') {
      const char* open = in;
      in += 2;
      char key[STYLE_CONFIG_LOCAL_KEY_LEN];
      int k = 0;
      while (*in && k < (int)sizeof(key) - 1) {
        if (in[0] == '}' && in[1] == '}') break;
        char c = *in;
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
          key[k++] = c;
        else
          break;
        in++;
      }
      key[k] = '\0';
      if (in[0] == '}' && in[1] == '}') {
        in += 2;
        const char* repl = nullptr;
        bool found = false;
        if (preset_override_count > 0 && preset_override_keys && preset_override_vals) {
          for (int i = 0; i < preset_override_count && i < STYLE_CONFIG_MAX_LOCAL_VARS; i++) {
            if (preset_override_keys[i][0] && !strcmp(preset_override_keys[i], key)) {
              repl = preset_override_vals[i];
              found = true;
              break;
            }
          }
        }
        if (!found) {
          for (int i = 0; i < nvars; i++) {
            if (!strcmp(keys[i], key)) {
              repl = vals[i];
              found = true;
              break;
            }
          }
        }
        if (found) {
          if (repl) {
            while (*repl && o + 1 < out_max) out[o++] = *repl++;
          }
        } else {
          // No key: keep "{{name}}" so configs don't become "standard   " (breaks base colors;
          // effect-only layers without {{}} still parsed).
          for (const char* q = open; q < in && o + 1 < out_max; q++) out[o++] = *q;
        }
      } else {
        out[o++] = '{';
        in = open + 1;
      }
      continue;
    }
    out[o++] = *in++;
  }
  if (o < out_max) out[o] = '\0';
  else out[out_max - 1] = '\0';
}

inline bool StyleConfigParseLayerDot(const char* variable, char* style_out, size_t style_max,
                                     char* slot_out, size_t slot_max) {
  if (!variable || !style_out || !slot_out || style_max == 0 || slot_max == 0) return false;
  if (strncmp(variable, "layer.", 6) != 0) return false;
  const char* p = variable + 6;
  const char* dot = strchr(p, '.');
  if (!dot) return false;
  size_t slen = (size_t)(dot - p);
  if (slen == 0 || slen >= style_max) return false;
  memcpy(style_out, p, slen);
  style_out[slen] = '\0';
  strncpy(slot_out, dot + 1, slot_max - 1);
  slot_out[slot_max - 1] = '\0';
  return slot_out[0] != '\0';
}

inline bool StyleConfigStructuredStyleDef(const char* style, int* nargs, const char* const ** def_out) {
  if (!nargs || !def_out) return false;
  *nargs = 0;
  *def_out = nullptr;
  if (!style) return false;
  if (!strcmp(style, "standard")) {
    static const char* const d[] = {"cyan", "white", "300", "800"};
    *nargs = 4;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "fire")) {
    static const char* const d[] = {"red", "yellow"};
    *nargs = 2;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "rainbow")) {
    static const char* const d[] = {"300", "800"};
    *nargs = 2;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "strobe")) {
    static const char* const d[] = {"black", "white", "15", "1", "300", "800"};
    *nargs = 6;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "cycle")) {
    static const char* const d[] = {"blue", "blue", "cyan", "Rgb(255,50,50)", "red"};
    *nargs = 5;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "unstable")) {
    static const char* const d[] = {"red", "orange", "yellow", "Rgb(255,255,10)", "100", "200"};
    *nargs = 6;
    *def_out = d;
    return true;
  }
  if (!strcmp(style, "advanced")) {
    static const char* const d[] = {"red", "blue", "green", "white", "10", "white", "magenta",
                                    "white", "300", "800", "white"};
    *nargs = 11;
    *def_out = d;
    return true;
  }
  return false;
}

inline int StyleConfigStructuredSlotIndex(const char* style, const char* slot) {
  if (!style || !slot) return -1;
  if (!strcmp(style, "standard")) {
    if (!strcmp(slot, "base")) return 0;
    if (!strcmp(slot, "clash")) return 1;
    if (!strcmp(slot, "ext") || !strcmp(slot, "extension")) return 2;
    if (!strcmp(slot, "ret") || !strcmp(slot, "retraction")) return 3;
    return -1;
  }
  if (!strcmp(style, "fire")) {
    if (!strcmp(slot, "warm")) return 0;
    if (!strcmp(slot, "hot")) return 1;
    return -1;
  }
  if (!strcmp(style, "rainbow")) {
    if (!strcmp(slot, "ext") || !strcmp(slot, "extension")) return 0;
    if (!strcmp(slot, "ret") || !strcmp(slot, "retraction")) return 1;
    return -1;
  }
  if (!strcmp(style, "strobe")) {
    if (!strcmp(slot, "standby")) return 0;
    if (!strcmp(slot, "flash")) return 1;
    if (!strcmp(slot, "freq") || !strcmp(slot, "frequency")) return 2;
    if (!strcmp(slot, "flash_ms") || !strcmp(slot, "flashms")) return 3;
    if (!strcmp(slot, "ext") || !strcmp(slot, "extension")) return 4;
    if (!strcmp(slot, "ret") || !strcmp(slot, "retraction")) return 5;
    return -1;
  }
  if (!strcmp(style, "cycle")) {
    if (!strcmp(slot, "start")) return 0;
    if (!strcmp(slot, "base")) return 1;
    if (!strcmp(slot, "flicker")) return 2;
    if (!strcmp(slot, "blast")) return 3;
    if (!strcmp(slot, "lockup")) return 4;
    return -1;
  }
  if (!strcmp(style, "unstable")) {
    if (!strcmp(slot, "warm")) return 0;
    if (!strcmp(slot, "warmer")) return 1;
    if (!strcmp(slot, "hot")) return 2;
    if (!strcmp(slot, "sparks")) return 3;
    if (!strcmp(slot, "ext") || !strcmp(slot, "extension")) return 4;
    if (!strcmp(slot, "ret") || !strcmp(slot, "retraction")) return 5;
    return -1;
  }
  if (!strcmp(style, "advanced")) {
    if (!strcmp(slot, "hilt")) return 0;
    if (!strcmp(slot, "middle")) return 1;
    if (!strcmp(slot, "tip")) return 2;
    if (!strcmp(slot, "onspark")) return 3;
    if (!strcmp(slot, "onspark_time") || !strcmp(slot, "onsparktime")) return 4;
    if (!strcmp(slot, "blast")) return 5;
    if (!strcmp(slot, "lockup")) return 6;
    if (!strcmp(slot, "clash")) return 7;
    if (!strcmp(slot, "ext") || !strcmp(slot, "extension")) return 8;
    if (!strcmp(slot, "ret") || !strcmp(slot, "retraction")) return 9;
    if (!strcmp(slot, "spark_tip") || !strcmp(slot, "sparktip")) return 10;
    return -1;
  }
  return -1;
}

inline void StyleConfigClearPendingStruct(StyleConfigSectionState* st) {
  if (!st) return;
  st->pending_struct_style[0] = '\0';
  st->pending_struct_mask = 0;
  st->pending_struct_nargs = 0;
  st->pending_struct_defaults = nullptr;
}

inline void StyleConfigFlushPendingStructuredLayer(StyleConfigSectionState* st,
                                                   char layers[][STYLE_CONFIG_LAYER_STR_LEN],
                                                   int* count,
                                                   int max_layers) {
  if (!st || !layers || !count || max_layers <= 0) return;
  if (!st->pending_struct_style[0]) return;
  if (*count >= max_layers) {
    StyleConfigClearPendingStruct(st);
    return;
  }
  int nargs = st->pending_struct_nargs;
  const char* const * def = st->pending_struct_defaults;
  if (!def || nargs <= 0 || nargs > STYLE_STRUCT_MAX_ARGS) {
    StyleConfigClearPendingStruct(st);
    return;
  }
  char buf[STYLE_CONFIG_LAYER_STR_LEN];
  int pos = snprintf(buf, sizeof(buf), "%s", st->pending_struct_style);
  if (pos < 0 || pos >= (int)sizeof(buf)) {
    StyleConfigClearPendingStruct(st);
    return;
  }
  for (int i = 0; i < nargs; i++) {
    const char* v = (st->pending_struct_mask & (1u << i)) ? st->pending_struct_args[i] : def[i];
    if (!v) v = "";
    int n = snprintf(buf + pos, sizeof(buf) - (size_t)pos, " %s", v);
    if (n < 0 || pos + n >= (int)sizeof(buf)) {
      StyleConfigClearPendingStruct(st);
      return;
    }
    pos += n;
  }
  StyleConfigExpandLocalVars(layers[*count], STYLE_CONFIG_LAYER_STR_LEN, buf, st->keys, st->vals,
                             st->var_count, st->preset_override_count, st->preset_override_keys,
                             st->preset_override_vals);
  if (layers[*count][0]) (*count)++;
  StyleConfigClearPendingStruct(st);
}

inline void StyleConfigApplyStructuredLayerLine(StyleConfigSectionState* st, const char* style,
                                                const char* slot, const char* val,
                                                char layers[][STYLE_CONFIG_LAYER_STR_LEN],
                                                int* count, int max_layers) {
  if (!st || !count || !layers || max_layers <= 0) return;
  int nargs;
  const char* const * def;
  if (!StyleConfigStructuredStyleDef(style, &nargs, &def)) return;
  int ix = StyleConfigStructuredSlotIndex(style, slot);
  if (ix < 0 || ix >= nargs) return;
  if (st->pending_struct_style[0] && strcmp(st->pending_struct_style, style) != 0)
    StyleConfigFlushPendingStructuredLayer(st, layers, count, max_layers);
  if (!st->pending_struct_style[0]) {
    strncpy(st->pending_struct_style, style, sizeof(st->pending_struct_style) - 1);
    st->pending_struct_style[sizeof(st->pending_struct_style) - 1] = '\0';
    st->pending_struct_nargs = nargs;
    st->pending_struct_defaults = def;
    st->pending_struct_mask = 0;
  }
  const char* v = val ? val : "";
  strncpy(st->pending_struct_args[ix], v, STYLE_CONFIG_LOCAL_VAL_LEN - 1);
  st->pending_struct_args[ix][STYLE_CONFIG_LOCAL_VAL_LEN - 1] = '\0';
  st->pending_struct_mask |= (uint16_t)(1u << ix);
}

// Process lines from an included fragment (or nested include): layer / palette / include / name=value.
// Fragment files may use `[section]` lines; those lines are skipped (not end-of-section).
inline void StyleConfigProcessStyleFragment(FileReader& f,
                                            StyleConfigSectionState* st,
                                            char layers[][STYLE_CONFIG_LAYER_STR_LEN],
                                            int* count,
                                            int max_layers,
                                            StylePaletteCacheEntry* palette_cache,
                                            int palette_ncache,
                                            int* line_count,
                                            int include_depth,
                                            char path_stack[][STYLE_PATH_MAX]) {
  if (!st || !layers || !count || !line_count || !palette_cache || !path_stack || max_layers <= 0)
    return;
  while (f.Available() && *count < max_layers && *line_count < SD_STYLE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') { f.skipline(); (*line_count)++; continue; }
    if (f.Peek() == '[') { f.skipline(); (*line_count)++; continue; }
    char variable[33];
    variable[0] = 0;
    f.readVariable(variable);
    if (!variable[0]) { f.skipline(); (*line_count)++; continue; }
    if (!strcmp(variable, "version")) { f.skipline(); (*line_count)++; continue; }
    if (!strcmp(variable, "layer")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, count, max_layers);
      if (*count >= max_layers) { f.skipline(); (*line_count)++; continue; }
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); (*line_count)++; continue; }
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
      while (ti > 0 && (temp[ti - 1] == ' ' || temp[ti - 1] == '\t' || temp[ti - 1] == '\r')) temp[--ti] = 0;
      StripIniTrailingLineEndings(temp);
      StyleConfigExpandLocalVars(layers[*count], STYLE_CONFIG_LAYER_STR_LEN, temp, st->keys, st->vals,
                                 st->var_count, st->preset_override_count, st->preset_override_keys,
                                 st->preset_override_vals);
      if (layers[*count][0]) (*count)++;
    } else if (!strncmp(variable, "layer.", 6)) {
      char sty[20];
      char sl[32];
      if (!StyleConfigParseLayerDot(variable, sty, sizeof(sty), sl, sizeof(sl))) {
        f.skipline();
        (*line_count)++;
        continue;
      }
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); (*line_count)++; continue; }
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
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r')) valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigApplyStructuredLayerLine(st, sty, sl, valbuf, layers, count, max_layers);
    } else if (!strcmp(variable, "palette")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); (*line_count)++; continue; }
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
      while (vi > 0 && (palname[vi - 1] == ' ' || palname[vi - 1] == '\t' || palname[vi - 1] == '\r')) palname[--vi] = 0;
      StripIniTrailingLineEndings(palname);
      const StylePaletteCacheEntry* pal =
          StyleConfigFindPalette(palette_cache, palette_ncache, palname);
      StyleConfigMergePaletteMissing(st->keys, st->vals, &st->var_count, pal);
    } else if (!strcmp(variable, "include")) {
      StyleConfigFlushPendingStructuredLayer(st, layers, count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); (*line_count)++; continue; }
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
      while (pi > 0 && (pathbuf[pi - 1] == ' ' || pathbuf[pi - 1] == '\t' || pathbuf[pi - 1] == '\r')) pathbuf[--pi] = 0;
      StripIniTrailingLineEndings(pathbuf);
      f.skipline();
      (*line_count)++;
      char norm[STYLE_PATH_MAX];
      if (include_depth >= STYLE_INCLUDE_MAX_DEPTH) continue;
      if (!StyleConfigNormalizeIncludePath(pathbuf, norm, sizeof(norm))) continue;
      if (StyleConfigPathInStack(norm, path_stack, include_depth)) continue;
      strncpy(path_stack[include_depth], norm, STYLE_PATH_MAX - 1);
      path_stack[include_depth][STYLE_PATH_MAX - 1] = '\0';
      FileReader inc;
      if (!inc.Open(norm)) continue;
      StyleConfigProcessStyleFragment(inc, st, layers, count, max_layers, palette_cache, palette_ncache,
                                        line_count, include_depth + 1, path_stack);
      inc.Close();
      continue;
    } else {
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); (*line_count)++; continue; }
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
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r')) valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigSetOrOverrideVar(st->keys, st->vals, &st->var_count, variable, valbuf);
    }
    f.skipline();
    (*line_count)++;
  }
}

// Load layer strings for a section from config/blade_styles.ini.
// section_name: [section_name] (case-sensitive match; leading/trailing space trimmed).
// layers: output array of style strings (each parsed as a normal preset style, e.g. "rainbow 300 800").
// max_layers: max number of layers to fill.
// Returns number of layers loaded (0 if file/section missing or invalid).
// Parser is hardened: ignores malformed lines, tolerates whitespace (spaces/tabs/blank lines),
// treats # and ; as comment, skips unknown variables, skips empty layer values; does not crash.
// Phase A/B: locals + {{}}; palettes; includes; structured layer.<style>.<slot> keys.
// Phase D: optional preset overrides (key=value) merged after INI locals for the section.
inline int LoadStyleConfigLayers(const char* section_name,
                                  char layers[][STYLE_CONFIG_LAYER_STR_LEN],
                                  int max_layers,
                                  int override_count = 0,
                                  const char (*override_keys)[STYLE_CONFIG_LOCAL_KEY_LEN] = nullptr,
                                  const char (*override_vals)[STYLE_CONFIG_LOCAL_VAL_LEN] = nullptr) {
  if (!section_name || !section_name[0] || !layers || max_layers <= 0) return 0;
#ifdef ENABLE_SD
  int oc = override_count;
  if (oc < 0) oc = 0;
  else if (oc > STYLE_CONFIG_MAX_LOCAL_VARS) oc = STYLE_CONFIG_MAX_LOCAL_VARS;
  StyleConfigSectionState st;
  memset(&st, 0, sizeof(st));
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_STYLE_CONFIG_PATH)) {
    LOCK_SD(false);
    return 0;
  }
  static StylePaletteCacheEntry palette_cache[STYLE_PALETTE_CACHE_MAX];
  int palette_ncache = 0;
  StyleConfigScanPalettes(f, palette_cache, &palette_ncache);
  char include_stack[STYLE_INCLUDE_MAX_DEPTH][STYLE_PATH_MAX];
  int count = 0;
  int line_count = 0;
  bool in_section = false;
  while (f.Available() && count < max_layers && line_count < SD_STYLE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#' || f.Peek() == ';') { f.skipline(); line_count++; continue; }
    if (f.Peek() == '[') {
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
      if (in_section) {
        StyleConfigFlushPendingStructuredLayer(&st, layers, &count, max_layers);
        break;
      }
      if (strcmp(p, section_name) == 0) {
        in_section = true;
        memset(&st, 0, sizeof(st));
        st.preset_override_count = oc;
        st.preset_override_keys = override_keys;
        st.preset_override_vals = override_vals;
      }
      line_count++;
      continue;
    }
    if (!in_section) { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    f.readVariable(variable);
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "version")) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "layer")) {
      StyleConfigFlushPendingStructuredLayer(&st, layers, &count, max_layers);
      if (count >= max_layers) { f.skipline(); line_count++; continue; }
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
      while (ti > 0 && (temp[ti - 1] == ' ' || temp[ti - 1] == '\t' || temp[ti - 1] == '\r')) temp[--ti] = 0;
      StripIniTrailingLineEndings(temp);
      StyleConfigExpandLocalVars(layers[count], STYLE_CONFIG_LAYER_STR_LEN, temp, st.keys, st.vals,
                                 st.var_count, st.preset_override_count, st.preset_override_keys,
                                 st.preset_override_vals);
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
      if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r')) valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigApplyStructuredLayerLine(&st, sty, sl, valbuf, layers, &count, max_layers);
    } else if (!strcmp(variable, "palette")) {
      StyleConfigFlushPendingStructuredLayer(&st, layers, &count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
      while (vi > 0 && (palname[vi - 1] == ' ' || palname[vi - 1] == '\t' || palname[vi - 1] == '\r')) palname[--vi] = 0;
      StripIniTrailingLineEndings(palname);
      const StylePaletteCacheEntry* pal =
          StyleConfigFindPalette(palette_cache, palette_ncache, palname);
      StyleConfigMergePaletteMissing(st.keys, st.vals, &st.var_count, pal);
    } else if (!strcmp(variable, "include")) {
      StyleConfigFlushPendingStructuredLayer(&st, layers, &count, max_layers);
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
      while (pi > 0 && (pathbuf[pi - 1] == ' ' || pathbuf[pi - 1] == '\t' || pathbuf[pi - 1] == '\r')) pathbuf[--pi] = 0;
      StripIniTrailingLineEndings(pathbuf);
      f.skipline();
      line_count++;
      char norm[STYLE_PATH_MAX];
      if (!StyleConfigNormalizeIncludePath(pathbuf, norm, sizeof(norm))) continue;
      if (StyleConfigPathInStack(norm, include_stack, 0)) continue;
      strncpy(include_stack[0], norm, STYLE_PATH_MAX - 1);
      include_stack[0][STYLE_PATH_MAX - 1] = '\0';
      FileReader inc;
      if (!inc.Open(norm)) continue;
      StyleConfigProcessStyleFragment(inc, &st, layers, &count, max_layers, palette_cache, palette_ncache,
                                      &line_count, 1, include_stack);
      inc.Close();
      continue;
    } else {
      f.skipwhite();
      if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
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
      while (vi > 0 && (valbuf[vi - 1] == ' ' || valbuf[vi - 1] == '\t' || valbuf[vi - 1] == '\r')) valbuf[--vi] = 0;
      StripIniTrailingLineEndings(valbuf);
      StyleConfigSetOrOverrideVar(st.keys, st.vals, &st.var_count, variable, valbuf);
    }
    f.skipline();
    line_count++;
  }
  if (in_section) StyleConfigFlushPendingStructuredLayer(&st, layers, &count, max_layers);
  f.Close();
  LOCK_SD(false);
  return count;
#else
  (void)section_name;
  (void)layers;
  (void)max_layers;
  (void)override_count;
  (void)override_keys;
  (void)override_vals;
  return 0;
#endif
}

#endif  // COMMON_STYLE_CONFIG_FILE_H
