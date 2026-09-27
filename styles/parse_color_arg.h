#ifndef STYLES_PARSE_COLOR_ARG_H
#define STYLES_PARSE_COLOR_ARG_H

#include "../common/common.h"
#include "../common/color.h"
#include <string.h>

// Resolve a color name (e.g. "cyan") to a 16-bit Color16.
// Returns true on match. Case-insensitive so presets.ini can use any casing.
inline bool ParseColorName(const char* name, Color16* out) {
  struct NamedColor { const char* n; uint8_t r, g, b; };
  static const NamedColor table[] = {
    {"red",       255,   0,   0},
    {"green",       0, 255,   0},
    {"blue",        0,   0, 255},
    {"cyan",        0, 255, 255},
    {"yellow",    255, 255,   0},
    {"magenta",   255,   0, 255},
    {"white",     255, 255, 255},
    {"black",       0,   0,   0},
    {"orange",    255, 128,   0},
    {"darkorange",255,  68,   0},
    {"deeppink",  255,   0,  75},
    {"deepskyblue", 0, 135, 255},
    {"dodgerblue",  2,  72, 255},
    {"hotpink",   255,  36, 118},
    {"pink",      255, 136, 154},
    {"tomato",    255,  31,  15},
    {"coral",     255,  55,  19},
    {"aqua",        0, 255, 255},
    {"lime",        0, 255,   0},
    {"fuchsia",   255,   0, 255},
    {"springgreen", 0, 255,  55},
    {"steelblue",  14,  57, 118},
    {"silver",    100, 100, 150},
    {"greenyellow",108, 255,   6},
    {"chartreuse", 55, 255,   0},
  };
  for (size_t i = 0; i < NELEM(table); i++) {
    const char* a = name;
    const char* b = table[i].n;
    while (*a && *a != ' ' && *a != '\t' && *b) {
      char ca = (*a >= 'A' && *a <= 'Z') ? (*a + 32) : *a;
      char cb = (*b >= 'A' && *b <= 'Z') ? (*b + 32) : *b;
      if (ca != cb) break;
      a++; b++;
    }
    if (*b == 0 && (*a == 0 || *a == ' ' || *a == '\t')) {
      *out = Color16(table[i].r * 257, table[i].g * 257, table[i].b * 257);
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
