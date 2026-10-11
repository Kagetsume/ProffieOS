#ifndef COMMON_FONT_SEARCH_PATH_H
#define COMMON_FONT_SEARCH_PATH_H

// Leading directories in current_directory that may be absent on SD (font_overlay=).
extern int optional_font_search_dirs_at_start;

inline void SetOptionalFontSearchDirsAtStart(int n) {
  optional_font_search_dirs_at_start = n < 0 ? 0 : n;
}

inline int CountSemicolonSeparatedPaths(const char* path) {
  if (!path || !*path) return 0;
  int n = 1;
  for (const char* p = path; *p; p++)
    if (*p == ';') n++;
  return n;
}

#endif
