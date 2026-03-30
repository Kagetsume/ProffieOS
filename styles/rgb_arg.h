#ifndef STYLES_RGB_ARG_H
#define STYLES_RGB_ARG_H

#include "../common/arg_parser.h"

// Usage: RgbArg<ARG, DEFAULT_COLOR>
// ARG: a number
// DEFAULT_COLOR: Must be Rgb<> or Rgb16<>
// Return value: COLOR
// This is used to create templates that can be configured dynamically.
// These templates can be assigned to presets from WebUSB or bluetooth.
// See style_parser.h for more details.

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

// Break out template-invariant functionality to save memory.
class RgbArgBase {
public:
  LayerRunResult run(BladeBase* base) {
    if (color_.r == 0 && color_.g == 0 && color_.b == 0)
      return LayerRunResult::OPAQUE_BLACK_UNTIL_IGNITION;
    return LayerRunResult::UNKNOWN;
  }
  SimpleColor getColor(int led) {
    return SimpleColor(color_);
  }
protected:
  void init(int argnum) {
    char default_value[32];
    itoa(color_.r, default_value, 10);
    strcat(default_value, ",");
    itoa(color_.g, default_value + strlen(default_value), 10);
    strcat(default_value, ",");
    itoa(color_.b, default_value + strlen(default_value), 10);
    
    const char* arg = CurrentArgParser->GetArg(argnum, "COLOR", default_value);
    if (arg) {
      Color16 named;
      if (ParseColorName(arg, &named)) {
        color_ = named;
      } else {
        char* tmp;
        int r = strtol(arg, &tmp, 0);
        int g = strtol(tmp+1, &tmp, 0);
        int b = strtol(tmp+1, NULL, 0);
        color_ = Color16(r, g, b);
      }
    }
  }

  Color16 color_;
};

template<int ARG, class DEFAULT_COLOR>
class RgbArg : public RgbArgBase{
public:
  RgbArg() {
    DEFAULT_COLOR default_color; // Note, no run() call for default_color!
    color_ = default_color.getColor(0).c;
    init(ARG);
  }
};

#endif
