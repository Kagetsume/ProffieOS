#ifndef COMMON_SD_BOOT_STYLE_WARM_H
#define COMMON_SD_BOOT_STYLE_WARM_H

// Boot (after LoadSDConfig, before FindBlade): index config/blade_styles.ini ([section]→file offset only).
// SetPreset (before AllocateBladeStyles): prune heap layer cache to this preset's config sections,
// then seek-load any missing sections into the cache. No full INI in RAM; no palette scan at index time.
// See doc/sd_style_boot_order.md.

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

// Seek-load preset config sections into the heap layer cache (index + parse; palettes on demand).
inline void StyleConfigWarmLayersForPreset(int preset_index) {
  char sections[NUM_BLADES][64];
  int config_blades = 0;
  if (preset_index >= 0 && (size_t)preset_index < sd_preset_count) {
    for (size_t b = 0; b < NUM_BLADES; b++) {
      char tmp[64];
      const char* style = sd_presets_storage[preset_index].style[b].get();
      if (StyleConfigParsePresetConfigSection(style, tmp, sizeof(tmp))) config_blades++;
    }
  }
  const int nsections = StyleBootCollectPresetConfigSections(preset_index, sections, NUM_BLADES);
  const int deduped = config_blades - nsections;
  const int pruned = StyleConfigPruneLayersCacheExcept(sections, nsections);

  if (nsections <= 0) {
    PVLOG_STATUS << "Style config: preset " << preset_index
                 << " no config sections (" << config_blades << " blade style line(s))\n";
    return;
  }

  static char layers[STYLE_CONFIG_MAX_LAYERS][STYLE_CONFIG_LAYER_STR_LEN];
  int cache_hits = 0;
  int sd_loads = 0;
  int load_fail = 0;
  for (int i = 0; i < nsections; i++) {
    if (!sections[i][0]) continue;
    int nl = StyleConfigCopyLayersFromCache(sections[i], layers, STYLE_CONFIG_MAX_LAYERS);
    if (nl > 0) {
      cache_hits++;
      PVLOG_STATUS << "Style config:   [" << sections[i] << "] " << nl
                   << " layer(s) cache hit\n";
      continue;
    }
    nl = LoadStyleConfigLayers(sections[i], layers, STYLE_CONFIG_MAX_LAYERS);
    if (nl > 0) {
      sd_loads++;
      PVLOG_STATUS << "Style config:   [" << sections[i] << "] " << nl
                   << " layer(s) loaded from SD\n";
    } else {
      load_fail++;
      PVLOG_STATUS << "Style config:   [" << sections[i] << "] load failed (missing index/section?)\n";
    }
  }
  PVLOG_STATUS << "Style config: preset " << preset_index << " unique=" << nsections
               << " config_blades=" << config_blades;
  if (deduped > 0) PVLOG_STATUS << " deduped=" << deduped;
  if (pruned > 0) PVLOG_STATUS << " pruned=" << pruned;
  PVLOG_STATUS << " cache_hit=" << cache_hits << " sd_load=" << sd_loads
               << " fail=" << load_fail << " heap_cached=" << style_config_layers_cache_count
               << "\n";
}

inline void StyleBootOnPresetActivate(int preset_index) {
#if defined(ENABLE_SD) && defined(ENABLE_SD_CONFIG_FILES) && NUM_BLADES > 0
  if (!UseSDConfig()) return;
  StyleConfigWarmLayersForPreset(preset_index);
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
