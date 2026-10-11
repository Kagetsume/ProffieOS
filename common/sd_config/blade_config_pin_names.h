#ifndef COMMON_BLADE_CONFIG_PIN_NAMES_H
#define COMMON_BLADE_CONFIG_PIN_NAMES_H

// Blade config pin name -> GPIO number. Include this file AFTER your board config
// (CONFIG_FILE) so bladePin, bladePowerPin1, etc. are in scope.
// Used when parsing config/blades.ini: values like "bladePowerPin1" map to the
// board's pin numbers.

#include <stdlib.h>
#include <string.h>

inline int ParseBladeConfigPinValue(const char* str) {
  if (!str || !*str) return -1;
  while (*str == ' ' || *str == '\t') str++;
  if (*str >= '0' && *str <= '9' || *str == '-')
    return (int)strtol(str, nullptr, 10);
  // Text constant: match board pin names (same as enum SaberPins in board config).
  // Optional pins wrapped in #ifdef so configs that don't define them still compile.
  if (!strcmp(str, "bladePin")) return bladePin;
#ifdef bladeIdentifyPin
  if (!strcmp(str, "bladeIdentifyPin")) return bladeIdentifyPin;
#endif
#ifdef blade2Pin
  if (!strcmp(str, "blade2Pin")) return blade2Pin;
#endif
#ifdef blade3Pin
  if (!strcmp(str, "blade3Pin")) return blade3Pin;
#endif
#ifdef blade4Pin
  if (!strcmp(str, "blade4Pin")) return blade4Pin;
#endif
#ifdef blade5Pin
  if (!strcmp(str, "blade5Pin")) return blade5Pin;
#endif
#ifdef blade6Pin
  if (!strcmp(str, "blade6Pin")) return blade6Pin;
#endif
#ifdef blade7Pin
  if (!strcmp(str, "blade7Pin")) return blade7Pin;
#endif
#ifdef blade8Pin
  if (!strcmp(str, "blade8Pin")) return blade8Pin;
#endif
#ifdef blade9Pin
  if (!strcmp(str, "blade9Pin")) return blade9Pin;
#endif
  if (!strcmp(str, "bladePowerPin1")) return bladePowerPin1;
  if (!strcmp(str, "bladePowerPin2")) return bladePowerPin2;
  if (!strcmp(str, "bladePowerPin3")) return bladePowerPin3;
#ifdef bladePowerPin4
  if (!strcmp(str, "bladePowerPin4")) return bladePowerPin4;
#endif
#ifdef bladePowerPin5
  if (!strcmp(str, "bladePowerPin5")) return bladePowerPin5;
#endif
#ifdef bladePowerPin6
  if (!strcmp(str, "bladePowerPin6")) return bladePowerPin6;
#endif
#ifdef bladePowerPin7
  if (!strcmp(str, "bladePowerPin7")) return bladePowerPin7;
#endif
#ifdef bladePowerPin8
  if (!strcmp(str, "bladePowerPin8")) return bladePowerPin8;
#endif
#ifdef bladePowerPin9
  if (!strcmp(str, "bladePowerPin9")) return bladePowerPin9;
#endif
#ifdef bladePowerPin10
  if (!strcmp(str, "bladePowerPin10")) return bladePowerPin10;
#endif
#ifdef bladePowerPin11
  if (!strcmp(str, "bladePowerPin11")) return bladePowerPin11;
#endif
  return -1;  // unknown name; numeric values handled above
}

#endif  // COMMON_BLADE_CONFIG_PIN_NAMES_H
