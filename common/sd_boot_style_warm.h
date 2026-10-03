#ifndef COMMON_SD_BOOT_STYLE_WARM_H
#define COMMON_SD_BOOT_STYLE_WARM_H

// Early boot (after LoadSDConfig, before FindBlade / wav playback): build a [section]→offset
// index on first SD open of config/blade_styles.ini only. No layer parse or INI malloc at boot.
// FindBlade → SetPreset loads each blade's config <section> on demand (index + seek); strip_column
// frame 0 is preloaded for the active preset at SetPreset (before styles allocate), not at boot.

#include "style_config_file.h"
#include "sd_config.h"
#include <stdlib.h>
#include <string.h>

inline int StyleBootCollectPresetConfigSections(int preset_index, char sections[][64],
                                                int max_sections) {
  if (!sections || max_sections <= 0) return 0;
  if (preset_index < 0 || (size_t)preset_index >= sd_preset_count) return 0;
  int n = 0;
  for (size_t b = 0; b < NUM_BLADES; b++) {
    const char* style = sd_presets_storage[preset_index].style[b].get();
    char section[64];
    if (!StyleConfigParsePresetConfigSection(style, section, sizeof(section))) continue;
    bool dup = false;
    for (int i = 0; i < n; i++) {
      if (!strcmp(sections[i], section)) {
        dup = true;
        break;
      }
    }
    if (dup) continue;
    strncpy(sections[n], section, 63);
    sections[n][63] = '\0';
    n++;
    if (n >= max_sections) return n;
  }
  return n;
}

inline void StyleConfigEvictLayersCacheExceptPreset(int preset_index) {
  char sections[NUM_BLADES][64];
  const int nsections = StyleBootCollectPresetConfigSections(preset_index, sections, NUM_BLADES);
  StyleConfigPruneLayersCacheExcept(sections, nsections);
}

inline void StyleBootOnPresetActivate(int preset_index) {
#if defined(ENABLE_SD) && defined(ENABLE_SD_CONFIG_FILES) && NUM_BLADES > 0
  if (!UseSDConfig()) return;
  StyleConfigEvictLayersCacheExceptPreset(preset_index);
#else
  (void)preset_index;
#endif
}

inline void WarmSdBootStyleCache() {
#if defined(ENABLE_SD) && defined(ENABLE_SD_CONFIG_FILES) && NUM_BLADES > 0
  if (!UseSDConfig()) return;
  StyleConfigBuildSectionIndexFromSd();
#else
  (void)0;
#endif
}

#endif  // COMMON_SD_BOOT_STYLE_WARM_H
