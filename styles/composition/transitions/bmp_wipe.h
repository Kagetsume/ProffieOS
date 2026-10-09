#ifndef STYLES_COMPOSITION_TRANSITIONS_BMP_WIPE_H
#define STYLES_COMPOSITION_TRANSITIONS_BMP_WIPE_H

#include "../strip_column_source.h"

// Scrubs a column BMP as the wipe opacity. Progress 0 is row 0, progress 1 is the last row.
// The linear clock already runs backward on retract, so the file plays in reverse.
class ConfigBmpWipe {
public:
  void Release() {
    source_.SetPlaybackHold(false);
    source_.DropSession();
    ready_ = false;
  }
  void DropSession() { source_.DropSession(); ready_ = false; }
  bool ready() const { return ready_; }

  void Scrub(BladeBase* blade, const char* path, int source_height, int progress) {
    if (!blade || !path || !path[0]) {
      Release();
      return;
    }
    source_.UsePath(path);
    int leds = blade->num_leds();
    if (leds < 1) return;
    int sh = source_height > 0 ? source_height : leds;
    static const StripColumnOpenOptions kOpts = {"transition_bmp"};
    source_.SetPlaybackHold(true);
    if (!source_.EnsureOpen(kOpts, sh, blade)) return;
    uint32_t n = source_.NumFrames();
    if (n < 1) return;
    if (progress < 0) progress = 0;
    if (progress > 32768) progress = 32768;
    uint32_t frame = (uint32_t)(((uint32_t)progress * (n - 1u)) / 32768u);
    int load_h = source_.LoadedSourceHeight();
    if (load_h < 1) load_h = sh;
    if (!source_.SeekFrame(kOpts, load_h, frame, blade)) return;
    num_leds_ = leds;
    source_height_ = load_h;
    ready_ = true;
  }

  uint16_t Cover(int led) const {
    if (!ready_ || num_leds_ <= 0 || source_height_ <= 0) return 0;
    const uint8_t* data = source_.CurrentFrameData();
    if (!data) return 0;
    int row_low = 0;
    int frac15 = 0;
    StripColumnMapLed(led, num_leds_, source_height_, &row_low, &frac15);
    int idx0 = row_low * 3;
    if (idx0 + 2 >= source_height_ * 3) return 32768;
    int g = GrayAt(data + idx0);
    if (frac15 != 0 && row_low < source_height_ - 1) {
      int g1 = GrayAt(data + idx0 + 3);
      g = g + (((g1 - g) * frac15) >> 15);
    }
    if (g < 0) g = 0;
    if (g > 255) g = 255;
    return (uint16_t)(((255 - g) * 32768) / 255);
  }

private:
  static int GrayAt(const uint8_t* p) {
    return ((int)p[0] + (int)p[1] + (int)p[2]) / 3;
  }
  StripColumnFrameSource source_;
  int num_leds_ = 0;
  int source_height_ = 0;
  bool ready_ = false;
};

#endif
