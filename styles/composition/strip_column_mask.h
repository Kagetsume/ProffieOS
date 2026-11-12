#ifndef STYLES_STRIP_COLUMN_MASK_H
#define STYLES_STRIP_COLUMN_MASK_H

// SD column brightness mask for config layer stacking (multiply / screen / add).
//
// Same files as strip_column: 24-bit uncompressed BMP, or uncompressed true-color TGA.
// Width = blade pixels (capped at 192), height = frame count (height 1 = a static mask).
// Row 0 = hilt. Paint grayscale; color pixels use average luminance.
// BMP rows are fully opaque. A TGA opacity byte blends the mask over the blade.
//
// If the file is missing or invalid, shows the same scrolling strobe red danger pattern
// (as strip_column base) instead of staying transparent.
//
// Named style: strip_column_mask
//   strip_column_mask <sd_path> <source_height> <fps>
// Example:
//   layer = multiply opacity 80% strip_column_mask masks/crackle.bmp 144 1
//   layer = multiply opacity 55% strip_column_mask animations/plasma_mask.bmp 144 30

#include "strip_column.h"
#include "strip_column_source.h"
#include "../style_ptr.h"
#include "../../functions/int_arg.h"

inline uint8_t StripColumnMaskLuminance8(uint8_t r, uint8_t g, uint8_t b) {
  return (uint8_t)(((int)r + (int)g + (int)b) / 3);
}

inline uint16_t StripColumnMaskGray8ToFactor(uint8_t gray) {
  return (uint16_t)gray * 257u;
}

inline uint16_t StripColumnMaskSampleFactorAtLed(const uint8_t* data, int led, int num_leds,
                                                 int source_height) {
  uint8_t r = 0, g = 0, b = 0, a = 0;
  StripColumnSampleAtLed(data, led, num_leds, source_height, &r, &g, &b, &a);
  (void)a;
  return StripColumnMaskGray8ToFactor(StripColumnMaskLuminance8(r, g, b));
}

template<class SOURCE_HEIGHT, class FPS>
class StripColumnMaskL {
public:
  StripColumnMaskL() : blade_(nullptr), num_leds_(0), source_height_(0) {
    source_.CapturePendingPath();
  }

  bool run(BladeBase* blade) {
    blade_ = blade;
    height_.run(blade);
    fps_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    source_height_ = clampi32(height_.getInteger(0), 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    int fps = clampi32(fps_.getInteger(0), 1, 240);

    if (ConfigPlayCue::ConsumeRelease()) {
      source_.ReleasePlaybackMemory();
      return true;
    }
    int cue_window = 0;
    if (ConfigPlayCue::ConsumeRestart(&cue_window)) source_.ArmEventWindow(cue_window);
    static const StripColumnOpenOptions kOpenOpts = {"strip_column_mask"};
    source_.EnsureOpen(kOpenOpts, source_height_, blade);
    source_.WarnSourceHeightVsBmp(source_height_, "strip_column_mask");
    int direction = (source_.EventDriven() || SaberBase::IsOn()) ? 1 : -1;
    source_.AdvanceAnimation(source_height_, fps, num_leds_, blade, direction);
    return true;
  }

  RGBA_um_nod getColor(int led) {
    static const StripColumnOpenOptions kOpenOpts = {"strip_column_mask"};
    int sh = source_height_ > 0 ? source_height_ : 144;
    source_.EnsureOpen(kOpenOpts, sh, blade_);
    if (num_leds_ <= 0) return StripColumnLayerTransparent();
    if (!source_.IsOpen()) {
      if (source_.MissingMediaFallbackActive(blade_)) {
        uint16_t f = StripColumnMissingMediaMaskFactor(led, num_leds_, millis());
        return RGBA_um_nod(Color16(f, f, f), 32768);
      }
      return StripColumnLayerTransparent();
    }
    const uint8_t* frame = source_.CurrentFrameData();
    if (!frame) return StripColumnLayerTransparent();
    uint8_t r = 0, g = 0, b = 0, a = 0;
    StripColumnSampleAtLed(frame, led, num_leds_, source_height_, &r, &g, &b, &a);
    uint16_t f = StripColumnMaskGray8ToFactor(StripColumnMaskLuminance8(r, g, b));
    return RGBA_um_nod(Color16(f, f, f), StripColumnAlpha8To15(a));
  }

private:
  SOURCE_HEIGHT height_;
  FPS fps_;
  StripColumnFrameSource source_;
  BladeBase* blade_;
  int num_leds_;
  int source_height_;
};

class StripColumnMaskFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* path = CurrentArgParser->GetArg(1, "FILE", "");
    StripColumnPendingPath::Set(path);
    return StylePtr<StripColumnMaskL<
      IntArg<2, 144>,
      IntArg<3, 30>> >()->make();
  }
};

static StripColumnMaskFactory strip_column_mask_factory;

#endif  // STYLES_STRIP_COLUMN_MASK_H
