#ifndef STYLES_SD_STYLE_CATALOG_H
#define STYLES_SD_STYLE_CATALOG_H

// SD-config layer parser and named-style factories.
// Included from styles/style_parser.h only when ENABLE_SD_CONFIG_FILES is set.
// Stock includes (legacy_styles, lockup, audio_flicker, ...) are already in scope.

#include "../../common/sd_config.h"
#include "../../common/style_config_file.h"
#include "../../common/opacity_scale.h"
#include "parse_color_arg.h"
#include "config_layers_style.h"
#include "pixel_sequencer.h"
#include "strip_column.h"
#include "accent_blink.h"
#include "texture_layers.h"
#include "real_clash.h"
#include "thunder_loop.h"
#include "responsive_flame.h"
#include "shimmer_blade.h"
#include "rotoscope.h"
#include "pulse_stripes.h"
#include "kinetic_charge.h"
#include "rotating_pulse.h"
#include "trickle_blade.h"
#include "bend_inout.h"
#include "os7_monolith_factories.h"
#include "ignition_effects.h"
#include "transition_config_shared.h"

// >0 while a config section is parsing a layer. solid / solid_bend return a
// plain color in that case. Top-level style = solid (depth 0) wraps the mask.
static int config_layer_parse_depth_ = 0;

// Parse one expanded layer = string (blend, optional opacity, sub-style). Returns false to skip the layer.
inline bool TryParseConfigLayerLine(const char* layer_line,
                                    BladeStyle** out_style,
                                    uint16_t* out_alpha,
                                    uint8_t* out_blend) {
  if (!layer_line || !layer_line[0] || !out_style) return false;
  uint16_t alpha = CONFIG_LAYER_ALPHA_OPAQUE;
  uint8_t blend = CONFIG_LAYER_BLEND_NORMAL;
  const char* p = layer_line;
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
  } else if (FirstWord(p, "hue")) {
    blend = CONFIG_LAYER_BLEND_HUE;
    p = SkipWord(p);
  }
  const char* parse_from = p;
  if (FirstWord(p, "opacity")) {
    ArgParser ap(SkipWord(p));
    const char* av = ap.GetArg(1, "", "");
    if (!av || !av[0] || !OpacityScaleTokenParses(av)) return false;
    alpha = (uint16_t)ParseOpacityScaleToken(av);
    parse_from = ap.GetArg(2, "", "");
    if (!parse_from || !parse_from[0]) return false;
  }
  config_layer_parse_depth_++;
  BladeStyle* s = ParseStyleStringForConfig(parse_from);
  config_layer_parse_depth_--;
  if (!s) return false;
  *out_style = s;
  if (out_alpha) *out_alpha = alpha;
  if (out_blend) *out_blend = blend;
  return true;
}

// Style text after an optional blend keyword and opacity token.
inline const char* ConfigLayerStyleText(const char* layer_line) {
  if (!layer_line) return layer_line;
  const char* p = layer_line;
  if (FirstWord(p, "multiply") || FirstWord(p, "screen") || FirstWord(p, "add") ||
      FirstWord(p, "normal") || FirstWord(p, "hue")) {
    p = SkipWord(p);
  }
  if (FirstWord(p, "opacity")) {
    p = SkipWord(p);
    p = SkipWord(p);
  }
  return p;
}

inline bool ConfigLayerNameStartsWith(const char* style_text, const char* prefix) {
  if (!style_text || !prefix) return false;
  while (*style_text == ' ' || *style_text == '\t') style_text++;
  while (*prefix) {
    if (*style_text != *prefix) return false;
    style_text++;
    prefix++;
  }
  return true;
}

// Drawn after the shared wipe: they paint while the blade is off or past the lit tip.
inline bool ConfigLayerDrawsPastInOut(const char* layer_line) {
  const char* p = ConfigLayerStyleText(layer_line);
  if (!p || !p[0]) return false;
  if (ConfigLayerNameStartsWith(p, "preon_")) return true;
  if (ConfigLayerNameStartsWith(p, "postoff_")) return true;
  if (FirstWord(p, "ignition_flash")) return true;
  if (FirstWord(p, "sparktip_layer")) return true;
  return false;
}

inline int ConfigParseMsToken(const char* s, int fallback) {
  if (!s || !s[0]) return fallback;
  char* end = nullptr;
  long v = strtol(s, &end, 10);
  if (end == s) return fallback;
  return (int)v;
}

// `transition = <behavior> <extend_ms> <retract_ms> [spark] [color] [hilt|tip]` sets both phases.
// `transition_in` / `transition_out` are one phase: `<behavior> <ms> [spark] [color] [hilt|tip]`.
// tip (default) retracts tip→hilt. hilt mirrors that same wipe so retract runs hilt→tip.
// sparktip, split, and explode read an optional spark color (default white). Unknown names use bend.
inline bool ConfigParseWipeDirection(const char* token, bool* from_hilt) {
  if (!token || !token[0] || !from_hilt) return false;
  if (FirstWord(token, "hilt") || FirstWord(token, "hilt_to_tip")) {
    *from_hilt = true;
    return true;
  }
  if (FirstWord(token, "tip") || FirstWord(token, "tip_to_hilt")) {
    *from_hilt = false;
    return true;
  }
  return false;
}

inline void ConfigParseTransitionSpec(const char* spec, uint8_t* curve, int* extend_ms,
                                     int* retract_ms, Color16* spark, bool* from_hilt,
                                     bool one_phase = false, int default_ms = 300,
                                     char* bmp_path = nullptr, size_t bmp_path_max = 0,
                                     int* bmp_height = nullptr) {
  if (curve) *curve = CONFIG_INOUT_BEND;
  if (extend_ms) *extend_ms = 300;
  if (retract_ms) *retract_ms = 800;
  if (spark) *spark = ParseColorArg("white");
  if (from_hilt) *from_hilt = false;
  if (!spec || !curve || !extend_ms || !retract_ms) return;
  const char* p = spec;
  while (*p == ' ' || *p == '\t') p++;
  if (!*p) return;
  const char* times = p;
  if (FirstWord(p, "linear") || FirstWord(p, "in_out") || FirstWord(p, "inout")) {
    *curve = CONFIG_INOUT_LINEAR;
    times = SkipWord(p);
  } else if (FirstWord(p, "sparktip")) {
    *curve = CONFIG_INOUT_SPARKTIP;
    times = SkipWord(p);
  } else if (FirstWord(p, "split_spark") || FirstWord(p, "middle_spark")) {
    *curve = CONFIG_INOUT_SPLIT_SPARK;
    times = SkipWord(p);
  } else if (FirstWord(p, "split") || FirstWord(p, "middle")) {
    *curve = CONFIG_INOUT_SPLIT;
    times = SkipWord(p);
  } else if (FirstWord(p, "explode_spark") || FirstWord(p, "inverse_spark")) {
    *curve = CONFIG_INOUT_EXPLODE_SPARK;
    times = SkipWord(p);
  } else if (FirstWord(p, "explode") || FirstWord(p, "inverse")) {
    *curve = CONFIG_INOUT_EXPLODE;
    times = SkipWord(p);
  } else if (FirstWord(p, "sputter")) {
    *curve = CONFIG_INOUT_SPUTTER;
    times = SkipWord(p);
  } else if (FirstWord(p, "bmp") || FirstWord(p, "bitmap")) {
    *curve = CONFIG_INOUT_BMP;
    times = SkipWord(p);
  } else if (FirstWord(p, "spark")) {
    *curve = CONFIG_INOUT_SPARK;
    times = SkipWord(p);
  } else if (FirstWord(p, "bend")) {
    *curve = CONFIG_INOUT_BEND;
    times = SkipWord(p);
  } else {
    *curve = CONFIG_INOUT_BEND;
  }
  if (*curve == CONFIG_INOUT_BMP) {
    if (bmp_path && bmp_path_max > 0) bmp_path[0] = 0;
    if (bmp_height) *bmp_height = 0;
    const char* tok = times;
    while (*tok == ' ' || *tok == '\t') tok++;
    const char* tok_end = SkipWord(tok);
    if (bmp_path && bmp_path_max > 0 && tok_end > tok) {
      size_t n = (size_t)(tok_end - tok);
      if (n >= bmp_path_max) n = bmp_path_max - 1;
      memcpy(bmp_path, tok, n);
      bmp_path[n] = 0;
    }
    int nums[3];
    int nc = 0;
    const char* rest = tok_end;
    while (nc < 3 && rest && *rest) {
      while (*rest == ' ' || *rest == '\t') rest++;
      if (!*rest) break;
      const char* end = SkipWord(rest);
      bool digits = false;
      const char* q = rest;
      if (*q == '-' || *q == '+') q++;
      if (q < end) {
        digits = true;
        for (; q < end; q++) {
          if (*q < '0' || *q > '9') digits = false;
        }
      }
      if (digits) nums[nc++] = ConfigParseMsToken(rest, 0);
      rest = end;
    }
    if (one_phase) {
      if (nc >= 2) {
        if (bmp_height) *bmp_height = nums[0];
        *extend_ms = *retract_ms = nums[1];
      } else if (nc == 1) {
        *extend_ms = *retract_ms = nums[0];
      }
    } else if (nc >= 3) {
      if (bmp_height) *bmp_height = nums[0];
      *extend_ms = nums[1];
      *retract_ms = nums[2];
    } else if (nc == 2) {
      *extend_ms = nums[0];
      *retract_ms = nums[1];
    } else if (nc == 1) {
      *extend_ms = nums[0];
    }
    return;
  }
  ArgParser ap(times);
  int extra_base = 3;
  if (one_phase) {
    const char* a1 = ap.GetArg(1, "", "");
    bool timed = a1 && a1[0] && (a1[0] == '-' || (a1[0] >= '0' && a1[0] <= '9'));
    int ms = timed ? ConfigParseMsToken(a1, default_ms) : default_ms;
    *extend_ms = ms;
    *retract_ms = ms;
    extra_base = timed ? 2 : 1;
  } else {
    *extend_ms = ConfigParseMsToken(ap.GetArg(1, "", ""), 300);
    *retract_ms = ConfigParseMsToken(ap.GetArg(2, "", ""), 800);
  }
  const char* extra3 = ap.GetArg(extra_base, "", "");
  const char* extra4 = ap.GetArg(extra_base + 1, "", "");
  bool dir = false;
  bool extra3_dir = ConfigParseWipeDirection(extra3, &dir);
  bool extra4_dir = ConfigParseWipeDirection(extra4, &dir);
  if ((extra3_dir || extra4_dir) && from_hilt) *from_hilt = dir;
  bool extra3_spark = extra3 && FirstWord(extra3, "spark");
  bool extra4_spark = extra4 && FirstWord(extra4, "spark");
  if ((extra3_spark || extra4_spark) && curve) {
    if (*curve == CONFIG_INOUT_SPLIT) *curve = CONFIG_INOUT_SPLIT_SPARK;
    else if (*curve == CONFIG_INOUT_EXPLODE) *curve = CONFIG_INOUT_EXPLODE_SPARK;
  }
  if (spark && curve &&
      (*curve == CONFIG_INOUT_SPARKTIP || *curve == CONFIG_INOUT_SPLIT_SPARK ||
       *curve == CONFIG_INOUT_EXPLODE_SPARK)) {
    const char* color = nullptr;
    if (extra3 && extra3[0] && !extra3_dir && !extra3_spark) color = extra3;
    else if (extra4 && extra4[0] && !extra4_dir && !extra4_spark) color = extra4;
    if (color && color[0]) *spark = ParseColorArg(color);
  }
}

// True when [start, end) is only an integer token (optional leading minus).
inline bool ConfigWordIsInteger(const char* start, const char* end) {
  if (!start || !end || start >= end) return false;
  char* parsed = nullptr;
  strtol(start, &parsed, 10);
  return parsed == end;
}

// Older smoke lines were "dark light extend_ms retract_ms [speed]".
// Drop that pair so a leftover 300 is not read as the roll speed.
inline void ConfigStripLegacySmokeInOut(char* line) {
  if (!line || !line[0]) return;
  char* p = line;
  if (FirstWord(p, "multiply") || FirstWord(p, "screen") || FirstWord(p, "add") ||
      FirstWord(p, "normal") || FirstWord(p, "hue")) {
    p = (char*)SkipWord(p);
  }
  if (FirstWord(p, "opacity")) {
    p = (char*)SkipWord(p);
    p = (char*)SkipWord(p);
  }
  if (!FirstWord(p, "smoke_flow") && !FirstWord(p, "smoke_up") && !FirstWord(p, "smoke_down")) return;
  p = (char*)SkipWord(p);
  p = (char*)SkipWord(p);
  p = (char*)SkipWord(p);
  while (*p == ' ' || *p == '\t') p++;
  if (!*p) return;
  const char* third_end = SkipWord(p);
  if (!ConfigWordIsInteger(p, third_end)) return;
  const char* fourth = third_end;
  while (*fourth == ' ' || *fourth == '\t') fourth++;
  if (!*fourth) return;
  const char* fourth_end = SkipWord(fourth);
  if (!ConfigWordIsInteger(fourth, fourth_end)) return;
  const char* rest = fourth_end;
  while (*rest == ' ' || *rest == '\t') rest++;
  memmove(p, rest, strlen(rest) + 1);
}

// First recognized base style supplies the stack wipe. Arg indexes match IntArg<>.
inline void ConfigBaseInOutFromLayerLine(const char* layer_line, uint8_t* curve,
                                        int* extend_ms, int* retract_ms) {
  if (curve) *curve = CONFIG_INOUT_NONE;
  if (extend_ms) *extend_ms = 300;
  if (retract_ms) *retract_ms = 800;
  const char* p = ConfigLayerStyleText(layer_line);
  if (!p || !p[0] || !curve || !extend_ms || !retract_ms) return;

  uint8_t found = CONFIG_INOUT_NONE;
  int ext_arg = 2;
  int ret_arg = 3;
  int ext_def = 300;
  int ret_def = 800;
  if (FirstWord(p, "solid") || FirstWord(p, "solid_bend")) {
    // Color only. The stack mask wipes them. Default curve is bend (solid_bend).
    found = CONFIG_INOUT_BEND;
    ext_arg = 2;
    ret_arg = 3;
  } else if (FirstWord(p, "standard_bend")) {
    found = CONFIG_INOUT_BEND;
    ext_arg = 3;
    ret_arg = 4;
  } else if (FirstWord(p, "pulse_blade")) {
    found = CONFIG_INOUT_LINEAR;
    ext_arg = 4;
    ret_arg = 5;
  } else if (FirstWord(p, "audio") || FirstWord(p, "cylon")) {
    found = CONFIG_INOUT_LINEAR;
    ext_arg = 5;
    ret_arg = 6;
  } else if (FirstWord(p, "gradient") || FirstWord(p, "flicker") || FirstWord(p, "sparkle_blade")) {
    found = CONFIG_INOUT_LINEAR;
    ext_arg = 6;
    ret_arg = 7;
  } else if (FirstWord(p, "kinetic_charge")) {
    found = CONFIG_INOUT_BEND;
    ext_arg = 4;
    ret_arg = 5;
  } else if (FirstWord(p, "water_flow") || FirstWord(p, "static_electricity") ||
             FirstWord(p, "power_wave") || FirstWord(p, "unstable_blades") ||
             FirstWord(p, "fallen_order") || FirstWord(p, "thunder_loop") ||
             FirstWord(p, "responsive_flame") || FirstWord(p, "shimmer_blade") ||
             FirstWord(p, "rotoscope") || FirstWord(p, "pulse_stripes") ||
             FirstWord(p, "rotating_pulse") || FirstWord(p, "trickle_blade")) {
    found = CONFIG_INOUT_BEND;
    ext_arg = 3;
    ret_arg = 4;
  } else if (FirstWord(p, "strip_column")) {
    found = CONFIG_INOUT_BEND;
    ArgParser ap(SkipWord(p));
    StripColumnBmpFrameAxis axis = STRIP_COLUMN_BMP_DEFAULT_FRAME_AXIS;
    const bool axis_in_arg4 = StripColumnParseFrameAxisToken(ap.GetArg(4, "", ""), &axis);
    ext_arg = axis_in_arg4 ? 5 : 4;
    ret_arg = axis_in_arg4 ? 6 : 5;
  }
  if (found == CONFIG_INOUT_NONE) return;
  ArgParser ap(SkipWord(p));
  *curve = found;
  *extend_ms = ConfigParseMsToken(ap.GetArg(ext_arg, "", ""), ext_def);
  *retract_ms = ConfigParseMsToken(ap.GetArg(ret_arg, "", ""), ret_def);
}

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
    // Static: ~6 KiB layer buffer must not live on stack (SetPreset call depth on L452).
    static char layers[STYLE_CONFIG_MAX_LAYERS][STYLE_CONFIG_LAYER_STR_LEN];
    int n = LoadStyleConfigLayers(name, layers, STYLE_CONFIG_MAX_LAYERS, ov_count, ov_keys, ov_vals);
    if (n <= 0) return nullptr;
    if (n > STYLE_CONFIG_MAX_LAYERS) n = STYLE_CONFIG_MAX_LAYERS;
    BladeStyle* sub[CONFIG_LAYERS_MAX];
    uint16_t layer_alpha[CONFIG_LAYERS_MAX];
    uint8_t layer_blend[CONFIG_LAYERS_MAX];
    uint8_t layer_past[CONFIG_LAYERS_MAX];
    Color16 white = ParseColorArg("white");
    uint8_t in_curve = CONFIG_INOUT_NONE;
    uint8_t out_curve = CONFIG_INOUT_NONE;
    int in_ms = 300;
    int out_ms = 800;
    Color16 in_spark = white;
    Color16 out_spark = white;
    bool in_hilt = false;
    bool out_hilt = false;
    uint8_t both_curve = CONFIG_INOUT_BEND;
    int both_ext = 300;
    int both_ret = 800;
    Color16 both_spark = white;
    bool both_hilt = false;
    uint8_t in_ov_curve = CONFIG_INOUT_BEND;
    int in_ov_ms = 300;
    Color16 in_ov_spark = white;
    bool in_ov_hilt = false;
    uint8_t out_ov_curve = CONFIG_INOUT_BEND;
    int out_ov_ms = 800;
    Color16 out_ov_spark = white;
    bool out_ov_hilt = false;
    bool saw_both = false;
    bool saw_in = false;
    bool saw_out = false;
    char both_bmp[96] = {0};
    char in_ov_bmp[96] = {0};
    char out_ov_bmp[96] = {0};
    char in_bmp[96] = {0};
    char out_bmp[96] = {0};
    int both_bh = 0;
    int in_ov_bh = 0;
    int out_ov_bh = 0;
    int in_bh = 0;
    int out_bh = 0;
    uint8_t det_curve = CONFIG_INOUT_NONE;
    int det_ext = 300;
    int det_ret = 800;
    bool detected = false;
    int count = 0;
    for (int i = 0; i < n && i < STYLE_CONFIG_MAX_LAYERS && count < CONFIG_LAYERS_MAX; i++) {
      if (!layers[i][0]) continue;
      if (!strncmp(layers[i], "@transition_in ", 15)) {
        ConfigParseTransitionSpec(layers[i] + 15, &in_ov_curve, &in_ov_ms, &in_ov_ms,
                                 &in_ov_spark, &in_ov_hilt, true, 300,
                                 in_ov_bmp, sizeof(in_ov_bmp), &in_ov_bh);
        saw_in = true;
        continue;
      }
      if (!strncmp(layers[i], "@transition_out ", 16)) {
        ConfigParseTransitionSpec(layers[i] + 16, &out_ov_curve, &out_ov_ms, &out_ov_ms,
                                 &out_ov_spark, &out_ov_hilt, true, 800,
                                 out_ov_bmp, sizeof(out_ov_bmp), &out_ov_bh);
        saw_out = true;
        continue;
      }
      if (!strncmp(layers[i], "@transition ", 12)) {
        ConfigParseTransitionSpec(layers[i] + 12, &both_curve, &both_ext, &both_ret,
                                 &both_spark, &both_hilt, false, 300,
                                 both_bmp, sizeof(both_bmp), &both_bh);
        saw_both = true;
        continue;
      }
      ConfigStripLegacySmokeInOut(layers[i]);
      BladeStyle* s = nullptr;
      uint16_t alpha = CONFIG_LAYER_ALPHA_OPAQUE;
      uint8_t blend = CONFIG_LAYER_BLEND_NORMAL;
      if (!TryParseConfigLayerLine(layers[i], &s, &alpha, &blend)) continue;
      sub[count] = s;
      layer_alpha[count] = alpha;
      layer_blend[count] = blend;
      layer_past[count] = ConfigLayerDrawsPastInOut(layers[i]) ? 1 : 0;
      if (!detected && !layer_past[count]) {
        uint8_t found = CONFIG_INOUT_NONE;
        int found_ext = 300;
        int found_ret = 800;
        ConfigBaseInOutFromLayerLine(layers[i], &found, &found_ext, &found_ret);
        if (found != CONFIG_INOUT_NONE) {
          detected = true;
          det_curve = found;
          det_ext = found_ext;
          det_ret = found_ret;
        }
      }
      count++;
    }
    if (saw_both) {
      in_curve = out_curve = both_curve;
      in_ms = both_ext;
      out_ms = both_ret;
      in_spark = out_spark = both_spark;
      in_hilt = out_hilt = both_hilt;
      strncpy(in_bmp, both_bmp, sizeof(in_bmp) - 1);
      strncpy(out_bmp, both_bmp, sizeof(out_bmp) - 1);
      in_bmp[sizeof(in_bmp) - 1] = 0;
      out_bmp[sizeof(out_bmp) - 1] = 0;
      in_bh = out_bh = both_bh;
    }
    if (saw_in) {
      in_curve = in_ov_curve;
      in_ms = in_ov_ms;
      in_spark = in_ov_spark;
      in_hilt = in_ov_hilt;
      strncpy(in_bmp, in_ov_bmp, sizeof(in_bmp) - 1);
      in_bmp[sizeof(in_bmp) - 1] = 0;
      in_bh = in_ov_bh;
    }
    if (saw_out) {
      out_curve = out_ov_curve;
      out_ms = out_ov_ms;
      out_spark = out_ov_spark;
      out_hilt = out_ov_hilt;
      strncpy(out_bmp, out_ov_bmp, sizeof(out_bmp) - 1);
      out_bmp[sizeof(out_bmp) - 1] = 0;
      out_bh = out_ov_bh;
    }
    if (!saw_both && !saw_in) {
      if (detected) {
        in_curve = det_curve;
        in_ms = det_ext;
      } else if (saw_out) {
        in_curve = CONFIG_INOUT_BEND;
        in_ms = 300;
      }
    }
    if (!saw_both && !saw_out) {
      if (detected) {
        out_curve = det_curve;
        out_ms = det_ret;
      } else if (saw_in) {
        out_curve = CONFIG_INOUT_BEND;
        out_ms = 800;
      }
    }
    if (count == 0) return nullptr;
    CurrentArgParser = outer_ap;
    if (CurrentArgParser) {
      // Shift section name plus every trailing preset override token (valid or not).
      int shift_words = 1;
      for (int ai = 2; ai < 32; ai++) {
        const char* kv = CurrentArgParser->GetArg(ai, "", "");
        if (!kv || !kv[0]) break;
        shift_words++;
      }
      CurrentArgParser->Shift(shift_words);
    }
    return new ConfigLayersStyle(sub, count, layer_alpha, layer_blend, layer_past,
                                in_curve, in_ms, out_ms, in_spark, in_hilt,
                                true, in_curve, in_ms, in_spark, in_hilt,
                                out_curve, out_ms, out_spark, out_hilt,
                                in_bmp, in_bh, out_bmp, out_bh);
  }
};

ConfigStyleFactory config_style_factory;

// Color only. Inside a config section the section's transition mask does the wipe.
// Top-level `style = solid` / `solid_bend` is a one-layer stack plus that mask.
class SolidColorStyleFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    BladeStyle* color = StylePtr<RgbArg<1, CYAN>>()->make();
    if (!color) return nullptr;
    if (config_layer_parse_depth_ > 0) return color;
    int ext = 300;
    int ret = 800;
    if (CurrentArgParser) {
      ext = ConfigParseMsToken(CurrentArgParser->GetArg(2, "", ""), 300);
      ret = ConfigParseMsToken(CurrentArgParser->GetArg(3, "", ""), 800);
    }
    BladeStyle* layers[1] = { color };
    uint8_t past[1] = { 0 };
    return new ConfigLayersStyle(layers, 1, nullptr, nullptr, past,
                                CONFIG_INOUT_BEND, ext, ret);
  }
};

SolidColorStyleFactory solid_color_style_factory;

// Column art only. Inside a config section the section transition mask wipes it.
// Top-level `style = strip_column` is a one-layer stack plus the default bend mask.
class ConfigStripColumnFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* path = CurrentArgParser->GetArg(1, "FILE", "");
    StripColumnPath::Set(path);
    const char* arg4 = CurrentArgParser->GetArg(4, "ARG", "");
    StripColumnBmpFrameAxis axis = STRIP_COLUMN_BMP_DEFAULT_FRAME_AXIS;
    const bool axis_in_arg4 = StripColumnParseFrameAxisToken(arg4, &axis);
    if (!axis_in_arg4) axis = STRIP_COLUMN_BMP_DEFAULT_FRAME_AXIS;
    StripColumnPath::SetFrameAxis(axis);
    BladeStyle* column = StylePtr<StripColumnL<IntArg<2, 144>, IntArg<3, 30>>>()->make();
    if (!column) return nullptr;
    if (config_layer_parse_depth_ > 0) return column;
    int ext = 300;
    int ret = 800;
    if (axis_in_arg4) {
      ext = ConfigParseMsToken(CurrentArgParser->GetArg(5, "", ""), 300);
      ret = ConfigParseMsToken(CurrentArgParser->GetArg(6, "", ""), 800);
    } else {
      ext = ConfigParseMsToken(CurrentArgParser->GetArg(4, "", ""), 300);
      ret = ConfigParseMsToken(CurrentArgParser->GetArg(5, "", ""), 800);
    }
    BladeStyle* layers[1] = { column };
    uint8_t past[1] = { 0 };
    return new ConfigLayersStyle(layers, 1, nullptr, nullptr, past,
                                CONFIG_INOUT_BEND, ext, ret);
  }
};

ConfigStripColumnFactory config_strip_column_factory;

// Clash/lockup/blast only. The stack transition mask is the wipe.
// Top-level `style = standard_bend` is that blade plus the mask.
// Stock `standard` keeps its own linear wipe.
class ConfigStandardStyleFactory : public StyleFactory {
public:
  explicit ConfigStandardStyleFactory(uint8_t curve) : curve_(curve) {}
  BladeStyle* make() override {
    using Inner = SimpleClash<
      Lockup<
        Blast<RgbArg<1, CYAN>, RgbArg<6, WHITE>>,
        AudioFlicker<RgbArg<1, CYAN>, RgbArg<5, WHITE>>
      >,
      RgbArg<2, WHITE>
    >;
    BladeStyle* core = StylePtr<Inner>()->make();
    if (!core) return nullptr;
    if (config_layer_parse_depth_ > 0) return core;
    int ext = 300;
    int ret = 800;
    if (CurrentArgParser) {
      ext = ConfigParseMsToken(CurrentArgParser->GetArg(3, "", ""), 300);
      ret = ConfigParseMsToken(CurrentArgParser->GetArg(4, "", ""), 800);
    }
    BladeStyle* layers[1] = { core };
    uint8_t past[1] = { 0 };
    return new ConfigLayersStyle(layers, 1, nullptr, nullptr, past, curve_, ext, ret);
  }
private:
  uint8_t curve_;
};

ConfigStandardStyleFactory standard_bend_style_factory(CONFIG_INOUT_BEND);

// OS7 idle plus clash/lockup/blast. The bend wipe lives on the section mask.
// Inside a config section this returns the blade only. Top-level use wraps the mask.
// EXT_ARG / RET_ARG match the IntArg<> indexes on the style line.
template<class IDLE_BASE, class CLASH_COLOR, int EXT_ARG, int RET_ARG>
class ConfigOs7MaskFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    BladeStyle* idle = Os7IdleBaseStyleFactory<IDLE_BASE>().make();
    if (!idle) return nullptr;
    DelegatingIdleBase::SetNextIdle(idle);
    using Inner = SimpleClash<
      Lockup<
        Blast<DelegatingIdleBase, CLASH_COLOR>,
        AudioFlicker<DelegatingIdleBase, White>
      >,
      CLASH_COLOR
    >;
    BladeStyle* core = StylePtr<Inner>()->make();
    if (DelegatingIdleBase::PeekNextIdle()) {
      delete idle;
      DelegatingIdleBase::ClearNextIdle();
      delete core;
      return nullptr;
    }
    if (!core) return nullptr;
    if (config_layer_parse_depth_ > 0) return core;
    int ext = 300;
    int ret = 800;
    if (CurrentArgParser) {
      ext = ConfigParseMsToken(CurrentArgParser->GetArg(EXT_ARG, "", ""), 300);
      ret = ConfigParseMsToken(CurrentArgParser->GetArg(RET_ARG, "", ""), 800);
    }
    BladeStyle* layers[1] = { core };
    uint8_t past[1] = { 0 };
    return new ConfigLayersStyle(layers, 1, nullptr, nullptr, past,
                                CONFIG_INOUT_BEND, ext, ret);
  }
};

ConfigOs7MaskFactory<WaterFlowOs7Base, RgbArg<2, White>, 3, 4> config_water_flow_factory;
ConfigOs7MaskFactory<StaticElectricityOs7Base, RgbArg<2, White>, 3, 4> config_static_electricity_factory;
ConfigOs7MaskFactory<PowerWaveOs7Base, RgbArg<2, White>, 3, 4> config_power_wave_factory;
ConfigOs7MaskFactory<UnstableBladesOs7Base, RgbArg<2, White>, 3, 4> config_unstable_blades_factory;
ConfigOs7MaskFactory<FallenOrderOs7Base, RgbArg<2, White>, 3, 4> config_fallen_order_factory;
ConfigOs7MaskFactory<ThunderLoopOs7Base, RgbArg<2, White>, 3, 4> config_thunder_loop_factory;
ConfigOs7MaskFactory<ResponsiveFlameOs7Base, RgbArg<2, White>, 3, 4> config_responsive_flame_factory;
ConfigOs7MaskFactory<ShimmerBladeOs7Base, RgbArg<2, White>, 3, 4> config_shimmer_blade_factory;
ConfigOs7MaskFactory<RotoscopeOs7Base, RgbArg<2, White>, 3, 4> config_rotoscope_factory;
ConfigOs7MaskFactory<PulseStripesOs7Base, RgbArg<2, White>, 3, 4> config_pulse_stripes_factory;
ConfigOs7MaskFactory<KineticChargeOs7Base, RgbArg<3, White>, 4, 5> config_kinetic_charge_factory;
ConfigOs7MaskFactory<RotatingPulseOs7Base, RgbArg<2, White>, 3, 4> config_rotating_pulse_factory;
ConfigOs7MaskFactory<TrickleBladeOs7Base, RgbArg<2, White>, 3, 4> config_trickle_blade_factory;

// Linear InOutHelper blades. Inside a config section the style only draws.
// Top-level use wraps the section mask with the linear curve and this line's times.
inline BladeStyle* ConfigWrapLinearMask(BladeStyle* core, int ext_arg, int ret_arg,
                                       int ext_def, int ret_def) {
  if (!core) return nullptr;
  if (config_layer_parse_depth_ > 0) return core;
  int ext = ext_def;
  int ret = ret_def;
  if (CurrentArgParser) {
    ext = ConfigParseMsToken(CurrentArgParser->GetArg(ext_arg, "", ""), ext_def);
    ret = ConfigParseMsToken(CurrentArgParser->GetArg(ret_arg, "", ""), ret_def);
  }
  BladeStyle* layers[1] = { core };
  uint8_t past[1] = { 0 };
  return new ConfigLayersStyle(layers, 1, nullptr, nullptr, past,
                              CONFIG_INOUT_LINEAR, ext, ret);
}

template<class INNER, int EXT_ARG, int RET_ARG, int EXT_DEF = 300, int RET_DEF = 800>
class ConfigLinearMaskFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    return ConfigWrapLinearMask(StylePtr<INNER>()->make(), EXT_ARG, RET_ARG, EXT_DEF, RET_DEF);
  }
};

using ConfigGradientInner = SimpleClash<
  Lockup<
    Blast<Gradient<RgbArg<1, Red>, RgbArg<2, Blue>>, RgbArg<3, White>>,
    AudioFlicker<Gradient<RgbArg<1, Red>, RgbArg<2, Blue>>, RgbArg<4, White>>
  >,
  RgbArg<5, White>>;
ConfigLinearMaskFactory<ConfigGradientInner, 6, 7> config_gradient_factory;

using ConfigAudioInner = SimpleClash<
  Lockup<
    Blast<AudioFlicker<RgbArg<1, Blue>, RgbArg<2, White>>, RgbArg<3, White>>,
    AudioFlicker<RgbArg<1, Blue>, RgbArg<2, White>>
  >,
  RgbArg<4, White>>;
ConfigLinearMaskFactory<ConfigAudioInner, 5, 6> config_audio_factory;

using ConfigFlickerInner = SimpleClash<
  Lockup<
    Blast<BrownNoiseFlicker<RgbArg<1, Red>, RgbArg<2, Orange>, 100>, RgbArg<3, White>>,
    AudioFlicker<BrownNoiseFlicker<RgbArg<1, Red>, RgbArg<2, Orange>, 100>, RgbArg<4, White>>
  >,
  RgbArg<5, White>>;
ConfigLinearMaskFactory<ConfigFlickerInner, 6, 7> config_flicker_factory;

using ConfigSparkleBladeInner = Layers<
  Layers<RgbArg<1, Blue>, SparkleL<RgbArg<2, White>, 300, 1024>>,
  SimpleClashL<RgbArg<5, White>>,
  LockupL<AudioFlickerL<RgbArg<4, White>>>,
  BlastL<RgbArg<3, White>>>;
ConfigLinearMaskFactory<ConfigSparkleBladeInner, 6, 7> config_sparkle_blade_factory;

using ConfigCylonInner = SimpleClash<
  Lockup<
    Blast<Cylon<Black, 0, 0, RgbArg<1, Red>, 25, 200, 300, Black>, RgbArg<2, White>>,
    AudioFlicker<Cylon<Black, 0, 0, RgbArg<1, Red>, 25, 200, 300, Black>, RgbArg<3, White>>
  >,
  RgbArg<4, White>>;
ConfigLinearMaskFactory<ConfigCylonInner, 5, 6> config_cylon_factory;

using ConfigPulseBladeInner = PulsingX<RgbArg<1, Black>, RgbArg<2, White>, IntArg<3, 3000>>;
ConfigLinearMaskFactory<ConfigPulseBladeInner, 4, 5> config_pulse_blade_factory;

#endif  // STYLES_SD_STYLE_CATALOG_H
