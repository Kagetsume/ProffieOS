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

// Parse a COLOR style argument (name or r,g,b) into Color16.
// Comma triplets with all channels <= 255 are 8-bit sRGB (×257), matching ParseColorName.
inline Color16 ParseColorArg(const char* arg) {
  Color16 named;
  if (ParseColorName(arg, &named)) return named;
  char* tmp;
  int r = strtol(arg, &tmp, 0);
  int g = strtol(tmp + 1, &tmp, 0);
  int b = strtol(tmp + 1, NULL, 0);
  if (r >= 0 && g >= 0 && b >= 0 &&
      r <= 255 && g <= 255 && b <= 255) {
    return Color16(r * 257, g * 257, b * 257);
  }
  return Color16(r, g, b);
}

#endif
