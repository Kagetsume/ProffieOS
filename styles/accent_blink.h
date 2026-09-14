#ifndef STYLES_ACCENT_BLINK_H
#define STYLES_ACCENT_BLINK_H

// GPIO accent: square-wave blink while saber is on, off when retracted.
// Args: color on_ms off_ms (default white 500 500)

#include "blade_style.h"
#include "rgb_arg.h"
#include "../common/arg_parser.h"
#include "../common/math.h"
#include <string.h>

class AccentBlink : public BladeStyle {
public:
  void SetColor(Color16 c) { color_ = c; }
  void SetTiming(uint32_t on_ms, uint32_t off_ms) {
    on_ms_ = on_ms < 1 ? 1 : on_ms;
    off_ms_ = off_ms < 1 ? 1 : off_ms;
  }

  void run(BladeBase* blade) override {
    if (!blade || !blade->is_on()) {
      if (blade) {
        blade->clear();
        blade->allow_disable();
      }
      return;
    }
    int num_leds = blade->num_leds();
    if (num_leds <= 0) {
      blade->allow_disable();
      return;
    }
    uint32_t cycle = on_ms_ + off_ms_;
    Color16 c = (millis() % cycle < on_ms_) ? color_ : Color16();
    for (int i = 0; i < num_leds; i++) {
      blade->set(i, c);
      if (!(i & 0xf)) Looper::DoHFLoop();
    }
    blade->allow_disable();
  }

  bool IsHandled(HandledFeature) override { return false; }

private:
  Color16 color_ = Color16(65535, 65535, 65535);
  uint32_t on_ms_ = 500;
  uint32_t off_ms_ = 500;
};

static Color16 ParseAccentColorArg(int argnum, Color16 default_color) {
  char default_value[32];
  itoa(default_color.r >> 8, default_value, 10);
  strcat(default_value, ",");
  itoa(default_color.g >> 8, default_value + strlen(default_value), 10);
  strcat(default_value, ",");
  itoa(default_color.b >> 8, default_value + strlen(default_value), 10);
  const char* arg = CurrentArgParser->GetArg(argnum, "COLOR", default_value);
  if (!arg) return default_color;
  Color16 named;
  if (ParseColorName(arg, &named)) return named;
  char* tmp;
  int r = strtol(arg, &tmp, 0);
  int g = strtol(tmp + 1, &tmp, 0);
  int b = strtol(tmp + 1, NULL, 0);
  return Color16(r, g, b);
}

class AccentBlinkFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    AccentBlink* s = new AccentBlink();
    s->SetColor(ParseAccentColorArg(1, Color16(65535, 65535, 65535)));
    const char* on_arg = CurrentArgParser->GetArg(2, "ON_MS", "500");
    const char* off_arg = CurrentArgParser->GetArg(3, "OFF_MS", "500");
    uint32_t on_ms = on_arg ? (uint32_t)clampi32(strtol(on_arg, nullptr, 10), 1, 65535) : 500;
    uint32_t off_ms = off_arg ? (uint32_t)clampi32(strtol(off_arg, nullptr, 10), 1, 65535) : 500;
    s->SetTiming(on_ms, off_ms);
    CurrentArgParser->Shift(3);
    return s;
  }
};

static AccentBlinkFactory accent_blink_factory;

#endif  // STYLES_ACCENT_BLINK_H
