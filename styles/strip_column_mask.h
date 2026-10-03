#ifndef STYLES_STRIP_COLUMN_MASK_H
#define STYLES_STRIP_COLUMN_MASK_H

// SD column BMP brightness mask for config layer stacking (multiply / screen / add).
//
// Same 24-bit BI_RGB BMP layout as strip_column (see strip_column_bmp.h):
//   width = animation frame count (use 1 for a static mask)
//   |height| = blade column in pixels (row 0 = hilt at top of image)
// Paint grayscale in GIMP/Photoshop; R=G=B per pixel. Color pixels use average luminance.
//
// If the file is missing or not a valid 24-bit BMP, the layer is fully transparent (no effect).
//
// Named style: strip_column_mask
//   strip_column_mask <sd_path> <source_height> <fps>
// Example:
//   layer = multiply opacity 80% strip_column_mask masks/crackle.bmp 144 1
//   layer = multiply opacity 55% strip_column_mask animations/plasma_mask.bmp 144 30

#include "strip_column.h"
#include "strip_column_source.h"
#include "style_ptr.h"
#include "../functions/int_arg.h"

inline uint8_t StripColumnMaskLuminance8(uint8_t r, uint8_t g, uint8_t b) {
  return (uint8_t)(((int)r + (int)g + (int)b) / 3);
}

inline uint16_t StripColumnMaskGray8ToFactor(uint8_t gray) {
  return (uint16_t)gray * 257u;
}

inline uint16_t StripColumnMaskLerpFactor(uint8_t a, uint8_t b, int frac15) {
  int la = (int)a * 257;
  int lb = (int)b * 257;
  return (uint16_t)(la + (((lb - la) * frac15) >> 15));
}

inline uint16_t StripColumnMaskSampleFactorAtLed(const uint8_t* data, int led, int num_leds,
                                                 int source_height) {
  int row_low = 0;
  int frac15 = 0;
  StripColumnMapLed(led, num_leds, source_height, &row_low, &frac15);
  int idx0 = row_low * 3;
  if (idx0 + 2 >= source_height * 3) return 0;
  if (frac15 == 0 || row_low >= source_height - 1) {
    return StripColumnMaskGray8ToFactor(
        StripColumnMaskLuminance8(data[idx0], data[idx0 + 1], data[idx0 + 2]));
  }
  int idx1 = idx0 + 3;
  uint8_t g0 = StripColumnMaskLuminance8(data[idx0], data[idx0 + 1], data[idx0 + 2]);
  uint8_t g1 = StripColumnMaskLuminance8(data[idx1], data[idx1 + 1], data[idx1 + 2]);
  return StripColumnMaskLerpFactor(g0, g1, frac15);
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

    static const StripColumnOpenOptions kOpenOpts = {"strip_column_mask"};
    source_.EnsureOpen(kOpenOpts, source_height_, blade);
    source_.WarnSourceHeightVsBmp(source_height_, "strip_column_mask");
    source_.AdvanceAnimation(source_height_, fps, num_leds_, blade);
    return true;
  }

  RGBA_um_nod getColor(int led) {
    static const StripColumnOpenOptions kOpenOpts = {"strip_column_mask"};
    int sh = source_height_ > 0 ? source_height_ : 144;
    source_.EnsureOpen(kOpenOpts, sh, blade_);
    if (!source_.IsOpen() || num_leds_ <= 0) return StripColumnLayerTransparent();
    uint16_t f = StripColumnMaskSampleFactorAtLed(
        source_.CurrentFrameData(), led, num_leds_, source_height_);
    return RGBA_um_nod(Color16(f, f, f), 32768);
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
