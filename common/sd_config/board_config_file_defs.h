#ifndef COMMON_BOARD_CONFIG_FILE_DEFS_H
#define COMMON_BOARD_CONFIG_FILE_DEFS_H

#include "board_config_file.h"

BoardConfigFile board_config_file = {
  -1, -1, -1, -1, -1, -1, -1, -1, -1,
  {0}, {0}, {0},
  false
};
void (*apply_board_buttons_hook)() = nullptr;

#endif  // COMMON_BOARD_CONFIG_FILE_DEFS_H
