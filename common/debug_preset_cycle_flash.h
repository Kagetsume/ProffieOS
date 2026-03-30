#ifndef COMMON_DEBUG_PRESET_CYCLE_FLASH_H
#define COMMON_DEBUG_PRESET_CYCLE_FLASH_H

// =============================================================================
// DEBUG ONLY — REMOVE OR SET TO 0 BEFORE RELEASE
// When 1: first LED (index 0) flashes RED, GREEN, BLUE after next/prev preset (incl. fast)
//         only while presets come from SD config/presets.ini (UseSDConfig()).
// =============================================================================
#ifndef DEBUG_PRESET_CYCLE_FLASH
#define DEBUG_PRESET_CYCLE_FLASH 0
#endif

#if DEBUG_PRESET_CYCLE_FLASH
#include "../blades/abstract_blade.h"
#include "../common/color.h"
#include "../common/looper.h"
#include "../common/sd_config.h"

inline void DebugPresetCycleFlashRun() {
  if (!UseSDConfig()) return;
  BladeBase* b = GetPrimaryBlade();
  if (!b || b->num_leds() < 1) return;
  const Color16 colors[3] = {
      Color16(Color8(255, 0, 0)),
      Color16(Color8(0, 255, 0)),
      Color16(Color8(0, 0, 255)),
  };
  const Color16 off;
  const int led = 0;
  for (int n = 0; n < 3; n++) {
    b->set_overdrive(led, colors[n]);
    uint32_t t = millis() + 70;
    while ((int32_t)(millis() - t) < 0) Looper::DoLoop();
    b->set_overdrive(led, off);
    t = millis() + 70;
    while ((int32_t)(millis() - t) < 0) Looper::DoLoop();
  }
}
#else
inline void DebugPresetCycleFlashRun() {}
#endif

#endif  // COMMON_DEBUG_PRESET_CYCLE_FLASH_H
