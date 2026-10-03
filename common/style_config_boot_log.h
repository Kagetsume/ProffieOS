#ifndef COMMON_STYLE_CONFIG_BOOT_LOG_H
#define COMMON_STYLE_CONFIG_BOOT_LOG_H

// Style loader lines during setup may run before the USB host opens CDC; buffer and replay on connect.

#include "stdout.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

#ifndef STYLE_CONFIG_BOOT_LOG_MAX
#define STYLE_CONFIG_BOOT_LOG_MAX 1024
#endif

inline char* StyleConfigBootLogBuffer() {
  static char buf[STYLE_CONFIG_BOOT_LOG_MAX];
  return buf;
}

inline size_t* StyleConfigBootLogLength() {
  static size_t len = 0;
  return &len;
}

inline void StyleConfigBootLogAppend(const char* line) {
  if (!line || !line[0]) return;
  char* buf = StyleConfigBootLogBuffer();
  size_t* len = StyleConfigBootLogLength();
  size_t n = strlen(line);
  if (n >= STYLE_CONFIG_BOOT_LOG_MAX) n = STYLE_CONFIG_BOOT_LOG_MAX - 1;
  if (*len + n >= STYLE_CONFIG_BOOT_LOG_MAX) return;
  memcpy(buf + *len, line, n);
  *len += n;
  if (*len == 0 || buf[*len - 1] != '\n') {
    if (*len + 1 < STYLE_CONFIG_BOOT_LOG_MAX) buf[(*len)++] = '\n';
  }
  buf[*len] = 0;
}

inline void StyleConfigStatusLine(const char* line) {
  if (!line || !line[0]) return;
  PVLOG_STATUS << line;
  if (line[strlen(line) - 1] != '\n') PVLOG_STATUS << "\n";
  StyleConfigBootLogAppend(line);
}

inline void StyleConfigStatusPrintf(const char* fmt, ...) {
  char line[192];
  va_list ap;
  va_start(ap, fmt);
  vsnprintf(line, sizeof(line), fmt, ap);
  va_end(ap);
  StyleConfigStatusLine(line);
}

// Print any boot-log bytes not yet shown (safe to call after FindBlade and on USB connect).
inline void StyleConfigBootLogReplay() {
  static size_t replayed_len = 0;
  size_t len = *StyleConfigBootLogLength();
  if (len <= replayed_len) return;
  STDOUT.print(StyleConfigBootLogBuffer() + replayed_len);
  replayed_len = len;
}

#endif  // COMMON_STYLE_CONFIG_BOOT_LOG_H
