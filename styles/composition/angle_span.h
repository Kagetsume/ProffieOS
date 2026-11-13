#ifndef STYLES_ANGLE_SPAN_H
#define STYLES_ANGLE_SPAN_H

// Short BMP/TGA window that follows the live blade angle during a hold.
//
// The event gate decides when this layer is visible. event_lockup -1 means
// while the lockup is held (UpdateHold passes a 0 ms window, so frames loop
// at fps instead of spreading once across a wav and freezing). This layer
// only places the picture.
//
//   angle_span <sd_path> <span_px> <fps>
//   layer = event_lockup -1 angle_span animations/lockup-hit.tga 47 30
//
// The center is BladeAngle<> each frame: 0 when the blade points straight
// down (hilt), 32768 when it points straight up (tip). That is the public
// 0–32768 angle reading ResponsiveLockupL uses. This window keeps the full
// range, so the picture can sit on the hilt or the tip. StripSpanCenterLed
// maps it onto LEDs the same way strip_span maps a hit. Blast and clash
// locations are not read here.
//
// span_px is how many LEDs the image covers. The file's blade-axis is sampled
// onto that span. One row is one frame. Optional frames_y / row / rows is
// ignored. frames_x is rejected. No extend or retract arguments.
//
// Outside the window, and whenever the gate is not running this layer, alpha
// is 0. The window is clipped at LED 0 and the last LED. BMP pixels are opaque
// (alpha 255). 32-bit TGA keeps its opacity byte. Span or file blade-axis
// above 192 is ignored and logged. The picture uses the shared event-image ring.

#include "strip_span.h"
#include "../../functions/int.h"
#include "../../functions/blade_angle.h"

// Live angle as a 0–32768 blade position. Straight down is 0. Straight up is
// 32768. BladeAngle<> owns the conversion from fusor.angle1().
inline int AngleSpanReadPosition(BladeBase* blade) {
  static BladeAngle<> angle;
  if (!blade) return 0;
  angle.run(blade);
  int pos = angle.getInteger(0);
  if (pos < 0) return 0;
  if (pos > 32768) return 32768;
  return pos;
}

template<class SPAN, class FPS>
class AngleSpanL {
 public:
  AngleSpanL()
      : span_px_(0), num_leds_(0), pos_(0), have_pos_(false), span_rejected_(false),
        reject_logged_(false) {
    source_.CapturePendingPath();
  }

  const char* captured_path() const { return source_.Path(); }
  int position() const { return pos_; }
  bool have_position() const { return have_pos_; }

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
      have_pos_ = true;
      pos_ = AngleSpanReadPosition(blade);
    }

    if (span > STRIP_COLUMN_BLADE_PIXEL_CAP) {
      if (!reject_logged_) {
        reject_logged_ = true;
        STDERR << "angle_span: span " << span << " exceeds " << STRIP_COLUMN_BLADE_PIXEL_CAP
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

    static const StripColumnOpenOptions kOpts = {"angle_span"};
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

class AngleSpanFactory : public StyleFactory {
 public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* path = CurrentArgParser->GetArg(1, "FILE", "");
    StripColumnPendingPath::Set(path);
    const char* arg4 = CurrentArgParser->GetArg(4, "", "");
    if (StripColumnClassifyLayoutWord(arg4) == STRIP_COLUMN_LAYOUT_COLUMNS_REMOVED) {
      STDOUT << "angle_span: frames_x is not supported; one row is one frame\n";
    }
    return StylePtr<AngleSpanL<IntArg<2, 36>, IntArg<3, 24>>>()->make();
  }
};

static AngleSpanFactory angle_span_factory;

#endif  // STYLES_ANGLE_SPAN_H
