#ifndef COMMON_SD_CONFIG_DEFS_H
#define COMMON_SD_CONFIG_DEFS_H

// Single definition of SD config globals (included once from ProffieOS.ino).
#include "sd_config.h"

SDPresetDef sd_presets_storage[SD_MAX_PRESETS];
size_t sd_preset_count = 0;
bool sd_config_active = false;

#endif  // COMMON_SD_CONFIG_DEFS_H
