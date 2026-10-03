#ifndef COMMON_SD_CONFIG_DEFS_H
#define COMMON_SD_CONFIG_DEFS_H

#ifdef ENABLE_SD_CONFIG_FILES
#include "sd_config.h"

SDPresetDef sd_presets_storage[SD_MAX_PRESETS];
size_t sd_preset_count = 0;
bool sd_config_active = false;
#endif

#endif  // COMMON_SD_CONFIG_DEFS_H
