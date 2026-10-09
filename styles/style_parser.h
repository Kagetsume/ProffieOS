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
#include "../common/help_text.h"
#include "../functions/int_arg.h"
#include "legacy_styles.h"
#include "responsive_styles.h"
#include "brown_noise_flicker.h"
#include "sparkle.h"
#include "strobe.h"
#include "on_spark.h"
#include "lockup.h"
#include "audio_flicker.h"
#include "alpha.h"

// Classic named-style "unstable" idle (Kylo crackle) — composable as unstable_layer.
template<class WARM, class WARMER, class HOT, class SPARKS>
using ClassicUnstableIdleBase = BrownNoiseFlicker<
  Strobe<WARM, Sparkle<HOT, SPARKS, 100, 1024>, 100, 50>,
  Strobe<WARMER, WARM, 50, 5>,
  100>;

template<class WARMER>
using ClassicUnstableLockupIdle = BrownNoiseFlicker<
  Strobe<Black, Yellow, 50, 1>,
  Strobe<WARMER, Black, 50, 1>,
  50>;

template<class WARMER, class SPARK, class SPARK_MS>
using ClassicUnstableLockupLayerColor = AudioFlicker<
  OnSparkX<ClassicUnstableLockupIdle<WARMER>, SPARK, SPARK_MS>,
  SPARK>;

class NamedStyle {
public:
  const char* name;
  StyleAllocator style_allocator;
#ifdef ENABLE_CONFIG_FILE_HELP_TEXT
  const char* description;
#endif
};

class BuiltinPresetAllocator : public StyleFactory {
public:
  BladeStyle* make() override {
#if NUM_BLADES == 0
    return nullptr;
#else
    // "builtin P B" uses compiled ROM preset P, blade style B (current_config->presets).
    // When SD overrides the preset *list*, GetNumPresets() is the SD count — do not use it here.
    if (!CurrentArgParser) return nullptr;
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

#ifdef ENABLE_SD_CONFIG_FILES
#include "composition/sd_style_catalog.h"
#endif

NamedStyle named_styles[] = {
#ifndef DISABLE_BASIC_PARSER_STYLES
  { "standard", StyleNormalPtrX<RgbArg<1, CYAN>, RgbArg<2, WHITE>, IntArg<3, 300>, IntArg<4, 800>, RgbArg<5, WHITE>, RgbArg<6, WHITE>>(),
    NAMED_STYLE_DESC(    "Standard blade: base_color clash_color extend_ms retract_ms lockup_color blast_color. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
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
        InOutFuncAuto<IntArg<9, 300>, IntArg<10, 800> >,
        RgbArg<11, White>
      >
    >(),
    NAMED_STYLE_DESC(    "Advanced blade, color at hilt, middle color, tip color, onspark color, onspark time, blast color, lockup color, clash color, extension time, retraction time, spark tip color. "
    "Use -1 for extension/retraction time to match the ignition/retraction sound length.")
  },
  { "fire",
    StyleFirePtr<RgbArg<1, RED>, RgbArg<2, YELLOW>>(),
    NAMED_STYLE_DESC(    "Fire blade, warm color, hot color")
  },
  { "unstable",
    StylePtr<InOutHelperX<LocalizedClash<Lockup<Blast<OnSpark<
        ClassicUnstableIdleBase<RgbArg<1, Rgb<150, 0, 0>>, RgbArg<2, Red>, RgbArg<3, Rgb<255,40,0>>, RgbArg<4, Rgb<255,255,10>>>,
        White, 100>, White, 200, 100, 400>,
      AudioFlicker<OnSpark<ClassicUnstableLockupIdle<RgbArg<2, Red>>, White, 200>, White>,
      AudioFlicker<OnSpark<ClassicUnstableLockupIdle<RgbArg<2, Red>>, White, 200>, White>>,
    White, 60, 100>, InOutFuncAuto<IntArg<5, 100>, IntArg<6, 200>>, Black>>(),
    NAMED_STYLE_DESC(    "Unstable blade, warm, warmer, hot, sparks, extension time, retraction time. "
    "Use -1 for extension/retraction time to match the ignition/retraction sound length.")
  },
  { "strobe",
    StyleNormalPtrX<StrobeX<RgbArg<1, BLACK>, RgbArg<2, WHITE>, IntArg<3, 15>, IntArg<4, 1>>, Rainbow, IntArg<5, 300>, IntArg<6, 800>>(),
    NAMED_STYLE_DESC(    "Stroboscope, standby color, flash color, flash frequency, flash milliseconds, extension time, retraction time")
  },
  { "cycle",
    StylePtr<ColorCycle<RgbArg<1, Blue>,0,1,Layers<
        AudioFlicker<RgbArg<3, Cyan>, RgbArg<2, Blue>>,
        BlastL<RgbArg<4, Rgb<255,50,50>>>,
        LockupL<HumpFlicker<RgbArg<5, Red>, RgbArg<3, Cyan>,100>>,
        SimpleClashL<White>>,
      100,2000,1000>>(),
    NAMED_STYLE_DESC(    "Cycle blade, start color, base color, flicker color, blast color, lockup color")
  },
  { "rainbow", StyleRainbowPtrX<IntArg<1, 300>, IntArg<2, 800>, RgbArg<3, WHITE>, RgbArg<4, WHITE>>(),
    NAMED_STYLE_DESC(    "Rainbow blade: extend_ms retract_ms clash_color lockup_color. "
    "Use -1 for extend_ms or retract_ms to match the ignition/retraction sound length.")
  },
  { "charging", &style_charging,
    NAMED_STYLE_DESC("Charging style")
  },
#ifdef ENABLE_SD_CONFIG_FILES
#include "composition/sd_named_styles.h"
#endif
#endif  // DISABLE_BASIC_PARSER_STYLES
#ifdef ENABLE_SD_CONFIG_FILES
  { "config", &config_style_factory,
    NAMED_STYLE_DESC(    "Config-driven style: config <name> uses [name] from config/blade_styles.ini. Optional per layer: blend keyword (normal multiply screen add), then optional opacity (55%, 55, or raw >100 up to 32768; 100 = full), then sub-style. Example: layer = multiply opacity 49% strobe black white 15 1 300 800")
  },
#endif
  { "builtin", &builtin_preset_allocator,
    // TODO: Support multiple argument templates.
    NAMED_STYLE_DESC(    "builtin preset styles, "
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
    "ignition bend option, retraction bend option")
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

#ifdef ENABLE_CONFIG_FILE_HELP_TEXT
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
#endif

    return false;
  }
};

StyleParser style_parser;

inline BladeStyle* ParseStyleStringForConfig(const char* str) {
  if (!str) return nullptr;
  return style_parser.Parse(str);
}

#endif  // STYLES_STYLE_PARSER_H
