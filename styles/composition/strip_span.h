#ifndef STYLES_STRIP_SPAN_H
#define STYLES_STRIP_SPAN_H

// Short BMP/TGA window placed on the blade at the gating event's hit location.
//
// The event gate decides when this layer is visible. This layer only places
// the picture. event_blast centers it on the blast location. event_clash
// centers it on the clash location. That location is the same 0–32768 value
// EffectPosition<> reads off the effect (0 = hilt, 32768 = tip). It is read
// again every frame, so a location that moves during the event moves the window.
// Blade angle is not computed here.
//
//   strip_span <sd_path> <span_px> <fps>
//   layer = event_blast -1 strip_span animations/clash-hit.tga 36 24
//   layer = event_clash -1 strip_span animations/clash-hit.tga 36 24
//
// span_px is how many LEDs the image covers, a subset of the blade. The file's
// blade-axis is sampled onto that span. One row is one frame. Optional
// frames_y / row / rows is ignored. frames_x is rejected. No extend or retract
// arguments; the event gate owns the duration.
//
// Outside the window, and whenever the gate is not running this layer, alpha
// is 0. The window is clipped at LED 0 and the last LED. BMP pixels are opaque
// (alpha 255). 32-bit TGA keeps its opacity byte and that alpha blends.
// Span or file blade-axis above 192 is ignored and logged. The picture uses
// the shared event-image ring pool.

#include "event_gate.h"
#include "strip_column_source.h"
#include "../style_ptr.h"
#include "../../functions/int_arg.h"

// True when span cannot be drawn. 192 is the shared blade-axis cap.
inline bool StripSpanSpanIgnored(int span) {
  return span < 1 || span > STRIP_COLUMN_BLADE_PIXEL_CAP;
}

// Stock effect location, same conversion as EffectPosition<>.
// Newest matching effect on this blade. Clash also accepts a stab, matching
// the event gate. Returns false when that effect is not in the queue.
inline bool StripSpanReadEffectPosition(BladeBase* blade, EffectType want, int* pos_out) {
  if (!blade || !pos_out) return false;
  BladeEffect* effects = nullptr;
  size_t n = SaberBase::GetEffects(&effects);
  if (!effects || n == 0) return false;
  int blade_number = blade->GetBladeNumber();
  for (size_t i = 0; i < n; i++) {
    bool match = effects[i].type == want;
    if (!match && want == EFFECT_CLASH && effects[i].type == EFFECT_STAB) match = true;
    if (!match) continue;
    if (!effects[i].location.on_blade(blade_number)) continue;
    *pos_out = (int)(effects[i].location * 32768);
    return true;
  }
  return false;
}

// LED under the hit. 0 is the hilt. 32768 lands on num_leds, the same mapping
// Bump uses for a 0–32768 position, so the tip sits on the end of the strip.
inline int StripSpanCenterLed(int num_leds, int pos_32768) {
  if (num_leds <= 0) return 0;
  if (pos_32768 < 0) pos_32768 = 0;
  return (int)(((int64_t)pos_32768 * (int64_t)num_leds) / 32768);
}

// local_out is the index inside the unclipped span (0 .. span-1).
// LEDs before 0 or past the last LED are not inside. A window that starts
// below LED 0 keeps its alignment: LED 0 samples the pixel that belongs
// there, not the first pixel of the file.
inline bool StripSpanLedLocal(int led, int num_leds, int span, int pos_32768, int* local_out) {
  if (!local_out || led < 0 || led >= num_leds || span < 1) return false;
  int start = StripSpanCenterLed(num_leds, pos_32768) - span / 2;
  int local = led - start;
  if (local < 0 || local >= span) return false;
  *local_out = local;
  return true;
}

// Sample the file's blade-axis onto the span. False means this LED contributes
// nothing (alpha 0): outside the window, or off the end of the blade.
inline bool StripSpanSampleWindow(const uint8_t* row, int file_px,
                                  int led, int num_leds, int span, int pos_32768,
                                  uint8_t* r, uint8_t* g, uint8_t* b, uint8_t* a) {
  int local = 0;
  if (!row || file_px < 1 || !r || !g || !b || !a) return false;
  if (!StripSpanLedLocal(led, num_leds, span, pos_32768, &local)) return false;
  StripColumnSampleAtLed(row, local, span, file_px, r, g, b, a);
  return true;
}

// Alpha for one LED. 0 when the gate is idle, the span is rejected, or the
// LED is outside the clipped window. Otherwise the pixel's own alpha.
inline uint16_t StripSpanLedAlpha(bool active, const uint8_t* row, int file_px,
                                  int led, int num_leds, int span, int pos_32768) {
  if (!active || StripSpanSpanIgnored(span)) return 0;
  uint8_t r = 0, g = 0, b = 0, a = 0;
  if (!StripSpanSampleWindow(row, file_px, led, num_leds, span, pos_32768, &r, &g, &b, &a))
    return 0;
  return StripColumnAlpha8To15(a);
}

template<class SPAN, class FPS>
class StripSpanL {
 public:
  StripSpanL()
      : span_px_(0), num_leds_(0), pos_(0), have_pos_(false), span_rejected_(false),
        reject_logged_(false) {
    source_.CapturePendingPath();
  }

  const char* captured_path() const { return source_.Path(); }

  bool run(BladeBase* blade) {
    StripColumnEventPoolSweep();
    span_.run(blade);
    fps_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    int span = span_.getInteger(0);
    int fps = clampi32(fps_.getInteger(0), 1, 240);
    have_pos_ = false;

    if (ConfigPlayCue::ConsumeRelease()) {
      source_.ReleasePlaybackMemory();
      return true;
    }
    int window_ms = 0;
    if (ConfigPlayCue::ConsumeRestart(&window_ms)) source_.ArmEventWindow(window_ms);

    // The gate publishes its kind only while it is running this layer.
    // With no gate, and before the first event, there is nothing to draw.
    const bool gated = ConfigEventGateCue::Active();
    if (!gated && !source_.EventDriven()) return true;

    if (gated && blade) {
      int pos = 0;
      EffectType want = ConfigEventEffect(ConfigEventGateCue::Kind());
      if (StripSpanReadEffectPosition(blade, want, &pos)) {
        have_pos_ = true;
        pos_ = pos;
      }
    }

    if (span > STRIP_COLUMN_BLADE_PIXEL_CAP) {
      if (!reject_logged_) {
        reject_logged_ = true;
        STDERR << "strip_span: span " << span << " exceeds " << STRIP_COLUMN_BLADE_PIXEL_CAP
               << " (ignoring image)\n";
      }
      span_rejected_ = true;
      return true;
    }
    if (span < 1) {
      span_rejected_ = true;
      return true;
    }
    span_rejected_ = false;
    span_px_ = span;

    static const StripColumnOpenOptions kOpts = {"strip_span"};
    int load_px = STRIP_COLUMN_BLADE_PIXEL_CAP;
    if (!source_.EnsureOpen(kOpts, load_px, blade)) return true;
    int file_px = (int)source_.BladePixels();
    if (file_px > 0) load_px = file_px;
    source_.AdvanceAnimation(load_px, fps, load_px, blade, 1);
    return true;
  }

  RGBA_um_nod getColor(int led) {
    if (!have_pos_ || span_rejected_ || num_leds_ <= 0 || span_px_ < 1)
      return RGBA_um_nod::Transparent();
    const uint8_t* row = source_.CurrentFrameData();
    int file_px = (int)source_.BladePixels();
    uint8_t r = 0, g = 0, b = 0, a = 0;
    if (!StripSpanSampleWindow(row, file_px, led, num_leds_, span_px_, pos_, &r, &g, &b, &a))
      return RGBA_um_nod::Transparent();
    return RGBA_um_nod(Color16(sqr(r), sqr(g), sqr(b)), StripColumnAlpha8To15(a));
  }

 private:
  uint16_t sqr(uint8_t x) { return (uint16_t)x * x; }

  SPAN span_;
  FPS fps_;
  StripColumnFrameSource source_;
  int span_px_;
  int num_leds_;
  int pos_;
  bool have_pos_;
  bool span_rejected_;
  bool reject_logged_;
};

class StripSpanFactory : public StyleFactory {
 public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* path = CurrentArgParser->GetArg(1, "FILE", "");
    StripColumnPendingPath::Set(path);
    const char* arg4 = CurrentArgParser->GetArg(4, "", "");
    if (StripColumnClassifyLayoutWord(arg4) == STRIP_COLUMN_LAYOUT_COLUMNS_REMOVED) {
      STDOUT << "strip_span: frames_x is not supported; one row is one frame\n";
    }
    return StylePtr<StripSpanL<IntArg<2, 36>, IntArg<3, 24>>>()->make();
  }
};

static StripSpanFactory strip_span_factory;

#endif  // STYLES_STRIP_SPAN_H
