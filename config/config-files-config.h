/*
 * Firmware profile for SD card "config files" (INI) on the Proffieboard.
 *
 * In ProffieOS.ino, use exactly one CONFIG_FILE line, for example:
 *   #define CONFIG_FILE "config/config-files-config.h"
 *
 * Copy the example INIs from examples/config/ on the repo to your SD card as:
 *   config/presets.ini
 *   config/blades.ini
 *   config/board.ini
 *   config/features.ini
 *   config/blade_styles.ini
 *   (and config/blade_styles/*.ini if you use include = there)
 *
 * Behavior:
 * - If config/presets.ini is present and parses, it replaces the compiled preset list below.
 * - config/blades.ini, board.ini, features.ini, blade_styles.ini are read when present (see doc/).
 * - Hardware/pin map still comes from proffieboard_v3_config.h + this file's CONFIG_TOP.
 *
 * The compiled CONFIG_PRESETS / blades[] below are fallbacks when SD files are missing or invalid.
 *
 * NUM_BLADES must match: (1) one style allocator per Preset entry per blade, (2) one BladeBase
 * per blade in BladeConfig, (3) one style = line per blade in config/presets.ini, (4) blade count
 * in config/blades.ini when you use SD blade wiring.
 *
 * Blade 3 — simple accent on Free1 (blade5Pin), accent_pulse 1500.
 * Blade 4 — simple accent on Free2 (blade6Pin), accent_sound_on (motor while audio plays).
 * Blade 5 — simple accent on Free3 (blade7Pin), accent_glow.
 * Simple accents can be defined in config/blades.ini with type=simple (see examples/config/blades.ini).
 */

#ifdef CONFIG_TOP
#include "proffieboard_v3_config.h"
#define NUM_BLADES 5
#define NUM_BUTTONS 2
#define VOLUME 1000
const unsigned int maxLedsPerStrip = 144;
#define CLASH_THRESHOLD_G 1.0
#define ENABLE_AUDIO
#define ENABLE_MOTION
#define ENABLE_WS2811
#define ENABLE_SD
#define MOUNT_SD_SETTING
#define ENABLE_SERIAL

// Compiled blade wiring (blades[] below; WS2811 blades overridden by config/blades.ini on SD):
//   Blade 1 — 144 px NeoPixel on bladePin, FET bladePowerPin1
//   Blade 2 —  60 px NeoPixel on blade2Pin, FET bladePowerPin2 + bladePowerPin3
//   Blade 3 —  accent on blade5Pin (Free1 / PB3), SimpleBladePtr, accent_pulse 1500
//   Blade 4 —  accent on blade6Pin (Free2 / PB10), SimpleBladePtr, accent_sound_on
//   Blade 5 —  accent on blade7Pin (Free3 / PB11), SimpleBladePtr, accent_glow
#endif

#ifdef CONFIG_PRESETS
// Same named style as SD presets.ini: accent_pulse [pulse_ms] (default 3000).
#define ACCENT_PULSE(MS) StylePtr<InOutHelper<PulsingX<BLACK, WHITE, IntArg<1, 3000>>, 0, 0>>(#MS)
StyleAllocator accent_pulse_fast_style = ACCENT_PULSE(1500);
StyleAllocator accent_sound_on_style = StylePtr<AlphaL<WHITE, IsGreaterThan<SmoothSoundLevel, Int<4096>>> >();
StyleAllocator accent_glow_style = StylePtr<InOutHelper<AlphaL<WHITE, SmoothSoundLevel>, 0, 0> >();

Preset presets[] = {
   { "TeensySF", "tracks/venus.wav",
    StyleNormalPtr<CYAN, WHITE, 300, 800>(),
    StyleNormalPtr<CYAN, WHITE, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "cyan"},
   { "SmthJedi", "tracks/mars.wav",
    StylePtr<InOutSparkTip<EASYBLADE(BLUE, WHITE), 300, 800> >(),
    StylePtr<InOutSparkTip<EASYBLADE(BLUE, WHITE), 300, 800> >(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "blue"},
   { "SmthGrey", "tracks/mercury.wav",
    StyleFirePtr<RED, YELLOW>(),
    StyleFirePtr<RED, YELLOW>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "fire"},
   { "SmthFuzz", "tracks/uranus.wav",
    StyleNormalPtr<RED, WHITE, 300, 800>(),
    StyleNormalPtr<RED, WHITE, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "red"},
   { "RgueCmdr", "tracks/venus.wav",
    StyleFirePtr<BLUE, CYAN>(),
    StyleFirePtr<BLUE, CYAN>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "blue fire"},
   { "TthCrstl", "tracks/mars.wav",
    StylePtr<InOutHelper<EASYBLADE(OnSpark<GREEN>, WHITE), 300, 800> >(),
    StylePtr<InOutHelper<EASYBLADE(OnSpark<GREEN>, WHITE), 300, 800> >(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "green"},
   { "TeensySF", "tracks/mercury.wav",
    StyleNormalPtr<WHITE, RED, 300, 800, RED>(),
    StyleNormalPtr<WHITE, RED, 300, 800, RED>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "white"},
   { "SmthJedi", "tracks/uranus.wav",
    StyleNormalPtr<AudioFlicker<YELLOW, WHITE>, BLUE, 300, 800>(),
    StyleNormalPtr<AudioFlicker<YELLOW, WHITE>, BLUE, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "yellow"},
   { "SmthGrey", "tracks/venus.wav",
    StylePtr<InOutSparkTip<EASYBLADE(MAGENTA, WHITE), 300, 800> >(),
    StylePtr<InOutSparkTip<EASYBLADE(MAGENTA, WHITE), 300, 800> >(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "magenta"},
   { "SmthFuzz", "tracks/mars.wav",
    StyleNormalPtr<Gradient<RED, BLUE>, Gradient<CYAN, YELLOW>, 300, 800>(),
    StyleNormalPtr<Gradient<RED, BLUE>, Gradient<CYAN, YELLOW>, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "gradient"},
   { "RgueCmdr", "tracks/mercury.wav",
    StyleRainbowPtr<300, 800>(),
    StyleRainbowPtr<300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "rainbow"},
   { "TthCrstl", "tracks/uranus.wav",
    StyleStrobePtr<WHITE, Rainbow, 15, 300, 800>(),
    StyleStrobePtr<WHITE, Rainbow, 15, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "strobe"},
   { "TeensySF", "tracks/venus.wav",
    &style_pov,
    StyleNormalPtr<BLACK, BLACK, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "POV"},
   { "SmthJedi", "tracks/mars.wav",
    &style_charging,
    StyleNormalPtr<BLACK, BLACK, 300, 800>(),
    accent_pulse_fast_style,
    accent_sound_on_style,
    accent_glow_style, "Battery\nLevel"}
};
// Blade 1–2: NeoPixel strips. Blade 3–5: simple accents on Free1 / Free2 / Free3 (active-high FET gate).
BladeConfig blades[] = {
 { 0,
  WS281XBladePtr<144, bladePin, Color8::GRB, PowerPINS<bladePowerPin1> >(),       // blade 1
  WS281XBladePtr<60, blade2Pin, Color8::GRB, PowerPINS<bladePowerPin2, bladePowerPin3> >(),  // blade 2
  SimpleBladePtr<CreeXPE2White, NoLED, NoLED, NoLED, ActiveHighPIN<blade5Pin>, SimplePin<-1>, SimplePin<-1>, SimplePin<-1> >(),   // blade 3 (Free1)
  SimpleBladePtr<CreeXPE2White, NoLED, NoLED, NoLED, ActiveHighPIN<blade6Pin>, SimplePin<-1>, SimplePin<-1>, SimplePin<-1> >(),   // blade 4 (Free2)
  SimpleBladePtr<CreeXPE2White, NoLED, NoLED, NoLED, ActiveHighPIN<blade7Pin>, SimplePin<-1>, SimplePin<-1>, SimplePin<-1> >(),   // blade 5 (Free3)
  CONFIGARRAY(presets) },
};
#endif

#ifdef CONFIG_BUTTONS
Button PowerButton(BUTTON_POWER, powerButtonPin, "pow");
Button AuxButton(BUTTON_AUX, auxPin, "aux");
#endif
