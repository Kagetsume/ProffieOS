// SD blade config runtime: create BladeBase instances from config/blades.ini
// and a BladeConfig that uses them. Include from ProffieOS.ino after CONFIG_PROP.
// Full implementation only on ENABLE_SD + ENABLE_WS2811 + ARDUINO_ARCH_STM32L4 (Proffieboard).

#ifdef ENABLE_SD

#if defined(ENABLE_WS2811) && defined(ARDUINO_ARCH_STM32L4)

#include "common/blade_config_file.h"
#include "blades/sub_blade.h"

static BladeConfig sd_blade_config;
static BladeBase* sd_blade_ptrs[SD_MAX_BLADE_DEFS];
static bool sd_blade_config_has_blades = false;

static RuntimePowerPins sd_runtime_power[SD_MAX_BLADE_DEFS];
static alignas(WS2811PinBase<Color8::GRB>) uint8_t sd_pin_storage[SD_MAX_BLADE_DEFS][sizeof(WS2811PinBase<Color8::GRB>)];
static alignas(WS2811_Blade) uint8_t sd_blade_storage[SD_MAX_BLADE_DEFS][sizeof(WS2811_Blade)];

static void SetSDBladeConfigBlade(int n, BladeBase* b) {
#define SET_SD_BLADE(N) case N: sd_blade_config.blade##N = b; break;
  switch (n) {
    ONCEPERBLADE(SET_SD_BLADE);
    default: break;
  }
#undef SET_SD_BLADE
}

void InitSDBladeConfig() {
  sd_blade_config_has_blades = false;
  if (!UseBladeConfigFile() || sd_blade_def_count == 0) return;
  for (size_t i = 0; i < SD_MAX_BLADE_DEFS; i++) sd_blade_ptrs[i] = nullptr;
  size_t n = (sd_blade_def_count < (size_t)NUM_BLADES) ? sd_blade_def_count : (size_t)NUM_BLADES;
  for (size_t i = 0; i < n; i++) {
    const SDBladeDef& d = sd_blade_defs[i];
    if (d.data_pin < 0 || d.pixels <= 0 || d.pixels > maxLedsPerStrip) continue;
    int power_count = 0;
    while (power_count < SD_MAX_POWER_PINS_PER_BLADE && d.power_pin[power_count] >= 0) power_count++;
    sd_runtime_power[i].SetPins(d.power_pin, power_count > 0 ? power_count : 0);
    WS2811PinBase<Color8::GRB>* pin = new (&sd_pin_storage[i]) WS2811PinBase<Color8::GRB>(
        (int)d.pixels, (int8_t)d.data_pin, 800000, 300, 294, 892);
    WS2811_Blade* blade = new (&sd_blade_storage[i]) WS2811_Blade(
        pin, &sd_runtime_power[i], 3000);
    BladeBase* result = blade;
    if (d.sub_blade_count > 0) {
      for (int j = 0; j < d.sub_blade_count; j++) {
        int first = d.sub_blade_first[j];
        int last = d.sub_blade_last[j];
        if (first < 0 || last < first || last >= (int)d.pixels) continue;
        result = SubBlade(first, last, (j == 0) ? result : nullptr);
        if (!result) break;
      }
    }
    sd_blade_ptrs[i] = result;
    sd_blade_config_has_blades = true;
  }
  if (!sd_blade_config_has_blades) return;
  sd_blade_config.ohm = (NELEM(blades) > 0) ? blades[0].ohm : 0;
  sd_blade_config.presets = (NELEM(blades) > 0) ? blades[0].presets : nullptr;
  sd_blade_config.num_presets = (NELEM(blades) > 0) ? blades[0].num_presets : 0;
  sd_blade_config.save_dir = (NELEM(blades) > 0) ? blades[0].save_dir : nullptr;
  for (int nn = 1; nn <= NUM_BLADES; nn++) {
    SetSDBladeConfigBlade(nn, (nn <= (int)n) ? sd_blade_ptrs[nn - 1] : nullptr);
  }
}

BladeConfig* GetSDBladeConfig() {
  return (UseBladeConfigFile() && sd_blade_config_has_blades) ? &sd_blade_config : nullptr;
}

#else  // ENABLE_SD but not (STM32 + WS2811): stubs
void InitSDBladeConfig() {}
BladeConfig* GetSDBladeConfig() { return nullptr; }
#endif  // ENABLE_WS2811 && ARDUINO_ARCH_STM32L4

#endif  // ENABLE_SD
