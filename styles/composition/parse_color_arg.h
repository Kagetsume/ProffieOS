#ifndef STYLES_PARSE_COLOR_ARG_H
#define STYLES_PARSE_COLOR_ARG_H

#include "../../common/common.h"
#include "../../common/color.h"
#include "parse_color_arg_table.generated.h"
#include <string.h>

// Resolve a color name (e.g. "cyan") to a 16-bit Color16.
// Returns true on match. Case-insensitive so presets.ini can use any casing.
inline bool ParseColorName(const char* name, Color16* out) {
  for (size_t i = 0; i < NELEM(parse_color_name_table); i++) {
    const char* a = name;
    const char* b = parse_color_name_table[i].n;
    while (*a && *a != ' ' && *a != '\t' && *b) {
      char ca = (*a >= 'A' && *a <= 'Z') ? (*a + 32) : *a;
      char cb = (*b >= 'A' && *b <= 'Z') ? (*b + 32) : *b;
      if (ca != cb) break;
      a++; b++;
    }
    if (*b == 0 && (*a == 0 || *a == ' ' || *a == '\t')) {
      const ParseColorNameEntry& e = parse_color_name_table[i];
      *out = Color16(e.r * 257, e.g * 257, e.b * 257);
      return true;
    }
  }
  return false;
}

inline int HexNibble(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}

// Parse #RRGGBB, #rrggbb, or CSS #RGB shorthand into Color16 (8-bit ×257).
inline bool ParseHexColorArg(const char* arg, Color16* out) {
  if (!arg) return false;
  if (*arg == '#') arg++;
  else return false;
  const char* start = arg;
  while (HexNibble(*arg) >= 0) arg++;
  int len = arg - start;
  if (len != 3 && len != 6) return false;
  if (*arg != 0 && *arg != ' ' && *arg != '\t') return false;
  int r, g, b;
  if (len == 6) {
    r = (HexNibble(start[0]) << 4) | HexNibble(start[1]);
    g = (HexNibble(start[2]) << 4) | HexNibble(start[3]);
    b = (HexNibble(start[4]) << 4) | HexNibble(start[5]);
  } else {
    r = (HexNibble(start[0]) << 4) | HexNibble(start[0]);
    g = (HexNibble(start[1]) << 4) | HexNibble(start[1]);
    b = (HexNibble(start[2]) << 4) | HexNibble(start[2]);
  }
  *out = Color16(r * 257, g * 257, b * 257);
  return true;
}

// Parse r,g,b with required comma separators; tail must be empty or whitespace only.
inline bool ParseCommaColorTriplet(const char* arg, int* r, int* g, int* b) {
  if (!arg || !*arg) return false;
  char* end;
  long lr = strtol(arg, &end, 0);
  if (end == arg || *end != ',') return false;
  const char* p = end + 1;
  long lg = strtol(p, &end, 0);
  if (end == p || *end != ',') return false;
  p = end + 1;
  long lb = strtol(p, &end, 0);
  if (end == p) return false;
  while (*end == ' ' || *end == '\t') end++;
  if (*end != 0) return false;
  *r = (int)lr;
  *g = (int)lg;
  *b = (int)lb;
  return true;
}

// Parse a COLOR style argument (name, #hex, or r,g,b) into Color16.
// Comma triplets with all channels <= 255 are 8-bit sRGB (×257), matching ParseColorName.
inline Color16 ParseColorArg(const char* arg) {
  if (!arg) return Color16();
  Color16 named;
  if (ParseColorName(arg, &named)) return named;
  Color16 hexed;
  if (ParseHexColorArg(arg, &hexed)) return hexed;
  int r, g, b;
  if (ParseCommaColorTriplet(arg, &r, &g, &b)) {
    if (r >= 0 && g >= 0 && b >= 0 &&
        r <= 255 && g <= 255 && b <= 255) {
      return Color16(r * 257, g * 257, b * 257);
    }
    return Color16(r, g, b);
  }
  char* end;
  long lone = strtol(arg, &end, 0);
  if (end == arg) return Color16();
  while (*end == ' ' || *end == '\t') end++;
  if (*end != 0) return Color16();
  return Color16((uint16_t)lone, 0, 0);
}

#endif
