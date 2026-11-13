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

// 8-bit alpha (0–255) → layer-composite alpha (0–32768). 255 is fully opaque.
inline uint16_t ConfigColorAlpha8To15(int a) {
  if (a <= 0) return 0;
  if (a >= 255) return 32768;
  return (uint16_t)((a * 32768 + 127) / 255);
}

// Colors parsed while a config layer style is being built. Alpha is not part of
// Color16, so a translucent color is nudged by one 16-bit count (same 8-bit
// channel) and remembered here. The layer wrapper multiplies that alpha back
// on when the painted pixel is still this color. Opaque colors are not stored.
struct ConfigColorAlphaFrame {
  static const int kMax = 12;
  Color16 rgb[kMax];
  uint16_t alpha[kMax];
  int n;
};

inline ConfigColorAlphaFrame*& ConfigColorAlphaFrameSlot() {
  static ConfigColorAlphaFrame* frame = nullptr;
  return frame;
}

inline int& ConfigColorAlphaSuspendCount() {
  static int n = 0;
  return n;
}

// Pause alpha capture (transition spark colors are stored as Color16 only).
class ConfigColorAlphaNotePause {
 public:
  ConfigColorAlphaNotePause() { ConfigColorAlphaSuspendCount()++; }
  ~ConfigColorAlphaNotePause() { ConfigColorAlphaSuspendCount()--; }
};

inline bool ConfigColorSame(Color16 a, Color16 b) {
  return a.r == b.r && a.g == b.g && a.b == b.b;
}

// Step one channel by 1 without crossing an 8-bit bin (>> 8).
inline bool ConfigColorNudgeChannel(uint16_t* ch) {
  uint16_t v = *ch;
  if (v > 0 && (uint16_t)(v - 1) >> 8 == v >> 8) {
    *ch = (uint16_t)(v - 1);
    return true;
  }
  if (v < 65535 && (uint16_t)(v + 1) >> 8 == v >> 8) {
    *ch = (uint16_t)(v + 1);
    return true;
  }
  return false;
}

inline Color16 ConfigColorWatermark(Color16 rgb, const ConfigColorAlphaFrame* frame) {
  Color16 w = rgb;
  for (int step = 0; step < 24; step++) {
    uint16_t* ch = &w.b;
    if (step % 3 == 1) ch = &w.g;
    else if (step % 3 == 2) ch = &w.r;
    if (!ConfigColorNudgeChannel(ch)) continue;
    if (ConfigColorSame(w, rgb)) continue;
    bool taken = false;
    if (frame) {
      for (int i = 0; i < frame->n; i++) {
        if (ConfigColorSame(frame->rgb[i], w)) taken = true;
      }
    }
    if (!taken) return w;
  }
  return rgb;
}

// Remember a translucent color for the style under construction. Returns the
// RGB to store (nudged when a frame is active). Opaque and unscoped parses
// return rgb unchanged.
inline Color16 ConfigColorPublish(Color16 rgb, uint16_t alpha15) {
  ConfigColorAlphaFrame* frame = ConfigColorAlphaFrameSlot();
  if (!frame || ConfigColorAlphaSuspendCount() || alpha15 >= 32768) return rgb;
  if (frame->n >= ConfigColorAlphaFrame::kMax) return rgb;
  Color16 w = ConfigColorWatermark(rgb, frame);
  if (ConfigColorSame(w, rgb)) return rgb;
  frame->rgb[frame->n] = w;
  frame->alpha[frame->n] = alpha15;
  frame->n++;
  return w;
}

inline void ConfigColorAlphaApply(RGBA_um* c, const Color16* rgb, const uint16_t* alpha, int n) {
  if (!c || !rgb || !alpha || !c->alpha || n <= 0) return;
  for (int i = 0; i < n; i++) {
    if (!ConfigColorSame(c->c, rgb[i])) continue;
    c->alpha = (uint16_t)(((uint32_t)c->alpha * alpha[i]) >> 15);
    return;
  }
}

inline void ConfigColorAlphaApply(RGBA_um* c, const ConfigColorAlphaFrame& frame) {
  ConfigColorAlphaApply(c, frame.rgb, frame.alpha, frame.n);
}

// Parse #RRGGBB, #RRGGBBAA, #rrggbb, or CSS #RGB into Color16 (8-bit ×257).
// alpha15, when set, is 0–32768 (32768 = opaque). #RGB and #RRGGBB are opaque.
inline bool ParseHexColorArg(const char* arg, Color16* out, uint16_t* alpha15 = nullptr) {
  if (!arg || !out) return false;
  if (*arg == '#') arg++;
  else return false;
  const char* start = arg;
  while (HexNibble(*arg) >= 0) arg++;
  int len = (int)(arg - start);
  if (len != 3 && len != 6 && len != 8) return false;
  if (*arg != 0 && *arg != ' ' && *arg != '\t') return false;
  int r, g, b, a = 255;
  if (len == 6 || len == 8) {
    r = (HexNibble(start[0]) << 4) | HexNibble(start[1]);
    g = (HexNibble(start[2]) << 4) | HexNibble(start[3]);
    b = (HexNibble(start[4]) << 4) | HexNibble(start[5]);
    if (len == 8) a = (HexNibble(start[6]) << 4) | HexNibble(start[7]);
  } else {
    r = (HexNibble(start[0]) << 4) | HexNibble(start[0]);
    g = (HexNibble(start[1]) << 4) | HexNibble(start[1]);
    b = (HexNibble(start[2]) << 4) | HexNibble(start[2]);
  }
  *out = Color16((uint16_t)(r * 257), (uint16_t)(g * 257), (uint16_t)(b * 257));
  if (alpha15) *alpha15 = ConfigColorAlpha8To15(a);
  return true;
}

inline bool ConfigStartsWithIgnoreCase(const char* s, const char* word) {
  if (!s || !word) return false;
  while (*word) {
    char c = *s;
    if (c >= 'A' && c <= 'Z') c = (char)(c + 32);
    if (c != *word) return false;
    s++;
    word++;
  }
  return true;
}

// rgba(r, g, b, a) with each channel 0–255. Trailing layer args are allowed.
// rgb(r, g, b) is not accepted here.
inline bool ParseRgbaColorArg(const char* arg, Color16* out, uint16_t* alpha15) {
  if (!arg || !out) return false;
  while (*arg == ' ' || *arg == '\t') arg++;
  if (!ConfigStartsWithIgnoreCase(arg, "rgba")) return false;
  arg += 4;
  while (*arg == ' ' || *arg == '\t') arg++;
  if (*arg != '(') return false;
  arg++;
  int ch[4];
  for (int i = 0; i < 4; i++) {
    char* end = nullptr;
    long v = strtol(arg, &end, 10);
    if (end == arg || v < 0 || v > 255) return false;
    ch[i] = (int)v;
    arg = end;
    while (*arg == ' ' || *arg == '\t') arg++;
    if (i < 3) {
      if (*arg != ',') return false;
      arg++;
    }
  }
  if (*arg != ')') return false;
  arg++;
  if (*arg != 0 && *arg != ' ' && *arg != '\t') return false;
  *out = Color16((uint16_t)(ch[0] * 257), (uint16_t)(ch[1] * 257), (uint16_t)(ch[2] * 257));
  if (alpha15) *alpha15 = ConfigColorAlpha8To15(ch[3]);
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

// Parse a COLOR style argument (name, #hex, rgba(), or r,g,b) into Color16.
// Comma triplets with all channels <= 255 are 8-bit sRGB (×257), matching ParseColorName.
// #RRGGBB, #RGB, r,g,b, and names are fully opaque. #RRGGBBAA and rgba(r,g,b,a)
// carry alpha while a config layer is parsing (see ConfigColorPublish).
inline Color16 ParseColorArg(const char* arg) {
  if (!arg) return Color16();
  Color16 named;
  if (ParseColorName(arg, &named)) return named;
  Color16 hexed;
  uint16_t alpha = 32768;
  if (ParseHexColorArg(arg, &hexed, &alpha)) return ConfigColorPublish(hexed, alpha);
  if (ParseRgbaColorArg(arg, &hexed, &alpha)) return ConfigColorPublish(hexed, alpha);
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
