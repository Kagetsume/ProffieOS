#ifndef STYLES_STYLE_PARSER_H
#define STYLES_STYLE_PARSER_H

#include "../common/preset.h"
#include <stdlib.h>
#include <stddef.h>
#include <stdio.h>
#include <string.h>
#include <climits>
#include "../common/arg_parser.h"

inline void StyleParserCopyArgBounded(char* output, size_t output_max, const char* start, const char* end) {
  if (!output || output_max == 0) return;
  if (!start || !end || end < start) {
    output[0] = '\0';
    return;
  }
  size_t len = (size_t)(end - start);
  size_t maxcopy = output_max - 1;
  size_t n = len < maxcopy ? len : maxcopy;
  memcpy(output, start, n);
  output[n] = '\0';
}
#include "../common/sd_config.h"
#include "../common/style_config_file.h"
#include "../functions/int_arg.h"
#include "config_layers_style.h"
#include "pixel_sequencer.h"

class NamedStyle {
public:
  const char* name;
  StyleAllocator style_allocator;
  const char* description;
};

class BuiltinPresetAllocator : public StyleFactory {
public:
  BladeStyle* make() override {
#if NUM_BLADES == 0
    return nullptr;
#else
    // "builtin P B" uses compiled ROM preset P, blade style B (current_config->presets).
    // When SD overrides the preset *list*, GetNumPresets() is the SD count — do not use it here.
    IntArg<1, 0> preset_arg;
    IntArg<2, 1> style_arg;
    int preset = preset_arg.getInteger(0);
    int style = style_arg.getInteger(0);

    StyleAllocator allocator = nullptr;
    if (!current_config) return nullptr;
    if (preset < 0 || preset >= (int)current_config->num_presets)
      return nullptr;

    Preset* p = current_config->presets + preset;
#define GET_PRESET_STYLE(N) if (style == N) allocator = p->style_allocator##N;
    ONCEPERBLADE(GET_PRESET_STYLE);
    if (!allocator) return nullptr;
    CurrentArgParser->Shift(2);
    // ArgParser ap(SkipWord(CurrentArgParser->GetArg(2, "", "")));
    // CurrentArgParser = &ap;
    return allocator->make();
#endif
  }
};

BuiltinPresetAllocator builtin_preset_allocator;

BladeStyle* ParseStyleStringForConfig(const char* str);

class ConfigStyleFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    const char* name_raw = CurrentArgParser ? CurrentArgParser->GetArg(1, "", "") : "";
    if (!name_raw || !name_raw[0]) return nullptr;
    // GetArg returns the full remainder ("with_vars base=magenta"); extract first word only.
    char name[64];
    int ni = 0;
    while (name_raw[ni] && name_raw[ni] != ' ' && name_raw[ni] != '\t' && ni < 63) {
      name[ni] = name_raw[ni];
      ni++;
    }
    name[ni] = '\0';
    char ov_keys[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_KEY_LEN];
    char ov_vals[STYLE_CONFIG_MAX_LOCAL_VARS][STYLE_CONFIG_LOCAL_VAL_LEN];
    int ov_count = 0;
    if (CurrentArgParser) {
      for (int ai = 2; ai < 32 && ov_count < STYLE_CONFIG_MAX_LOCAL_VARS; ai++) {
        const char* kv = CurrentArgParser->GetArg(ai, "", "");
        if (!kv || !kv[0]) break;
        const char* eq = strchr(kv, '=');
        if (!eq) break;
        size_t key_len = (size_t)(eq - kv);
        if (key_len == 0 || key_len >= STYLE_CONFIG_LOCAL_KEY_LEN) break;
        memcpy(ov_keys[ov_count], kv, key_len);
        ov_keys[ov_count][key_len] = '\0';
        const char* val_start = eq + 1;
        int vlen = 0;
        while (val_start[vlen] && val_start[vlen] != ' ' && val_start[vlen] != '\t'
               && vlen < STYLE_CONFIG_LOCAL_VAL_LEN - 1)
          vlen++;
        memcpy(ov_vals[ov_count], val_start, vlen);
        ov_vals[ov_count][vlen] = '\0';
        ov_count++;
      }
    }
    ArgParserInterface* outer_ap = CurrentArgParser;
    char layers[STYLE_CONFIG_MAX_LAYERS][STYLE_CONFIG_LAYER_STR_LEN];
    int n = LoadStyleConfigLayers(name, layers, STYLE_CONFIG_MAX_LAYERS, ov_count, ov_keys, ov_vals);
    if (n <= 0) return nullptr;
    if (n > STYLE_CONFIG_MAX_LAYERS) n = STYLE_CONFIG_MAX_LAYERS;
    BladeStyle* sub[CONFIG_LAYERS_MAX];
    uint16_t layer_alpha[CONFIG_LAYERS_MAX];
    uint8_t layer_blend[CONFIG_LAYERS_MAX];
    int count = 0;
    for (int i = 0; i < n && i < STYLE_CONFIG_MAX_LAYERS && count < CONFIG_LAYERS_MAX; i++) {
      if (!layers[i][0]) continue;
      uint16_t alpha = CONFIG_LAYER_ALPHA_OPAQUE;
      uint8_t blend = CONFIG_LAYER_BLEND_NORMAL;
      const char* p = layers[i];
      if (FirstWord(p, "multiply")) {
        blend = CONFIG_LAYER_BLEND_MULTIPLY;
        p = SkipWord(p);
      } else if (FirstWord(p, "screen")) {
        blend = CONFIG_LAYER_BLEND_SCREEN;
        p = SkipWord(p);
      } else if (FirstWord(p, "add")) {
        blend = CONFIG_LAYER_BLEND_ADD;
        p = SkipWord(p);
      } else if (FirstWord(p, "normal")) {
        blend = CONFIG_LAYER_BLEND_NORMAL;
        p = SkipWord(p);
      }
      const char* parse_from = p;
      if (FirstWord(p, "opacity")) {
        ArgParser ap(SkipWord(p));
        const char* av = ap.GetArg(1, "", "");
        if (!av || !av[0]) continue;
        int ai = strtol(av, nullptr, 10);
        if (ai < 0) ai = 0;
        if (ai > 32768) ai = 32768;
        alpha = (uint16_t)ai;
        parse_from = ap.GetArg(2, "", "");
        if (!parse_from || !parse_from[0]) continue;
      }
      BladeStyle* s = ParseStyleStringForConfig(parse_from);
      if (!s) continue;
      sub[count] = s;
      layer_alpha[count] = alpha;
      layer_blend[count] = blend;
      count++;
    }
    if (count == 0) return nullptr;
    CurrentArgParser = outer_ap;
    CurrentArgParser->Shift(1 + ov_count);
    return new ConfigLayersStyle(sub, count, layer_alpha, layer_blend);
  }
};

ConfigStyleFactory config_style_factory;

NamedStyle named_styles[] = {
#ifndef DISABLE_BASIC_PARSER_STYLES
  { "standard", StyleNormalPtrX<RgbArg<1, CYAN>, RgbArg<2, WHITE>, IntArg<3, 300>, IntArg<4, 800>>(),
    "Standard blade, color, clash color, extension time, retraction time",
  },
  // Combine onspark, inoutsparktip, gradient, customizable blast/clash/lockup colors
  { "advanced",
    StylePtr<
      InOutSparkTipX<
        SimpleClash<
          Lockup<
            Blast<
              OnSparkX<
                Gradient<RgbArg<1, Red>, RgbArg<2, Blue>, RgbArg<3, Green>>,
                RgbArg<4, White>,
                IntArg<5, 10>
              >,
              RgbArg<6, White>, // blast color
              200, 100, 400
            >,
            AudioFlicker<RgbArg<7, Magenta>, White>
          >,
          RgbArg<8, White>,
          40
        >,
        InOutFuncX<IntArg<9, 300>, IntArg<10, 800> >,
        RgbArg<11, White>
      >
    >(),
    "Advanced blade, color at hilt, middle color, tip color, onspark color, onspark time, blast color, lockup color, clash color, extension time, retraction time, spark tip color",
  },
  { "fire",
    StyleFirePtr<RgbArg<1, RED>, RgbArg<2, YELLOW>>(),
    "Fire blade, warm color, hot color"
  },
  { "unstable",
    StylePtr<InOutHelperX<LocalizedClash<Lockup<Blast<OnSpark<BrownNoiseFlicker<Strobe<RgbArg<1, Rgb<150, 0, 0>>,Sparkle<RgbArg<3, Rgb<255,40,0>>, RgbArg<4, Rgb<255,255,10>>,100,1024>,100,50>,Strobe<RgbArg<2, Red>,RgbArg<1, Rgb<150, 0, 0>>,50,5>,100>,White,100>,White,200,100,400>,AudioFlicker<OnSpark<BrownNoiseFlicker<Strobe<Black,Yellow,50,1>,Strobe<RgbArg<2, Red>,Black,50,1>,50>,White,200>,White>,AudioFlicker<OnSpark<BrownNoiseFlicker<Strobe<Black,Yellow,50,1>,Strobe<RgbArg<2, Red>,Black,50,1>,50>,White,200>,White>>,White,60,100>,InOutFuncX<IntArg<5, 100>,IntArg<6, 200>>,Black>>(),
    "Unstable blade, warm, warmer, hot, sparks, extension time, retraction time"
  },
  { "strobe",
    StyleNormalPtrX<StrobeX<RgbArg<1, BLACK>, RgbArg<2, WHITE>, IntArg<3, 15>, IntArg<4, 1>>, Rainbow, IntArg<5, 300>, IntArg<6, 800>>(),
    "Stroboscope, standby color, flash color, flash frequency, flash milliseconds, extension time, retraction time"
  },
  { "cycle",
    StylePtr<ColorCycle<RgbArg<1, Blue>,0,1,Layers<
        AudioFlicker<RgbArg<3, Cyan>, RgbArg<2, Blue>>,
        BlastL<RgbArg<4, Rgb<255,50,50>>>,
        LockupL<HumpFlicker<RgbArg<5, Red>, RgbArg<3, Cyan>,100>>,
        SimpleClashL<White>>,
      100,2000,1000>>(),
    "Cycle blade, start color, base color, flicker color, blast color, lockup color"
  },
  { "rainbow", StyleRainbowPtrX<IntArg<1, 300>, IntArg<2, 800>>(),
    "Rainbow blade, extension time, retraction time"
  },
  // BlastL returns RGBA_um_nod; Style<> + getLayerColor() preserve alpha for ConfigLayersStyle (see style_ptr.h).
  { "blast",
    StylePtr<BlastL<RgbArg<1, White>>>(),
    "Blast overlay layer: blast color only (fade/wave timing fixed at 200/100/400 ms in template). Mostly transparent until a blast — use an opaque base layer first"
  },
  { "charging", &style_charging, "Charging style" },
  { "pixel_sequence", &pixel_sequencer_factory,
    "Pixel sequencer: config = steps separated by |, each step pixel,r,g,b,brightness,ms; repeating pattern (pixel 0..N-1 or 255=all)",
  },
  // Preon/Postoff layers — transparent when idle, triggered by EFFECT_PREON / EFFECT_POSTOFF.
  // Uses TransitionEffectConfigL (not TransitionEffectL) so that:
  //   idle  → Style<> calls allow_disable → captured by AllowDisableCapture
  //   active → Style<> does NOT call allow_disable → blade stays powered
  // ConfigLayersStyle only forwards allow_disable to the real blade when ALL layers agree.
  //
  // DURATION: All preon effects use WavLen<EFFECT_PREON> so their visual
  // duration automatically matches the preon sound file length.  The prop
  // waits for the preon sound to finish before igniting the main blade, so
  // the preon visual ends at exactly the right time.  Similarly, postoff
  // effects use WavLen<EFFECT_POSTOFF>.
  //
  // AUDIO-REACTIVE: Glow and sputter effects use SmoothSoundLevel to drive
  // blade brightness/length from the audio envelope.  SmoothSoundLevel is an
  // IIR-filtered audio envelope (0-32768) that follows loudness over time.
  // When the sound is loud the blade is bright/long; when quiet it dims/retracts.
  // This naturally fades the visual as the preon/postoff sound ends.
  //
  // TRANSPARENCY: Effects use bare AlphaL<> (not Layers<Black, AlphaL<>>)
  // so they produce RGBA with alpha=0 when SmoothSoundLevel is 0, making
  // them truly transparent when audio is silent.  This prevents opaque-black
  // artifacts from covering the main blade.

  // preon_glow: entire blade glows uniformly, brightness follows preon sound
  // volume.  All LEDs get the same brightness = SmoothSoundLevel.
  // Loud preon sound = bright blade, quiet = dim, silence = transparent.
  { "preon_glow",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<1>>,\
              AlphaL<RgbArg<1, Blue>, SmoothSoundLevel>,\
              TrDelayX<WavLen<EFFECT_PREON>>>,
      EFFECT_PREON>>(),
    "Preon glow: color. Brightness follows preon sound volume, duration matches preon sound file"
  },
  // preon_wipe: color sweeps hilt→tip over the preon sound duration.
  // A directional "preview" of the blade path before the main ignition.
  { "preon_wipe",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrWipeX<WavLen<EFFECT_PREON>>,\
              RgbArg<1, Green>,\
              TrFadeX<Int<50>>>,
      EFFECT_PREON>>(),
    "Preon wipe: color. Wipes hilt-to-tip over preon sound duration"
  },
  // preon_sputter: blade LENGTH extends from hilt proportional to preon
  // sound volume.  IsLessThan<RampF, SmoothSoundLevel> lights each LED only
  // when its position (0=hilt, 32768=tip) is below the audio envelope level.
  // Loud = long blade, quiet = short, silence = no blade.
  { "preon_sputter",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<1>>,\
              AlphaL<RgbArg<1, Blue>,\
                     IsLessThan<RampF, SmoothSoundLevel>>,\
              TrDelayX<WavLen<EFFECT_PREON>>>,
      EFFECT_PREON>>(),
    "Preon sputter: color. Blade length follows preon sound volume, duration matches preon sound file"
  },
  // postoff_glow: entire blade glows uniformly after retraction, brightness
  // follows postoff sound volume.  Naturally fades as the postoff sound ends.
  { "postoff_glow",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<1>>,\
              AlphaL<RgbArg<1, Red>, SmoothSoundLevel>,\
              TrDelayX<WavLen<EFFECT_POSTOFF>>>,
      EFFECT_POSTOFF>>(),
    "Postoff glow: color. Brightness follows postoff sound volume, duration matches postoff sound file"
  },
  // postoff_wipe: color wipes tip→hilt over the postoff sound duration.
  // A "draining" retraction effect after the main blade has already retracted.
  { "postoff_wipe",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<100>>,\
              RgbArg<1, White>,\
              TrWipeInX<WavLen<EFFECT_POSTOFF>>>,
      EFFECT_POSTOFF>>(),
    "Postoff wipe: color. Wipes tip-to-hilt over postoff sound duration"
  },
  // postoff_sputter: blade LENGTH extends from hilt proportional to postoff
  // sound volume after retraction.  Same audio-reactive mechanism as
  // preon_sputter but for EFFECT_POSTOFF.
  { "postoff_sputter",
    StylePtr<TransitionEffectConfigL<
      TrConcat<TrFadeX<Int<1>>,\
              AlphaL<RgbArg<1, Red>,\
                     IsLessThan<RampF, SmoothSoundLevel>>,\
              TrDelayX<WavLen<EFFECT_POSTOFF>>>,
      EFFECT_POSTOFF>>(),
    "Postoff sputter: color. Blade length follows postoff sound volume, duration matches postoff sound file"
  },
#endif
  { "config", &config_style_factory,
    "Config-driven style: config <name> uses [name] from config/blade_styles.ini. Optional per layer: blend keyword (normal multiply screen add), then optional opacity <0-32768>, then sub-style. Example: layer = multiply opacity 16000 strobe black white 15 1 300 800",
  },
  { "builtin", &builtin_preset_allocator,
    // TODO: Support multiple argument templates.
    "builtin preset styles, "
    "preset number, blade number, "
    "base color, alt color, style option, "
    "ignition option, ignition time, ignition delay, ignition color, ignition power up, "
    "blast color, clash color, lockup color, lockup position, drag color, drag size, lb color, "
    "stab color, melt size, swing color, swing option, emitter color, emitter size, "
    "preon color, preon option, preon size, "
    "retraction option, retraction time, retraction delay, retraction color, retract cooldown, "
    "postoff color, off color, off option, "
    "2nd alt color, 3rd alt color, "
    "2nd style option, 3rd alt option, "
    "ignition bend option, retraction bend option"
  },
};

class StyleParser : public CommandParser {
public:

  NamedStyle* FindStyle(const char *name) {
    if (!name) return nullptr;
    for (size_t i = 0; i < NELEM(named_styles); i++) {
      if (FirstWord(name, named_styles[i].name)) {
        return named_styles + i;
      }
    }
    return nullptr;
  }

  BladeStyle* Parse(const char* str) {
    if (!str || !str[0]) return nullptr;
    NamedStyle* style = FindStyle(str);
    if (!style) return nullptr;
    ArgParserInterface* saved = CurrentArgParser;
    ArgParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    BladeStyle* ret = style->style_allocator->make();
    CurrentArgParser = saved;
    return ret;
  }

  // Returns true if the listed style references the specified argument.
  bool UsesArgument(const char* str, int argument) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    if (argument == 0) return true;
    ArgParserInterface* saved = CurrentArgParser;
    char unused_output[32];
    GetArgParser ap(SkipWord(str), argument, unused_output, sizeof(unused_output));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    bool result = ap.next();
    CurrentArgParser = saved;
    return result;
  }

  bool GetBuiltinPos(const char* str, int* preset, int* blade) {
    *preset = -1;
    *blade = -1;
    if (!FirstWord(str, "builtin")) return false;
    ArgParser ap(SkipWord(str));
    *preset = strtol(ap.GetArg(1, "", ""), nullptr, 10);
    *blade = strtol(ap.GetArg(2, "", ""), nullptr, 10);
    return *preset >= 0 && *blade >= 1;
  }

  // Returns the maximum argument used.
  int MaxUsedArgument(const char* str) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    ArgParserInterface* saved = CurrentArgParser;
    GetMaxArgParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.max_arg() <= 2) return 0;
    return ap.max_arg();
  }

  // Returns the number of used arguments.
  int UsedArguments(const char* str) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    ArgParserInterface* saved = CurrentArgParser;
    GetUsedArgsParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.used() <= 2) return 0;
    return ap.used();
  }

  // Returns the next used argument.
  int NextUsedArguments(const char* str, int arg) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    ArgParserInterface* saved = CurrentArgParser;
    GetUsedArgsParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.used() <= 2) return 0;
    return ap.next(arg);
  }

  // Returns the previous used argument.
  int PrevUsedArguments(const char* str, int arg) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    ArgParserInterface* saved = CurrentArgParser;
    GetUsedArgsParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.used() <= 2) return 0;
    return ap.prev(arg);
  }

  // Returns Nth used argument.
  int GetNthUsedArguments(const char* str, int arg) {
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    ArgParserInterface* saved = CurrentArgParser;
    GetUsedArgsParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.used() <= 2) return 0;
    return ap.nth(arg);
  }

  // Returns the ArgInfo for this style.
  ArgInfo GetArgInfo(const char* str) {
    NamedStyle* style = FindStyle(str);
    if (!style) return ArgInfo();
    ArgParserInterface* saved = CurrentArgParser;
    GetUsedArgsParser ap(SkipWord(str));
    CurrentArgParser = &ap;
    delete style->style_allocator->make();
    CurrentArgParser = saved;
    if (FirstWord(str, "builtin") && ap.used() <= 2) return ArgInfo();
    return ap.getArgInfo();
  }

  // Get the Nth argument of a style string.
  // The output will be copied to |output| (at most output_max - 1 chars + NUL).
  // If the string itself doesn't contain that argument, the style
  // will be parsed, and it's default argument will be returned.
  bool GetArgument(const char* str, int argument, char* output, size_t output_max) {
    if (!output || output_max == 0) return false;
    if (!str) {
      *output = '\0';
      return false;
    }
    NamedStyle* style = FindStyle(str);
    if (!style) return false;
    if (argument >= 0) {
      ArgParserInterface* saved = CurrentArgParser;
      GetArgParser ap(SkipWord(str), argument, output, output_max);
      CurrentArgParser = &ap;
      delete style->style_allocator->make();
      CurrentArgParser = saved;
      if (ap.next()) return true;
    }
    if (argument >= CountWords(str)) {
      *output = 0;
      return false;
    }
    while (argument > 0) {
      str = SkipWord(str);
      argument--;
    }
    str = SkipSpace(str);
    const char* tmp = SkipWord(str);
    StyleParserCopyArgBounded(output, output_max, str, tmp);
    if (!strcmp(output, "~")) {
      *output = 0;
      return false;
    }
    return true;
  }

  // Replace the Nth argument of a style string with a new value and return
  // the new style string. Missing arguments will be replaced with default
  // values. Result is capped at 511 characters + NUL (same as buffer size).
  LSPtr<char> SetArgument(const char* str, int argument, const char* new_value) {
    char ret[512];
    const size_t cap = sizeof(ret);
    ret[0] = '\0';
    if (!str) return LSPtr<char>(mkstr(ret));
    if (!new_value) new_value = "";
    int cw = CountWords(str);
    int output_args = cw;
    if (argument >= 0 && argument < INT_MAX) {
      int na = argument + 1;
      if (na > output_args) output_args = na;
    }
    if (output_args < 0) output_args = 0;
    if (output_args > 512) output_args = 512;
    for (int i = 0; i < output_args; i++) {
      size_t len = strlen(ret);
      if (len >= cap - 1) break;
      size_t rem = cap - len;
      if (i) {
        if (rem <= 1) break;
        snprintf(ret + len, rem, " ");
      }
      len = strlen(ret);
      if (len >= cap - 1) break;
      rem = cap - len;
      if (rem == 0) break;
      if (i == argument) {
        snprintf(ret + len, rem, "%s", new_value);
      } else {
        if (!GetArgument(str, i, ret + len, rem)) {
          snprintf(ret + len, rem, "~");
        }
      }
    }
    return LSPtr<char>(mkstr(ret));
  }

  // Returns the length of the style identifier.
  // The style identifier might be a single word, or it
  // can be "builtin X Y" where X and Y are numbers.
  static int StyleIdentifierLength(const char* str) {
    const char* end = SkipWord(str);
    if (FirstWord(str, "builtin")) {
      end = SkipWord(SkipWord(end));
    }
    return end - str;
  }

  // Truncates all arguments and just returns the style identifier.
  LSPtr<char> ResetArguments(const char* str) {
    if (!str) {
      char empty[1] = { '\0' };
      return LSPtr<char>(mkstr(StringPiece(empty)));
    }
    int len = StyleIdentifierLength(str);
    if (len < 0) len = 0;
    char* ret = (char*) malloc((size_t)len + 1);
    if (ret) {
      memcpy(ret, str, (size_t)len);
      ret[len] = 0;
    }
    return LSPtr<char>(ret);
  }

  // Takes the style identifier "builtin X Y" from |to| and the
  // arguments from |from| and puts them together into one string.
  LSPtr<char> CopyArguments(const char* from, const char* to) {
    if (!from || !to) {
      char empty[1] = { '\0' };
      return LSPtr<char>(mkstr(StringPiece(empty)));
    }
    int from_style_length = StyleIdentifierLength(from);
    int to_style_length = StyleIdentifierLength(to);
    size_t slen = strlen(from);
    int len = (int)slen - from_style_length + to_style_length;
    if (len < 0) len = 0;
    char* ret = (char*) malloc((size_t)len + 1);
    if (ret) {
      memcpy(ret, to, to_style_length);
      ret[to_style_length] = 0;
      strcat(ret, from + from_style_length);
    }
    return LSPtr<char>(ret);
  }

  struct ArgumentHelper {
    const char* str;
    int parts[3];
    ArgumentHelper(const char*str_, int n) : str(str_) {
      parts[0]= StyleIdentifierLength(str);
      const char* tmp = str + parts[0];
      for (int i = 0; i < n; i++) {
        tmp = SkipWord(tmp);
      }
      parts[1] = tmp - str;
      parts[2] = strlen(str);
    }

    int partlen(int part) {
      if (part == 0) return parts[0];
      return parts[part] - parts[part - 1];
    }

    const char* partptr(int part) {
      if (part == 0) return str;
      return str + parts[part - 1];
    }

    void AppendPart(int part, char** to) {
      int l = partlen(part);
      memcpy(*to, partptr(part), l);
      (*to) += l;
      **to = 0;
    }
  };

  // Takes the style identifier "builtin X Y" from |to| and the
  // arguments from |from| and puts them together into one string.
  // Arguments after |keep_arguments_after| are also taken from |to|.
  LSPtr<char> CopyArguments(const char* from, const char* to, int keep_arguments_after) {
    ArgumentHelper from_helper(from, keep_arguments_after);
    ArgumentHelper to_helper(to, keep_arguments_after);
    char* ret = (char*) malloc(from_helper.partlen(0) + to_helper.partlen(1) + from_helper.partlen(2) + 1);
    if (ret) {
      char* tmp = ret;
      to_helper.AppendPart(0, &tmp);
      from_helper.AppendPart(1, &tmp);
      to_helper.AppendPart(2, &tmp);
    }
    return LSPtr<char>(ret);
  }

  struct ArgumentIterator {
    const char* start;
    const char* end;
    ArgumentIterator(const char* str_) : start(str_) {
      end = str_ + StyleIdentifierLength(str_);
    }

    void next() {
      start = end;
      end = SkipWord(end);
    }

    operator bool() const { return end > start; }
    bool contains(char c) { return StringPiece(start, end).contains(c); }

    int len() const {
      if (end == start) return 2;
      return end - start;
    }

    void append(char** to) const {
      int l = len();
      memcpy(*to, end == start ? " ~" : start, l);
      (*to) += l;
      **to = 0;
    }
  };

  static bool keep(int arg, const int* arguments_to_keep, size_t arguments_to_keep_len) {
    if (arg == 0) return true;
    for (size_t x = 0; x < arguments_to_keep_len; x++)
      if (arguments_to_keep[x] == arg)
        return true;
    return false;
  }

  // Takes the style identifier "builtin X Y" from |to| and the
  // arguments from |from| and puts them together into one string.
  // Arguments listed in |arguments_to_keep| are also taken from the |from| string.
  LSPtr<char> CopyArguments(const char* from, const char* to, const int* arguments_to_keep, size_t arguments_to_keep_len) {
    int len = 0;
    {
      ArgumentIterator FROM(from);
      ArgumentIterator TO(to);
      for (int arg = 0; FROM || TO; arg++, FROM.next(), TO.next()) {
        if (keep(arg, arguments_to_keep, arguments_to_keep_len)) {
          len += TO.len();
        } else {
          len += FROM.len();
        }
      }
    }
    char* ret = (char*) malloc(len + 1);
    if (ret) {
      char* tmp = ret;
      ArgumentIterator FROM(from);
      ArgumentIterator TO(to);
      for (int arg = 0; FROM || TO; arg++, FROM.next(), TO.next()) {
        if (keep(arg, arguments_to_keep, arguments_to_keep_len)) {
          TO.append(&tmp);
        } else {
          FROM.append(&tmp);
        }
      }
    }
    // STDOUT << "CopyArguments(from=" << from << " to=" << to << ") = " << ret << "\n";
#if defined(DEBUG)
    if (strlen(ret) != len) {
      STDOUT << "FATAL ERROR IN COPYARGUMENTS: len = " << len << " strlen = " << strlen(ret) << "\n";
    }
#endif
    return LSPtr<char>(ret);
  }

  // Takes the style identifier "builtin X Y" and all numeric arguments from |to|
  // and all color arguments from |from| and puts them together into one string.
  LSPtr<char> CopyColorArguments(const char* from, const char* to) {
    int len = 0;
    {
      ArgumentIterator FROM(from);
      ArgumentIterator TO(to);
      for (int arg = 0; FROM || TO; arg++, FROM.next(), TO.next()) {
        if (FROM.contains(',') || TO.contains(',')) {
          len += FROM.len();
        } else {
          len += TO.len();
        }
      }
    }
    char* ret = (char*) malloc(len + 1);
    if (ret) {
      char* tmp = ret;
      ArgumentIterator FROM(from);
      ArgumentIterator TO(to);
      for (int arg = 0; FROM || TO; arg++, FROM.next(), TO.next()) {
        if (FROM.contains(',') || TO.contains(',')) {
          FROM.append(&tmp);
        } else {
          TO.append(&tmp);
        }
      }
    }
    // STDOUT << "CopyArguments(from=" << from << " to=" << to << ") = " << ret << "\n";
#if defined(DEBUG)
    if (strlen(ret) != len) {
      STDOUT << "FATAL ERROR IN COPYCOLORARGUMENTS: len = " << len << " strlen = " << strlen(ret) << "\n";
    }
#endif
    return LSPtr<char>(ret);
  }

  bool Parse(const char *cmd, const char* arg) override {
    if (!strcmp(cmd, "list_named_styles")) {
      // Just print one per line.
      // Skip the last one (builtin)
      for (size_t i = 0; i < NELEM(named_styles) - 1; i++) {
        STDOUT.println(named_styles[i].name);
      }
      for (size_t i = 0; i < GetNumPresets(); i++) {
        for (size_t j = 1; j <= NUM_BLADES; j++) {
          STDOUT << "builtin " << i << " " << j << "\n";
        }
      }
      return true;
    }

    if (!strcmp("describe_named_style", cmd)) {
      if (NamedStyle* style = FindStyle(arg)) {
        STDOUT.println(style->description);
        ArgParserInterface* saved = CurrentArgParser;
        ArgParserPrinter arg_parser_printer(SkipWord(arg));
        CurrentArgParser = &arg_parser_printer;
        do {
          BladeStyle* tmp = style->style_allocator->make();
          delete tmp;
        } while (arg_parser_printer.next());
        CurrentArgParser = saved;
      }
      return true;
    }

    return false;
  }
};

StyleParser style_parser;

inline BladeStyle* ParseStyleStringForConfig(const char* str) {
  if (!str) return nullptr;
  return style_parser.Parse(str);
}

#endif  // STYLES_STYLE_PARSER_H
