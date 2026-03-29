#ifndef COMMON_COMPILED_STYLE_METADATA_H
#define COMMON_COMPILED_STYLE_METADATA_H

// Parser for the comment block of a compiled blade style definition.
// Compiled styles look like:
//   /* copyright ... Style name ... OS7.15 v3.215p
//    Single Style
//    Multi Phase ...
//    --Effects Included--
//    Blast Effect: ... [Color: BlastColorArg]
//    ...
//    */
//   StylePtr<Layers<...>>(),
//
// This header parses only the comment (/* ... */). The C++ template body
// (StylePtr<Layers<...>>()) cannot be executed at runtime—it is compiled code.
//
// Hardened: null/invalid pointers and buffers are checked; lengths are bounded
// so malformed or truncated input does not overread or overwrite; no strstr
// on non-null-terminated substrings.

#include <string.h>

#define COMPILED_STYLE_TITLE_LEN 128
#define COMPILED_STYLE_VERSION_LEN 48
#define COMPILED_STYLE_EFFECTS_LEN 512
#define COMPILED_STYLE_COMMENT_MAX 1024

struct CompiledStyleMetadata {
  char title[COMPILED_STYLE_TITLE_LEN];
  char version[COMPILED_STYLE_VERSION_LEN];
  char effects_section[COMPILED_STYLE_EFFECTS_LEN];  // --Effects Included-- block
  bool single_style;   // true if "Single Style" found
  bool multi_phase;   // true if "Multi Phase" found
  bool has_comment;   // true if /* */ was found and comment was extracted
};

// Extract the comment block from a compiled style definition string.
// full_definition: string that may start with /* and contain */, then optional C++ code.
// comment_out: output buffer for the comment text (between /* and */, excluding delimiters).
// comment_max: size of comment_out.
// Returns length of extracted comment, or 0 if no /* */ found or buffer too small.
inline int GetCompiledStyleComment(const char* full_definition,
                                   char* comment_out,
                                   int comment_max) {
  if (!full_definition || !comment_out || comment_max <= 0) return 0;
  const char* open = strstr(full_definition, "/*");
  if (!open) return 0;
  const char* close = strstr(open + 2, "*/");
  if (!close) return 0;
  int len = (int)(close - (open + 2));
  if (len < 0) return 0;
  if (len >= comment_max) len = comment_max - 1;
  if (len > 0)
    memcpy(comment_out, open + 2, (size_t)len);
  comment_out[len] = '\0';
  return len;
}

// Parse a comment block (from GetCompiledStyleComment) into structured metadata.
// comment_text: null-terminated comment string (no /* */).
// out: filled with title, version, single_style, multi_phase, effects_section.
// out->title: trimmed first non-empty line.
// out->version: first token that looks like "OS7..." or "v3..." (e.g. "OS7.15" or "v3.215p").
// out->single_style: true if any line contains "Single Style".
// out->multi_phase: true if any line contains "Multi Phase".
// Bounded substring match (avoids strstr on non-null-terminated line).
static inline bool CompiledStyleLineContains(const char* line, int line_len,
                                              const char* sub, int sub_len) {
  if (!line || !sub || line_len < sub_len || sub_len <= 0) return false;
  for (int i = 0; i <= line_len - sub_len; i++) {
    if (memcmp(line + i, sub, (size_t)sub_len) == 0) return true;
  }
  return false;
}

// out->effects_section: lines from "--Effects Included--" (or "Effects Included") to end of comment.
// Bounded: no strstr on non-null-terminated line; all copies and indices capped.
inline void ParseCompiledStyleMetadata(const char* comment_text,
                                       CompiledStyleMetadata* out) {
  if (!comment_text || !out) return;
  memset(out, 0, sizeof(*out));

  const char* p = comment_text;
  int title_len = 0;
  bool title_done = false;
  bool in_effects = false;
  int effects_len = 0;
  const int effects_max = (int)(COMPILED_STYLE_EFFECTS_LEN - 1);

  while (*p) {
    // Skip leading whitespace (including newlines)
    while (*p == ' ' || *p == '\t' || *p == '\r' || *p == '\n') p++;
    if (!*p) break;

    const char* line_start = p;
    while (*p && *p != '\n' && *p != '\r') p++;

    int line_len = (int)(p - line_start);
    if (line_len <= 0 || line_len > 4096) continue;  // cap line length to avoid runaway

    // Trim trailing space from line
    while (line_len > 0 && (line_start[line_len - 1] == ' ' || line_start[line_len - 1] == '\t'))
      line_len--;

    if (line_len <= 0) continue;

    // Check for section markers (bounded)
    if (line_len >= 2 && line_start[0] == '-' && line_start[1] == '-') {
      if (CompiledStyleLineContains(line_start, line_len, "Effects Included", 16)) {
        in_effects = true;
        effects_len = 0;
      }
      continue;
    }
    if (line_len >= 16 && (line_start[0] != '-' || line_start[1] != '-') &&
        CompiledStyleLineContains(line_start, line_len, "Effects Included", 16)) {
      in_effects = true;
      effects_len = 0;
      continue;
    }

    if (in_effects) {
      if (effects_len < effects_max) {
        int copy = line_len;
        if (copy > effects_max - effects_len - 2) copy = effects_max - effects_len - 2;
        if (copy > 0) {
          if (effects_len > 0 && effects_len < effects_max) {
            out->effects_section[effects_len++] = '\n';
          }
          if (effects_len + copy <= effects_max) {
            memcpy(out->effects_section + effects_len, line_start, (size_t)copy);
            effects_len += copy;
          }
        }
      }
      continue;
    }

    // Single / Multi phase (bounded)
    if (line_len >= 12 && CompiledStyleLineContains(line_start, line_len, "Single Style", 12))
      out->single_style = true;
    if (line_len >= 11 && CompiledStyleLineContains(line_start, line_len, "Multi Phase", 11))
      out->multi_phase = true;

    // Version: look for OS7 or v3. pattern (all indices bounded)
    if (!out->version[0] && line_len >= 3) {
      const char* line_end = line_start + line_len;
      const char* q = line_start;
      while (q + 3 <= line_end) {
        if ((q[0] == 'O' && q[1] == 'S' && q[2] >= '0' && q[2] <= '9') ||
            (q[0] == 'v' && q[1] >= '0' && q[1] <= '9')) {
          int ver_len = 0;
          while (q + ver_len < line_end && ver_len < COMPILED_STYLE_VERSION_LEN - 1) {
            char c = q[ver_len];
            if (c == ' ' || c == '\t') break;
            if (c != '.' && c != 'v' && (c < '0' || c > '9') &&
                (c < 'a' || c > 'z') && (c < 'A' || c > 'Z')) break;
            ver_len++;
          }
          if (ver_len > 0) {
            int copy_ver = ver_len;
            if (copy_ver >= COMPILED_STYLE_VERSION_LEN) copy_ver = COMPILED_STYLE_VERSION_LEN - 1;
            memcpy(out->version, q, (size_t)copy_ver);
            out->version[copy_ver] = '\0';
          }
          break;
        }
        q++;
      }
    }

    // Title: first non-empty line (bounded)
    if (!title_done && line_len > 0) {
      int copy = line_len;
      if (copy >= COMPILED_STYLE_TITLE_LEN) copy = COMPILED_STYLE_TITLE_LEN - 1;
      memcpy(out->title, line_start, (size_t)copy);
      out->title[copy] = '\0';
      title_len = copy;
      title_done = true;
    }
  }

  if (effects_len >= 0 && effects_len < COMPILED_STYLE_EFFECTS_LEN)
    out->effects_section[effects_len] = '\0';
  out->has_comment = true;

  // Trim leading space from title (bounded)
  if (out->title[0]) {
    int i = 0;
    while (out->title[i] == ' ' || out->title[i] == '\t') {
      i++;
      if (i >= COMPILED_STYLE_TITLE_LEN - 1) break;
    }
    if (i > 0 && i < COMPILED_STYLE_TITLE_LEN) {
      size_t rest = strlen(out->title + i);
      if (rest + 1 <= (size_t)(COMPILED_STYLE_TITLE_LEN - i))
        memmove(out->title, out->title + i, rest + 1);
    }
  }
}

// One-shot: extract comment from full definition and parse into metadata.
// full_definition: string containing /* ... */ and optionally C++ code after.
// out: filled with metadata. out->has_comment is true only if /* */ was found.
inline void ParseCompiledStyleDefinition(const char* full_definition,
                                         CompiledStyleMetadata* out) {
  if (!full_definition || !out) return;
  memset(out, 0, sizeof(*out));
  char comment_buf[COMPILED_STYLE_COMMENT_MAX];
  int n = GetCompiledStyleComment(full_definition, comment_buf, COMPILED_STYLE_COMMENT_MAX);
  if (n <= 0) return;
  ParseCompiledStyleMetadata(comment_buf, out);
}

#endif  // COMMON_COMPILED_STYLE_METADATA_H
