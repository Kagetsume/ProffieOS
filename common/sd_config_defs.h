#ifndef COMMON_SD_CONFIG_DEFS_H
#define COMMON_SD_CONFIG_DEFS_H

#ifdef ENABLE_SD_CONFIG_FILES
#include "sd_config.h"

SDPresetTable sd_presets_storage;
uint32_t* sd_preset_offsets = nullptr;
size_t sd_preset_count = 0;
size_t sd_preset_offset_cap = 0;
bool sd_config_active = false;
#endif

#endif  // COMMON_SD_CONFIG_DEFS_H
