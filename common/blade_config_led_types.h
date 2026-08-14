#ifndef COMMON_BLADE_CONFIG_LED_TYPES_H
#define COMMON_BLADE_CONFIG_LED_TYPES_H

// Map blades.ini LED type names to DriveLogic instances (for SD simple blades).

#include "blade_config_file.h"
#include "../blades/drive_logic.h"
#include "../blades/leds.h"

inline LEDInterface* GetSDBladeLEDInterface(SDBladeLEDType type) {
  switch (type) {
    case SD_BLADE_LED_NOLED: return LEDPtr<NoLED>();
    case SD_BLADE_LED_CreeXPE2White: return LEDPtr<CreeXPE2White>();
    case SD_BLADE_LED_CreeXPE2Blue: return LEDPtr<CreeXPE2Blue>();
    case SD_BLADE_LED_CreeXPE2Green: return LEDPtr<CreeXPE2Green>();
    case SD_BLADE_LED_CreeXPE2Red: return LEDPtr<CreeXPE2Red>();
    case SD_BLADE_LED_CreeXPE2Amber: return LEDPtr<CreeXPE2Amber>();
    case SD_BLADE_LED_CreeXPE2PCAmber: return LEDPtr<CreeXPE2PCAmber>();
    case SD_BLADE_LED_CreeXPE2RedOrange: return LEDPtr<CreeXPE2RedOrange>();
    case SD_BLADE_LED_CreeXPL: return LEDPtr<CreeXPL>();
    case SD_BLADE_LED_Blue3mmLED: return LEDPtr<Blue3mmLED>();
    case SD_BLADE_LED_Red8mmLED100: return LEDPtr<Red8mmLED100>();
    case SD_BLADE_LED_Blue8mmLED100: return LEDPtr<Blue8mmLED100>();
    case SD_BLADE_LED_CH1LED: return LEDPtr<CH1LED>();
    case SD_BLADE_LED_CH2LED: return LEDPtr<CH2LED>();
    case SD_BLADE_LED_CH3LED: return LEDPtr<CH3LED>();
    case SD_BLADE_LED_ServoSelector: return LEDPtr<ServoSelector>();
    default: return nullptr;
  }
}

inline Color8 GetSDBladeLEDColor8(SDBladeLEDType type) {
  switch (type) {
    case SD_BLADE_LED_CreeXPE2White: return Color8(CreeXPE2White::Red, CreeXPE2White::Green, CreeXPE2White::Blue);
    case SD_BLADE_LED_CreeXPE2Blue: return Color8(CreeXPE2Blue::Red, CreeXPE2Blue::Green, CreeXPE2Blue::Blue);
    case SD_BLADE_LED_CreeXPE2Green: return Color8(CreeXPE2Green::Red, CreeXPE2Green::Green, CreeXPE2Green::Blue);
    case SD_BLADE_LED_CreeXPE2Red: return Color8(CreeXPE2Red::Red, CreeXPE2Red::Green, CreeXPE2Red::Blue);
    case SD_BLADE_LED_CreeXPE2Amber: return Color8(CreeXPE2Amber::Red, CreeXPE2Amber::Green, CreeXPE2Amber::Blue);
    case SD_BLADE_LED_CreeXPE2PCAmber: return Color8(CreeXPE2PCAmber::Red, CreeXPE2PCAmber::Green, CreeXPE2PCAmber::Blue);
    case SD_BLADE_LED_CreeXPE2RedOrange: return Color8(CreeXPE2RedOrange::Red, CreeXPE2RedOrange::Green, CreeXPE2RedOrange::Blue);
    case SD_BLADE_LED_CreeXPL: return Color8(CreeXPL::Red, CreeXPL::Green, CreeXPL::Blue);
    case SD_BLADE_LED_Blue3mmLED: return Color8(Blue3mmLED::Red, Blue3mmLED::Green, Blue3mmLED::Blue);
    case SD_BLADE_LED_Red8mmLED100: return Color8(Red8mmLED100::Red, Red8mmLED100::Green, Red8mmLED100::Blue);
    case SD_BLADE_LED_Blue8mmLED100: return Color8(Blue8mmLED100::Red, Blue8mmLED100::Green, Blue8mmLED100::Blue);
    case SD_BLADE_LED_CH1LED: return Color8(CH1LED::Red, CH1LED::Green, CH1LED::Blue);
    case SD_BLADE_LED_CH2LED: return Color8(CH2LED::Red, CH2LED::Green, CH2LED::Blue);
    case SD_BLADE_LED_CH3LED: return Color8(CH3LED::Red, CH3LED::Green, CH3LED::Blue);
    case SD_BLADE_LED_ServoSelector: return Color8(ServoSelector::Red, ServoSelector::Green, ServoSelector::Blue);
    default: return Color8(0, 0, 0);
  }
}

#endif  // COMMON_BLADE_CONFIG_LED_TYPES_H
