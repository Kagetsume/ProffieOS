#ifndef STYLES_STRIP_COLUMN_FALLBACK_H
#define STYLES_STRIP_COLUMN_FALLBACK_H

// Procedural "missing BMP" pattern for strip_column / strip_column_mask.
// Scrolling red bands: two sweeps toward the tip, then two toward the hilt, repeat.
// Global fast strobe on the red bands so a missing file is obvious on the blade.

#include "../../common/color.h"
#include "../../common/math.h"

#ifndef STRIP_COLUMN_MISSING_PHASE_MS
#define STRIP_COLUMN_MISSING_PHASE_MS 650
#endif

inline Color16 StripColumnMissingMediaColor(int led, int num_leds, uint32_t now_ms) {
  if (num_leds <= 0) return Color16(0, 0, 0);
  if (num_leds == 1) {
    bool flash = ((now_ms / 70) & 1) != 0;
    return flash ? Color16(65535, 800, 0) : Color16(40000, 0, 0);
  }

  const uint32_t phase_ms = STRIP_COLUMN_MISSING_PHASE_MS;
  const uint32_t cycle_ms = phase_ms * 4;
  const uint32_t t = now_ms % cycle_ms;
  const uint32_t phase = t / phase_ms;
  const uint32_t phase_t = t % phase_ms;
  const bool sweep_up = (phase < 2);
  const int prog = (int)((uint64_t)phase_t * 32768 / phase_ms);
  const int scroll = sweep_up ? prog : (32768 - prog);

  const int led_pos = (int)((uint64_t)led * 32768 / (uint32_t)(num_leds - 1));
  const int band_w = 3500;
  const int v = led_pos + (scroll << 1) + (int)phase * 9000;
  const bool red_band = ((v / band_w) & 1) != 0;
  if (!red_band) return Color16(0, 0, 0);

  const bool flash = ((now_ms / 70) & 1) != 0;
  return flash ? Color16(65535, 4000, 0) : Color16(65535, 0, 0);
}

inline uint16_t StripColumnMissingMediaMaskFactor(int led, int num_leds, uint32_t now_ms) {
  Color16 c = StripColumnMissingMediaColor(led, num_leds, now_ms);
  uint32_t lum = ((uint32_t)c.r + (uint32_t)c.g + (uint32_t)c.b) / 3;
  return lum > 65535 ? 65535 : (uint16_t)lum;
}

#endif  // STYLES_STRIP_COLUMN_FALLBACK_H
