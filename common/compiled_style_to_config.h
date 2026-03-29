#ifndef COMMON_COMPILED_STYLE_TO_CONFIG_H
#define COMMON_COMPILED_STYLE_TO_CONFIG_H

// Converts a compiled style definition (comment metadata) into the blade style
// config format used by config/blade_styles.ini: [section_name] and layer = ...
// Uses heuristics from the comment (effects, phases); exact parameters from
// the C++ template are not available, so default layer strings are used.
//
// Hardened: null/invalid pointers and buffers are checked; snprintf size is
// always positive and output length is capped so malformed input does not
// overwrite or crash.

#include "compiled_style_metadata.h"
#include <ctype.h>
#include <stdio.h>
#include <string.h>

#define COMPILED_STYLE_CONFIG_OUT_MAX 1024   // max length of generated INI block
#define COMPILED_STYLE_SECTION_NAME_MAX 64

// Derive a section name from the comment title (e.g. "CustomBlade" from
// "copyright Fett263 CustomBlade (Primary Blade) OS7 Style").
// section_out: output buffer; section_max: size. Only alnum and _ are kept.
inline void CompiledStyleSectionNameFromTitle(const char* title,
                                               char* section_out,
                                               int section_max) {
  if (!title || !section_out || section_max <= 0) {
    if (section_out && section_max > 0) section_out[0] = '\0';
    return;
  }
  section_out[0] = '\0';
  const char* p = title;
  while (*p == ' ' || *p == '\t') p++;
  if (strlen(p) >= 10 && strncmp(p, "copyright ", 10) == 0) p += 10;
  while (*p == ' ' || *p == '\t') p++;
  // Skip first word (often author/site)
  while (*p && *p != ' ' && *p != '\t' && *p != '(') p++;
  while (*p == ' ' || *p == '\t') p++;
  const char* start = p;
  while (*p && *p != ' ' && *p != '\t' && *p != '(' && *p != ')') p++;
  int len = (int)(p - start);
  if (len <= 0) {
    strncpy(section_out, "converted", section_max - 1);
    section_out[section_max - 1] = '\0';
    return;
  }
  if (len >= section_max) len = section_max - 1;
  int j = 0;
  for (int i = 0; i < len && j < section_max - 1; i++) {
    char c = start[i];
    if (isalnum((unsigned char)c) || c == '_')
      section_out[j++] = (char)tolower((unsigned char)c);
  }
  section_out[j] = '\0';
  if (j == 0) {
    strncpy(section_out, "converted", section_max - 1);
    section_out[section_max - 1] = '\0';
  }
}

static inline int toLowerCompiled(int c) {
  return (c >= 'A' && c <= 'Z') ? c + 32 : c;
}

// Check if a string contains a word (case-insensitive substring).
// text must be null-terminated; word must be null-terminated.
inline bool CompiledStyleTextContains(const char* text, const char* word) {
  if (!text || !word) return false;
  size_t wlen = strlen(word);
  if (wlen == 0) return false;
  const char* p = text;
  while (*p) {
    bool match = true;
    for (size_t i = 0; i < wlen; i++) {
      if (!p[i] || toLowerCompiled((unsigned char)p[i]) != toLowerCompiled((unsigned char)word[i])) {
        match = false;
        break;
      }
    }
    if (match) return true;
    p++;
  }
  return false;
}

// Convert compiled style metadata to config/blade_styles.ini format.
// meta: from ParseCompiledStyleDefinition (or ParseCompiledStyleMetadata).
// out_buf: buffer for the INI block (e.g. "[section]\nlayer = ...\n").
// out_max: size of out_buf.
// Returns length written (excluding null), or 0 on error.
inline int ConvertCompiledStyleToConfigBladeStyle(const CompiledStyleMetadata* meta,
                                                   char* out_buf,
                                                   int out_max) {
  if (!meta || !out_buf || out_max <= 0 || !meta->has_comment) return 0;

  char section[COMPILED_STYLE_SECTION_NAME_MAX];
  CompiledStyleSectionNameFromTitle(meta->title, section, COMPILED_STYLE_SECTION_NAME_MAX);
  if (!section[0]) return 0;

  // Build combined text for heuristics (title + effects)
  char combined[COMPILED_STYLE_TITLE_LEN + COMPILED_STYLE_EFFECTS_LEN + 2];
  int cpos = 0;
  if (meta->title[0]) {
    int tlen = (int)strlen(meta->title);
    if (tlen > COMPILED_STYLE_TITLE_LEN - 1) tlen = COMPILED_STYLE_TITLE_LEN - 1;
    memcpy(combined, meta->title, tlen);
    cpos = tlen;
  }
  if (meta->effects_section[0] && cpos < (int)(sizeof(combined) - 2)) {
    if (cpos > 0) combined[cpos++] = ' ';
    int elen = (int)strlen(meta->effects_section);
    int max_extra = (int)(sizeof(combined) - cpos - 1);
    if (max_extra > 0) {
      if (elen > max_extra) elen = max_extra;
      memcpy(combined + cpos, meta->effects_section, (size_t)elen);
      cpos += elen;
    }
  }
  if (cpos >= (int)sizeof(combined)) cpos = (int)sizeof(combined) - 1;
  combined[cpos] = '\0';

  // Choose base layer from phases/title/effects
  const char* base_layer = "rainbow 300 800";
  if (CompiledStyleTextContains(combined, "Unstable") || CompiledStyleTextContains(combined, "Rage")) {
    base_layer = "unstable red orange yellow 100 200";
  } else if (CompiledStyleTextContains(combined, "Fire")) {
    base_layer = "fire red yellow";
  } else if (CompiledStyleTextContains(combined, "Cycle")) {
    base_layer = "cycle blue blue cyan red cyan";
  } else if (CompiledStyleTextContains(combined, "Standard") || (CompiledStyleTextContains(combined, "Clash") && !CompiledStyleTextContains(combined, "Rainbow"))) {
    base_layer = "standard cyan white 300 800";
  }
  // else rainbow 300 800

  bool add_blast = CompiledStyleTextContains(combined, "Blast");
  bool add_strobe = CompiledStyleTextContains(combined, "Strobe") || CompiledStyleTextContains(combined, "Strobing");

  int n = 0;
  out_buf[0] = '\0';

  int space = out_max - n;
  if (space <= 0) return 0;
  int w = snprintf(out_buf + n, (size_t)space, "# Converted from compiled style\n[%s]\n", section);
  if (w < 0) return 0;
  n += (w >= space ? space - 1 : w);
  if (n >= out_max) { out_buf[out_max - 1] = '\0'; return out_max - 1; }

  space = out_max - n;
  if (space <= 0) { out_buf[out_max - 1] = '\0'; return out_max - 1; }
  w = snprintf(out_buf + n, (size_t)space, "layer = %s\n", base_layer);
  if (w < 0) return n;
  n += (w >= space ? space - 1 : w);
  if (n >= out_max) { out_buf[out_max - 1] = '\0'; return out_max - 1; }

  if (add_blast) {
    space = out_max - n;
    if (space <= 0) { out_buf[out_max - 1] = '\0'; return out_max - 1; }
    w = snprintf(out_buf + n, (size_t)space, "layer = blast white 200 100 400\n");
    if (w > 0) n += (w >= space ? space - 1 : w);
    if (n >= out_max) { out_buf[out_max - 1] = '\0'; return out_max - 1; }
  }
  if (add_strobe) {
    space = out_max - n;
    if (space <= 0) { out_buf[out_max - 1] = '\0'; return out_max - 1; }
    w = snprintf(out_buf + n, (size_t)space, "layer = strobe black white 15 1 300 800\n");
    if (w > 0) n += (w >= space ? space - 1 : w);
  }
  if (n > out_max - 1) n = out_max - 1;
  out_buf[n] = '\0';
  return n;
}

// One-shot: full definition string -> config INI block.
// full_definition: comment + optional C++ template.
// out_buf, out_max: as in ConvertCompiledStyleToConfigBladeStyle.
// Returns length written, or 0 if no comment found.
inline int CompiledStyleDefinitionToConfigBladeStyle(const char* full_definition,
                                                     char* out_buf,
                                                     int out_max) {
  if (!full_definition || !out_buf || out_max <= 0) return 0;
  CompiledStyleMetadata meta;
  ParseCompiledStyleDefinition(full_definition, &meta);
  return ConvertCompiledStyleToConfigBladeStyle(&meta, out_buf, out_max);
}

#endif  // COMMON_COMPILED_STYLE_TO_CONFIG_H
