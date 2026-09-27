#ifndef COMMON_OPACITY_SCALE_H
#define COMMON_OPACITY_SCALE_H

#include <stdlib.h>
#include <string.h>

// True if token is a numeric opacity scale (0, 55%, 18000, …); false for empty or non-numeric.
inline bool OpacityScaleTokenParses(const char* token) {
  if (!token) return false;
  while (*token == ' ' || *token == '\t') token++;
  if (!*token) return false;

  const char* end = token;
  while (*end && *end != ' ' && *end != '\t') end++;
  size_t len = (size_t)(end - token);
  if (len > 0 && token[len - 1] == '%') len--;
  while (len > 0 && (token[len - 1] == ' ' || token[len - 1] == '\t')) len--;

  char buf[32];
  if (len >= sizeof(buf)) len = sizeof(buf) - 1;
  memcpy(buf, token, len);
  buf[len] = '\0';

  char* parse_end = nullptr;
  strtol(buf, &parse_end, 10);
  return parse_end != buf;
}

// Parse a token as ProffieOS fixed-point opacity/brightness (0–32768).
// - Trailing '%' → percent 0–100, mapped with round(n * 32768 / 100), clamped 0–32768.
// - Else integer n: n > 100 → raw 32768 scale (clamp 0–32768); n <= 100 → percent (100 = full).
inline int ParseOpacityScaleToken(const char* token) {
  if (!OpacityScaleTokenParses(token)) return 0;

  while (*token == ' ' || *token == '\t') token++;

  bool has_percent = false;
  const char* end = token;
  while (*end && *end != ' ' && *end != '\t') end++;
  size_t len = (size_t)(end - token);
  if (len > 0 && token[len - 1] == '%') {
    has_percent = true;
    len--;
  }
  while (len > 0 && (token[len - 1] == ' ' || token[len - 1] == '\t')) len--;

  char buf[32];
  if (len >= sizeof(buf)) len = sizeof(buf) - 1;
  memcpy(buf, token, len);
  buf[len] = '\0';

  char* parse_end = nullptr;
  long n = strtol(buf, &parse_end, 10);
  if (parse_end == buf) return 0;

  if (has_percent) {
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return (int)((n * 32768LL + 50) / 100);
  }
  if (n > 100) {
    if (n < 0) n = 0;
    if (n > 32768) n = 32768;
    return (int)n;
  }
  if (n < 0) n = 0;
  return (int)((n * 32768LL + 50) / 100);
}

#endif
