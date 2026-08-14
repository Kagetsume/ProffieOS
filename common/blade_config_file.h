#ifndef COMMON_BLADE_CONFIG_FILE_H
#define COMMON_BLADE_CONFIG_FILE_H

// Blade config file: defines which data line controls which blade, how many
// pixels are in that blade, and which FET/power lines map to which blade.
// File: config/blades.ini on SD card. Whitespace-tolerant; malformed lines ignored.
//
// Hardened: max line count (SD_BLADE_CONFIG_MAX_LINES); variable buffer 33; blade index
// and pixels read with bounded digit count (no readIntValue overflow); pin values
// bounded (numeric: at most 4 digits; word buffer 33); malformed lines skipped; file closed on exit.

#include "file_reader.h"
#include "lsfs.h"
#include "stdout.h"

#define SD_BLADE_CONFIG_PATH "config/blades.ini"
#define SD_BLADE_CONFIG_MAX_LINES 512
#define SD_MAX_BLADE_DEFS 16
#define SD_MAX_POWER_PINS_PER_BLADE 6
#define SD_MAX_SUB_BLADES_PER_BLADE 8
#define SD_MAX_SIMPLE_PINS 4

enum SDBladeDriverType : uint8_t {
  SD_BLADE_DRIVER_WS2811 = 0,
  SD_BLADE_DRIVER_SIMPLE = 1,
};

enum SDBladeLEDType : uint8_t {
  SD_BLADE_LED_UNKNOWN = 0,
  SD_BLADE_LED_NOLED,
  SD_BLADE_LED_CreeXPE2White,
  SD_BLADE_LED_CreeXPE2Blue,
  SD_BLADE_LED_CreeXPE2Green,
  SD_BLADE_LED_CreeXPE2Red,
  SD_BLADE_LED_CreeXPE2Amber,
  SD_BLADE_LED_CreeXPE2PCAmber,
  SD_BLADE_LED_CreeXPE2RedOrange,
  SD_BLADE_LED_CreeXPL,
  SD_BLADE_LED_Blue3mmLED,
  SD_BLADE_LED_Red8mmLED100,
  SD_BLADE_LED_Blue8mmLED100,
  SD_BLADE_LED_CH1LED,
  SD_BLADE_LED_CH2LED,
  SD_BLADE_LED_CH3LED,
  SD_BLADE_LED_ServoSelector,
};

struct SDBladeDef {
  SDBladeDriverType driver;  // WS2811 (default) or simple PWM LED
  int data_pin;       // -1 = not set; for simple blades also used as pin1 when pin1 omitted
  int pixels;         // 0 = not set
  int power_pin[SD_MAX_POWER_PINS_PER_BLADE];  // -1 = unused
  int sub_blade_first[SD_MAX_SUB_BLADES_PER_BLADE];  // -1 = unused
  int sub_blade_last[SD_MAX_SUB_BLADES_PER_BLADE];   // -1 = unused
  int sub_blade_count;  // 0 = use full strip; >0 = SubBlade ranges
  int simple_pin[SD_MAX_SIMPLE_PINS];  // PWM pins for type=simple (-1 unused)
  SDBladeLEDType simple_led[SD_MAX_SIMPLE_PINS];  // LED circuit per simple pin
  bool simple_active_high[SD_MAX_SIMPLE_PINS];  // true = active_state high (direct PWM)
  bool simple_active_high_default;  // from active_state= blade-wide default
  bool simple_active_high_default_set;
};

extern SDBladeDef sd_blade_defs[SD_MAX_BLADE_DEFS];
extern size_t sd_blade_def_count;

inline bool UseBladeConfigFile() {
  return sd_blade_def_count > 0;
}

// Parse pin value from string: numeric (e.g. "20") or text constant (e.g. "bladePowerPin1").
// Defined in blade_config_pin_names.h (included after board config).
int ParseBladeConfigPinValue(const char* str);

// Read pin value from file: either integer or text constant (bladePowerPin1, bladePin, etc.).
// Numeric: at most 4 digits (or - and 3 digits) to avoid readIntValue overflow.
static inline int ReadPinValueFromFile(FileReader& f) {
  f.skipwhite();
  if (!f.Available()) return -1;
  int c = f.Peek();
  if (c >= '0' && c <= '9') {
    int val = 0;
    for (int d = 0; d < 4 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
      val = val * 10 + (f.Read() - '0');
    return val;
  }
  if (c == '-') {
    f.Read();
    if (!f.Available() || f.Peek() < '0' || f.Peek() > '9') return -1;
    int val = 0;
    for (int d = 0; d < 3 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
      val = val * 10 + (f.Read() - '0');
    return -val;
  }
  char word[33];
  int i = 0;
  while (f.Available() && i < 32) {
    c = f.Peek();
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
      word[i++] = (char)f.Read();
    else
      break;
  }
  word[i] = 0;
  return ParseBladeConfigPinValue(word);
}

// Parse LED type name from blades.ini (e.g. CreeXPE2White, NoLED).
inline SDBladeLEDType ParseBladeConfigLEDType(const char* str) {
  if (!str || !*str) return SD_BLADE_LED_UNKNOWN;
  if (!strcmp(str, "NoLED")) return SD_BLADE_LED_NOLED;
  if (!strcmp(str, "CreeXPE2White")) return SD_BLADE_LED_CreeXPE2White;
  if (!strcmp(str, "CreeXPE2Blue")) return SD_BLADE_LED_CreeXPE2Blue;
  if (!strcmp(str, "CreeXPE2Green")) return SD_BLADE_LED_CreeXPE2Green;
  if (!strcmp(str, "CreeXPE2Red")) return SD_BLADE_LED_CreeXPE2Red;
  if (!strcmp(str, "CreeXPE2Amber")) return SD_BLADE_LED_CreeXPE2Amber;
  if (!strcmp(str, "CreeXPE2PCAmber")) return SD_BLADE_LED_CreeXPE2PCAmber;
  if (!strcmp(str, "CreeXPE2RedOrange")) return SD_BLADE_LED_CreeXPE2RedOrange;
  if (!strcmp(str, "CreeXPL")) return SD_BLADE_LED_CreeXPL;
  if (!strcmp(str, "Blue3mmLED")) return SD_BLADE_LED_Blue3mmLED;
  if (!strcmp(str, "Red8mmLED100")) return SD_BLADE_LED_Red8mmLED100;
  if (!strcmp(str, "Blue8mmLED100")) return SD_BLADE_LED_Blue8mmLED100;
  if (!strcmp(str, "CH1LED")) return SD_BLADE_LED_CH1LED;
  if (!strcmp(str, "CH2LED")) return SD_BLADE_LED_CH2LED;
  if (!strcmp(str, "CH3LED")) return SD_BLADE_LED_CH3LED;
  if (!strcmp(str, "ServoSelector")) return SD_BLADE_LED_ServoSelector;
  return SD_BLADE_LED_UNKNOWN;
}

static inline SDBladeLEDType ReadLEDTypeFromFile(FileReader& f) {
  f.skipwhite();
  if (!f.Available()) return SD_BLADE_LED_UNKNOWN;
  char word[33];
  int i = 0;
  while (f.Available() && i < 32) {
    int c = f.Peek();
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
      word[i++] = (char)f.Read();
    else
      break;
  }
  word[i] = 0;
  return ParseBladeConfigLEDType(word);
}

static inline bool ReadActiveStateFromFile(FileReader& f, bool* out) {
  f.skipwhite();
  if (!f.Available()) return false;
  char word[33];
  int i = 0;
  while (f.Available() && i < 32) {
    int c = f.Peek();
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
      word[i++] = (char)f.Read();
    else
      break;
  }
  word[i] = 0;
  if (!strcmp(word, "high") || !strcmp(word, "1") || !strcmp(word, "true")) {
    *out = true;
    return true;
  }
  if (!strcmp(word, "low") || !strcmp(word, "0") || !strcmp(word, "false")) {
    *out = false;
    return true;
  }
  return false;
}

static inline void FinalizeSDBladeDef(SDBladeDef& def) {
  // Infer simple PWM when type=simple, led=, or pin1= without a NeoPixel pixel count.
  if (def.driver != SD_BLADE_DRIVER_SIMPLE && def.pixels <= 0) {
    for (int i = 0; i < SD_MAX_SIMPLE_PINS; i++) {
      if (def.simple_pin[i] >= 0 ||
          (def.simple_led[i] != SD_BLADE_LED_UNKNOWN &&
           def.simple_led[i] != SD_BLADE_LED_NOLED)) {
        def.driver = SD_BLADE_DRIVER_SIMPLE;
        break;
      }
    }
  }
  if (def.driver != SD_BLADE_DRIVER_SIMPLE) return;
  if (def.simple_pin[0] < 0 && def.data_pin >= 0)
    def.simple_pin[0] = def.data_pin;
  for (int i = 0; i < SD_MAX_SIMPLE_PINS; i++) {
    if (def.simple_pin[i] >= 0 && def.simple_led[i] == SD_BLADE_LED_UNKNOWN)
      def.simple_led[i] = SD_BLADE_LED_CreeXPE2White;
  }
}

static inline bool SDBladeDefIsPopulated(SDBladeDef& def) {
  FinalizeSDBladeDef(def);
  if (def.driver == SD_BLADE_DRIVER_SIMPLE) {
    for (int i = 0; i < SD_MAX_SIMPLE_PINS; i++)
      if (def.simple_pin[i] >= 0) return true;
    return false;
  }
  return def.data_pin >= 0 && def.pixels > 0;
}

// Load blade definitions from SD config/blades.ini if present.
// Format: blade=0 then data_pin=, pixels=, power_pin= (or power_pin1..6), optional sub_blade=first,last, end.
// Simple PWM LED: type=simple, data_pin= or pin1=..pin4=, led= or led1=..led4=,
// active_state= or active_state1=..active_state4= (high|low; default high). active_high= is an alias.
// Does not crash on malformed input; invalid lines are skipped.
inline void LoadBladeConfigFile() {
#ifdef ENABLE_SD
  sd_blade_def_count = 0;
  for (size_t i = 0; i < SD_MAX_BLADE_DEFS; i++) {
    sd_blade_defs[i].driver = SD_BLADE_DRIVER_WS2811;
    sd_blade_defs[i].data_pin = -1;
    sd_blade_defs[i].pixels = 0;
    for (int j = 0; j < SD_MAX_POWER_PINS_PER_BLADE; j++)
      sd_blade_defs[i].power_pin[j] = -1;
    sd_blade_defs[i].sub_blade_count = 0;
    for (int j = 0; j < SD_MAX_SUB_BLADES_PER_BLADE; j++) {
      sd_blade_defs[i].sub_blade_first[j] = -1;
      sd_blade_defs[i].sub_blade_last[j] = -1;
    }
    for (int j = 0; j < SD_MAX_SIMPLE_PINS; j++) {
      sd_blade_defs[i].simple_pin[j] = -1;
      sd_blade_defs[i].simple_led[j] = SD_BLADE_LED_UNKNOWN;
      sd_blade_defs[i].simple_active_high[j] = true;
    }
    sd_blade_defs[i].simple_active_high_default = true;
    sd_blade_defs[i].simple_active_high_default_set = false;
  }
  LOCK_SD(true);
  FileReader f;
  if (!f.Open(SD_BLADE_CONFIG_PATH)) {
    LOCK_SD(false);
    return;
  }
  int current_blade = -1;
  int line_count = 0;
  while (f.Available() && line_count < SD_BLADE_CONFIG_MAX_LINES) {
    f.skipwhite();
    if (!f.Available()) break;
    if (f.Peek() == '#') { f.skipline(); line_count++; continue; }
    char variable[33];
    variable[0] = 0;
    if (!f.readVariable(variable)) { f.skipline(); line_count++; continue; }
    if (!variable[0]) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "end")) break;
    if (!f.Available() || f.Peek() != '=') { f.skipline(); line_count++; continue; }
    f.Read();
    f.skipwhite();
    if (!f.Available()) { f.skipline(); line_count++; continue; }
    if (!strcmp(variable, "blade")) {
      // At most 2 digits (0..15) to avoid readIntValue overflow
      int idx = -1;
      if (f.Peek() >= '0' && f.Peek() <= '9') {
        idx = f.Read() - '0';
        if (f.Peek() >= '0' && f.Peek() <= '9') idx = idx * 10 + (f.Read() - '0');
      }
      if (idx >= 0 && idx < (int)SD_MAX_BLADE_DEFS) {
        if (current_blade >= 0 && current_blade < (int)SD_MAX_BLADE_DEFS) {
          FinalizeSDBladeDef(sd_blade_defs[current_blade]);
          if (SDBladeDefIsPopulated(sd_blade_defs[current_blade])) {
            if (sd_blade_def_count < (size_t)(current_blade + 1))
              sd_blade_def_count = (size_t)(current_blade + 1);
          }
        }
        current_blade = idx;
        sd_blade_defs[idx].simple_active_high_default = true;
        sd_blade_defs[idx].simple_active_high_default_set = false;
        for (int j = 0; j < SD_MAX_SIMPLE_PINS; j++)
          sd_blade_defs[idx].simple_active_high[j] = true;
      }
      f.skipline();
      line_count++;
      continue;
    }
    if (current_blade < 0 || current_blade >= (int)SD_MAX_BLADE_DEFS) { f.skipline(); line_count++; continue; }
    SDBladeDef& def = sd_blade_defs[current_blade];
    if (!strcmp(variable, "type") || !strcmp(variable, "driver")) {
      char word[33];
      int i = 0;
      while (f.Available() && i < 32) {
        int c = f.Peek();
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_')
          word[i++] = (char)f.Read();
        else
          break;
      }
      word[i] = 0;
      if (!strcmp(word, "simple")) def.driver = SD_BLADE_DRIVER_SIMPLE;
      else if (!strcmp(word, "ws2811")) def.driver = SD_BLADE_DRIVER_WS2811;
    } else if (!strcmp(variable, "data_pin")) {
      def.data_pin = ReadPinValueFromFile(f);
      if (def.data_pin < 0) def.data_pin = -1;
    } else if (!strcmp(variable, "pixels")) {
      // At most 5 digits (65535) to avoid readIntValue overflow
      int p = 0;
      for (int d = 0; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        p = p * 10 + (f.Read() - '0');
      def.pixels = (p > 0 && p <= 65535) ? p : 0;
    } else if (!strcmp(variable, "power_pin")) {
      int p = ReadPinValueFromFile(f);
      if (p >= 0) {
        int j = 0;
        while (j < SD_MAX_POWER_PINS_PER_BLADE && def.power_pin[j] >= 0) j++;
        if (j < SD_MAX_POWER_PINS_PER_BLADE) def.power_pin[j] = p;
      }
    } else if (!strcmp(variable, "power_pin1")) {
      def.power_pin[0] = ReadPinValueFromFile(f);
      if (def.power_pin[0] < 0) def.power_pin[0] = -1;
    } else if (!strcmp(variable, "power_pin2")) {
      def.power_pin[1] = ReadPinValueFromFile(f);
      if (def.power_pin[1] < 0) def.power_pin[1] = -1;
    } else if (!strcmp(variable, "power_pin3")) {
      def.power_pin[2] = ReadPinValueFromFile(f);
      if (def.power_pin[2] < 0) def.power_pin[2] = -1;
    } else if (!strcmp(variable, "power_pin4")) {
      def.power_pin[3] = ReadPinValueFromFile(f);
      if (def.power_pin[3] < 0) def.power_pin[3] = -1;
    } else if (!strcmp(variable, "power_pin5")) {
      def.power_pin[4] = ReadPinValueFromFile(f);
      if (def.power_pin[4] < 0) def.power_pin[4] = -1;
    } else if (!strcmp(variable, "power_pin6")) {
      def.power_pin[5] = ReadPinValueFromFile(f);
      if (def.power_pin[5] < 0) def.power_pin[5] = -1;
    } else if (!strcmp(variable, "pin") || !strcmp(variable, "pin1")) {
      def.simple_pin[0] = ReadPinValueFromFile(f);
      if (def.simple_pin[0] < 0) def.simple_pin[0] = -1;
    } else if (!strcmp(variable, "pin2")) {
      def.simple_pin[1] = ReadPinValueFromFile(f);
      if (def.simple_pin[1] < 0) def.simple_pin[1] = -1;
    } else if (!strcmp(variable, "pin3")) {
      def.simple_pin[2] = ReadPinValueFromFile(f);
      if (def.simple_pin[2] < 0) def.simple_pin[2] = -1;
    } else if (!strcmp(variable, "pin4")) {
      def.simple_pin[3] = ReadPinValueFromFile(f);
      if (def.simple_pin[3] < 0) def.simple_pin[3] = -1;
    } else if (!strcmp(variable, "led") || !strcmp(variable, "led1")) {
      def.simple_led[0] = ReadLEDTypeFromFile(f);
    } else if (!strcmp(variable, "led2")) {
      def.simple_led[1] = ReadLEDTypeFromFile(f);
    } else if (!strcmp(variable, "led3")) {
      def.simple_led[2] = ReadLEDTypeFromFile(f);
    } else if (!strcmp(variable, "led4")) {
      def.simple_led[3] = ReadLEDTypeFromFile(f);
    } else if (!strcmp(variable, "active_state") || !strcmp(variable, "active_high")) {
      bool v = true;
      if (ReadActiveStateFromFile(f, &v)) {
        def.simple_active_high_default = v;
        def.simple_active_high_default_set = true;
        for (int j = 0; j < SD_MAX_SIMPLE_PINS; j++) def.simple_active_high[j] = v;
      }
    } else if (!strcmp(variable, "active_state1") || !strcmp(variable, "active_high1")) {
      bool v = true;
      if (ReadActiveStateFromFile(f, &v)) def.simple_active_high[0] = v;
    } else if (!strcmp(variable, "active_state2") || !strcmp(variable, "active_high2")) {
      bool v = true;
      if (ReadActiveStateFromFile(f, &v)) def.simple_active_high[1] = v;
    } else if (!strcmp(variable, "active_state3") || !strcmp(variable, "active_high3")) {
      bool v = true;
      if (ReadActiveStateFromFile(f, &v)) def.simple_active_high[2] = v;
    } else if (!strcmp(variable, "active_state4") || !strcmp(variable, "active_high4")) {
      bool v = true;
      if (ReadActiveStateFromFile(f, &v)) def.simple_active_high[3] = v;
    } else if (!strcmp(variable, "sub_blade") && def.sub_blade_count < SD_MAX_SUB_BLADES_PER_BLADE) {
      // sub_blade = first, last (two integers, comma-separated; max 5 digits each)
      int first = -1, last = -1;
      int v = 0, d = 0;
      for (; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        v = v * 10 + (f.Read() - '0');
      first = v;
      f.skipwhite();
      if (f.Available() && f.Peek() == ',') { f.Read(); f.skipwhite(); }
      v = 0; d = 0;
      for (; d < 5 && f.Available() && f.Peek() >= '0' && f.Peek() <= '9'; d++)
        v = v * 10 + (f.Read() - '0');
      last = v;
      if (first >= 0 && last >= first && def.sub_blade_count < SD_MAX_SUB_BLADES_PER_BLADE) {
        def.sub_blade_first[def.sub_blade_count] = first;
        def.sub_blade_last[def.sub_blade_count] = last;
        def.sub_blade_count++;
      }
    }
    f.skipline();
    line_count++;
  }
  if (current_blade >= 0 && current_blade < (int)SD_MAX_BLADE_DEFS) {
    FinalizeSDBladeDef(sd_blade_defs[current_blade]);
    if (SDBladeDefIsPopulated(sd_blade_defs[current_blade])) {
      if (sd_blade_def_count < (size_t)(current_blade + 1))
        sd_blade_def_count = (size_t)(current_blade + 1);
    }
  }
  for (size_t i = 0; i < sd_blade_def_count; i++)
    FinalizeSDBladeDef(sd_blade_defs[i]);
  f.Close();
  LOCK_SD(false);
  if (sd_blade_def_count > 0) {
    PVLOG_STATUS << "Blade config: loaded " << sd_blade_def_count << " blade defs from " SD_BLADE_CONFIG_PATH "\n";
  }
#endif
}

#endif  // COMMON_BLADE_CONFIG_FILE_H
