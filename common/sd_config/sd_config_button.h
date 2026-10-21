#ifndef COMMON_SD_CONFIG_BUTTON_H
#define COMMON_SD_CONFIG_BUTTON_H

// Button whose pad and on/off state can follow config/board.ini.
// pin_ stays protected in buttons/button.h; this subclass is the fork side.

#include "../../buttons/button.h"
#include "board_config_file.h"
#include <string.h>

int ParseBladeConfigPinValue(const char* str);

inline int ResolveBoardButtonPin(const char* name) {
  if (!name || !name[0]) return -1;
  if (!strcmp(name, "powerButtonPin")) return powerButtonPin;
  if (!strcmp(name, "auxPin")) return auxPin;
  if (!strcmp(name, "aux2Pin")) return aux2Pin;
  return ParseBladeConfigPinValue(name);
}

class SdConfigButton : public Button {
public:
  SdConfigButton(enum BUTTON button, int pin, const char* name)
      : Button(button, pin, name) {}

  void AssignPin(int pin) {
    if (pin < 0 || pin > 255 || pin == pin_) return;
    pin_ = (uint8_t)pin;
    pinMode(pin_, INPUT_PULLUP);
#ifdef ENABLE_SNOOZE
    snooze_digital.pinMode(pin_, INPUT_PULLUP, RISING);
#endif
  }

  void SetActive(bool on) { active_ = on; }

  void Loop() override {
    if (!active_) return;
    ButtonBase::Loop();
  }

private:
  bool active_ = true;
};

#endif  // COMMON_SD_CONFIG_BUTTON_H
