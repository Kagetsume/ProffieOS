#ifndef STYLES_PIXEL_SEQUENCER_H
#define STYLES_PIXEL_SEQUENCER_H

// Pixel sequencer style: drive 1 to N pixels by a configurable sequence.
// Config = one argument: steps separated by | (pipe). Each step: pixel,r,g,b,brightness,ms
//   pixel: 0-based LED index, or 255 for "all LEDs"
//   r,g,b: 0-255
//   brightness: 0-100 (percent)
//   ms: duration in milliseconds
// The sequence is a repeating pattern: at the end of the last step it loops back to the first.
// Whitespace is ignored; only comma and | delimit. Example:
// "0,255,0,0,100,50 | 1,0,255,0,80,100 | 255,0,0,255,50,200"
//   = LED0 red 100% 50ms, LED1 green 80% 100ms, all white 50% 200ms, then repeat.

#include "blade_style.h"
#include "../common/arg_parser.h"
#include "../common/color.h"
#include "../common/math.h"
#include "../common/strfun.h"

#define PIXEL_SEQUENCER_MAX_STEPS 16
#define PIXEL_SEQUENCER_ALL_LEDS 255

struct PixelSequencerStep {
  uint8_t pixel;   // 0..num_leds-1 or PIXEL_SEQUENCER_ALL_LEDS
  uint8_t r, g, b;
  uint8_t brightness;  // 0-100
  uint16_t time_ms;
};

class PixelSequencer : public BladeStyle {
public:
  PixelSequencer() : num_steps_(0), cycle_time_ms_(0) {}

  // Parse config string: steps separated by |, each step "pixel,r,g,b,brightness,ms"
  // Whitespace is ignored; only comma and | are delimiters.
  // Invalid or incomplete blocks are skipped and do not crash.
  void ParseConfig(const char* str) {
    num_steps_ = 0;
    cycle_time_ms_ = 0;
    if (!str || !*str) return;
    char* p = const_cast<char*>(SkipSpace(str));
    while (num_steps_ < PIXEL_SEQUENCER_MAX_STEPS && *p) {
      while (*p == '|') { p++; p = const_cast<char*>(SkipSpace(p)); }
      if (!*p) break;
      PixelSequencerStep s;
      char* end;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || *p == ',') { skip_to_next_step(p); continue; }
      s.pixel = (uint8_t)clampi32(strtol(p, &end, 10), 0, 255);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end; p = const_cast<char*>(SkipSpace(p)); if (*p == ',') p++;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || !*p) { skip_to_next_step(p); continue; }
      s.r = (uint8_t)clampi32(strtol(p, &end, 10), 0, 255);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end; p = const_cast<char*>(SkipSpace(p)); if (*p == ',') p++;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || !*p) { skip_to_next_step(p); continue; }
      s.g = (uint8_t)clampi32(strtol(p, &end, 10), 0, 255);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end; p = const_cast<char*>(SkipSpace(p)); if (*p == ',') p++;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || !*p) { skip_to_next_step(p); continue; }
      s.b = (uint8_t)clampi32(strtol(p, &end, 10), 0, 255);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end; p = const_cast<char*>(SkipSpace(p)); if (*p == ',') p++;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || !*p) { skip_to_next_step(p); continue; }
      s.brightness = (uint8_t)clampi32(strtol(p, &end, 10), 0, 100);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end; p = const_cast<char*>(SkipSpace(p)); if (*p == ',') p++;
      p = const_cast<char*>(SkipSpace(p));
      if (*p == '|' || !*p) { skip_to_next_step(p); continue; }
      s.time_ms = (uint16_t)clampi32(strtol(p, &end, 10), 1, 65535);
      if (end == p) { skip_to_next_step(p); continue; }
      p = end;
      steps_[num_steps_] = s;
      cycle_time_ms_ += s.time_ms;
      num_steps_++;
      while (*p && *p != '|') p++;
      if (*p == '|') p++;
      p = const_cast<char*>(SkipSpace(p));
    }
  }

  // Advance p to the character after the next | (or end of string). Invalid blocks are skipped.
  static void skip_to_next_step(char*& p) {
    if (!p) return;
    while (*p && *p != '|') p++;
    if (*p == '|') p++;
    p = const_cast<char*>(SkipSpace(p));
  }

  void run(BladeBase* blade) override {
    if (!blade || num_steps_ == 0 || cycle_time_ms_ == 0) {
      if (blade) blade->clear();
      if (blade) blade->allow_disable();
      return;
    }
    int num_leds = blade->num_leds();
    if (num_leds <= 0) {
      blade->allow_disable();
      return;
    }
    // Repeating pattern: time wraps to 0 after the last step
    uint32_t t = millis() % cycle_time_ms_;
    uint32_t acc = 0;
    int cur = 0;
    for (int i = 0; i < num_steps_; i++) {
      if (t < acc + steps_[i].time_ms) {
        cur = i;
        break;
      }
      acc += steps_[i].time_ms;
    }
    const PixelSequencerStep& s = steps_[cur];
    // Pixel index beyond blade length: ignore this step (all off), do not crash
    int target = (s.pixel == PIXEL_SEQUENCER_ALL_LEDS) ? -1 : (int)s.pixel;
    if (target >= num_leds) target = -2;  // -2 = ignore (out of range)
    Color16 c;
    if (target != -2) {
      Color16 base(s.r * 0x101, s.g * 0x101, s.b * 0x101);
      int br = (int)s.brightness * 32768 / 100;
      c = Color16((base.r * br) >> 15, (base.g * br) >> 15, (base.b * br) >> 15);
    }
    for (int i = 0; i < num_leds; i++) {
      if (target == -2)
        blade->set(i, Color16());
      else if (target < 0 || i == target)
        blade->set(i, c);
      else
        blade->set(i, Color16());
      if (!(i & 0xf)) Looper::DoHFLoop();
    }
    blade->allow_disable();
  }

  bool IsHandled(HandledFeature) override { return false; }

private:
  PixelSequencerStep steps_[PIXEL_SEQUENCER_MAX_STEPS];
  int num_steps_;
  uint32_t cycle_time_ms_;
};

class PixelSequencerFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    PixelSequencer* s = new PixelSequencer();
    const char* arg = CurrentArgParser->GetArg(1, "SEQ", "0,255,0,0,100,100|1,0,255,0,100,100");
    if (arg) s->ParseConfig(arg);
    CurrentArgParser->Shift(1);
    return s;
  }
};

static PixelSequencerFactory pixel_sequencer_factory;

#endif  // STYLES_PIXEL_SEQUENCER_H
