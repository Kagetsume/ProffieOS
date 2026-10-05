#ifndef COMMON_CURRENT_PRESET_H
#define COMMON_CURRENT_PRESET_H

#include "preset.h"
#include "file_reader.h"
#include "blade_config.h"
#include "sd_config.h"
#include "font_search_path.h"
#include "arg_parser.h"

class CurrentPreset {
public:
  enum { PRESET_DISK, PRESET_ROM } preset_type;
  int preset_num;
  ConfigFileExt read_from_ext_ = ConfigFileExt::CONFIG_UNKNOWN;
  const char* read_from_save_dir_ = "";
  uint32_t iteration_ = 0;
  LSPtr<char> font;
  LSPtr<char> font_primary;
  LSPtr<char> font_overlay;
  LSPtr<char> voice;
  LSPtr<char> track;
#if NUM_BLADES > 0
  LSPtr<char> current_style_[NUM_BLADES];
#endif
  LSPtr<char> name;
  uint32_t variation;

  static const char *mk_builtin_str(int num, int N) {
    char tmp[30];
    strcpy(tmp, "builtin ");
    itoa(num, tmp + strlen(tmp), 10);
    strcat(tmp, " ");
    itoa(N, tmp + strlen(tmp), 10);
    return mkstr(tmp);
  }

  const char *mk_preset_name(int num) {
    char tmp[30];
    strcpy(tmp, "Preset: ");
    itoa(num + 1, tmp + strlen(tmp), 10);
    return mkstr(tmp);
  }

  static bool IsValidStyleString(const char* s) {
    if (!s || !s[0]) return false;
    const char* first = s;
    // First word: style name (standard, accent_pulse, config, …).
    for (; *s && *s != ' '; s++) {
      if (*s >= 'a' && *s <= 'z') continue;
      if (*s == '_') continue;
      return false;
    }
    if (s == first) return false;
    // Rest: full style line (colors, numbers, config section names, key=value overrides).
    // Previously only digits/space/comma were allowed, which rejected every normal preset style.
    for (; *s; s++) {
      unsigned char c = (unsigned char)*s;
      if (c == '\t') continue;
      if (c < 32 || c > 126) return false;
    }
    return true;
  }

  // Default GPIO accent styles for config-files-config.h NUM_BLADES 4 layout
  // (indices 1–3 = Free1/Free2/Free3). Used when presets.ini omits accent style lines.
  static const char* DefaultAccentStyleForBladeIndex(size_t blade_index) {
#if NUM_BLADES >= 5
    if (blade_index == 2) return "accent_pulse 1500";
    if (blade_index == 3) return "accent_sound_on white 13%";
    if (blade_index == 4) return "accent_glow";
#elif NUM_BLADES >= 4
    if (blade_index == 1) return "accent_pulse 1500";
    if (blade_index == 2) return "accent_sound_on white 13%";
    if (blade_index == 3) return "accent_glow";
#endif
    return nullptr;
  }

  static const char* ValidateStyleStringF(const char* s, const char* file, int line) {
    if (!IsValidStyleString(s)) {
      while (true) {
	STDOUT << "INVALID STYLE STRING " << s << " @ " << file << ":" << line << "\n";
      }
    }
    return s;
  }

  static const LSPtr<char> ValidateStyleStringF(LSPtr<char> s, const char* file, int line) {
    if (!IsValidStyleString(s.get())) {
      while (true) {
	STDOUT << "INVALID STYLE STRING " << s.get() << " @ " << file << ":" << line << "\n";
      }
    }
    return s;
  }

#define VALIDATE_STYLE_STRING(N) ValidateStyleString(PRE.current_style_[N-1].get());

#if defined(ENABLE_DEBUG) && NUM_BLADES > 0
#define ValidateStyleString(X) CurrentPreset::ValidateStyleStringF((X), __FILE__, __LINE__)
#define VSS(X) CurrentPreset::ValidateStyleStringF((X), __FILE__, __LINE__)
#define DOVALIDATE(X) do { CurrentPreset&PRE=(X); ONCEPERBLADE(VALIDATE_STYLE_STRING); } while(0)
#else
#define ValidateStyleString(X) (X)
#define VSS(X) (X)
#define DOVALIDATE(X) do {  } while(0)
#endif

  int FontOverlayDirectoryCount() const {
    return CountSemicolonSeparatedPaths(font_overlay.get());
  }

  void FinalizeFontSearchPath() {
#ifdef ENABLE_SD
    font = ComposePresetFontWithOverlayAndVoice(
        font_overlay.get(),
        font_primary.get() ? font_primary.get() : font.get(),
        voice.get());
#else
    if (font_primary.get() && font_primary.get()[0]) {
      font = font_primary;
      font_primary = "";
    }
#endif
  }

  // True when a PWM accent slot should be replaced with DefaultAccentStyleForBladeIndex.
  // Catches strip presets (standard, config demo_*, …) copied onto Free1/2/3 by mistake.
  static bool AccentSlotShouldUseDefault(const char* s) {
    if (!s || !s[0]) return true;
    if (FirstWord(s, "config")) {
      const char* section = SkipWord(s);
      while (*section == ' ' || *section == '\t') section++;
      if (!*section) return true;
      return !FirstWord(section, "accent_");
    }
    return !FirstWord(s, "accent_");
  }

  // Fill empty accent style slots (indices 1..NUM_BLADES-1). Never copies the NeoPixel
  // style onto PWM accents when NUM_BLADES >= 4 (see DefaultAccentStyleForBladeIndex).
  void FillMissingAccentPresetStyles() {
#if NUM_BLADES > 0
    for (size_t N = 1; N < NUM_BLADES; N++) {
      const char* existing = current_style_[N].get();
      const bool empty = !existing || !existing[0];
      const char* accent_default = DefaultAccentStyleForBladeIndex(N);
      if (!empty) {
        if (!accent_default || !AccentSlotShouldUseDefault(existing))
          continue;
      }
      const char* fill = accent_default;
      // NUM_BLADES 2: duplicate strip 0 onto index 1. Never copy NeoPixel config onto PWM accents.
      if (!fill && N == 1 && NUM_BLADES < 4 && current_style_[0].get() && current_style_[0].get()[0])
        fill = current_style_[0].get();
      if (fill)
        current_style_[N] = ValidateStyleString(mkstr(StringPiece(fill)));
    }
#endif
  }

  void Clear() {
    font = "";
    font_primary = "";
    font_overlay = "";
    voice = "";
    track = "";
#if NUM_BLADES > 0
    for (size_t N = 0; N < NUM_BLADES; N++) current_style_[N] = "";
#endif
    name = "";
    variation = 0;
  }

  void SetFromSD(int num) {
#ifdef ENABLE_SD_CONFIG_FILES
    size_t n = GetNumPresets();
    if (n == 0) return;
    num = (int)((n + num) % n);
    if (num < 0 || (size_t)num >= n) return;
    const SDPresetDef* p = &sd_presets_storage[num];
    preset_type = PRESET_DISK;
    preset_num = num;
    font_primary = p->font.get() ? mkstr(StringPiece(p->font.get())) : "";
    font_overlay = p->font_overlay.get() ? mkstr(StringPiece(p->font_overlay.get())) : "";
    voice = p->voice.get() ? mkstr(StringPiece(p->voice.get())) : "";
    font = "";
    FinalizeFontSearchPath();
    track = p->track.get() ? mkstr(StringPiece(p->track.get())) : "";
    name = (p->name.get() && strlen(p->name.get())) ? mkstr(StringPiece(p->name.get())) : mk_preset_name(num);
    variation = p->variation;
#if NUM_BLADES > 0
    for (size_t N = 0; N < NUM_BLADES; N++)
      current_style_[N] = (p->style[N].get() && p->style[N].get()[0]) ? ValidateStyleString(mkstr(StringPiece(p->style[N].get()))) : "";
    FillMissingAccentPresetStyles();
#endif
#else
    (void)num;
#endif  // ENABLE_SD_CONFIG_FILES
  }

  void Set(int num) {
    if (!current_config) return;
    PVLOG_VERBOSE << "CurrentPreset::Set(" << num << "/" << current_config->num_presets << ")\n";
    num = (current_config->num_presets + num) % current_config->num_presets;
    Preset* preset = current_config->presets + num;
    preset_type = PRESET_ROM;
    preset_num = num;
    font_primary = "";
    voice = "";
    font = preset->font;
#ifdef ENABLE_SD
    FinalizeFontSearchPath();
#endif
    track = preset->track;
#define MAKE_STYLE_STRING(N) current_style_[N-1] = ValidateStyleString(mk_builtin_str(num, N));
    ONCEPERBLADE(MAKE_STYLE_STRING);
// TODO Test with 3+ blades
//#if NUM_BLADES > 0
//    for (size_t N = 0; N < NUM_BLADES; N++) current_style_[N] = ValidateStyleString(mk_builtin_str(num, N+1));
//#endif
    if (preset->name && strlen(preset->name)) {
      name = preset->name;
    } else {
      name = mk_preset_name(num);
    }
    variation = 0;
  }

  // Whitespace-tolerant; malformed lines or parts are ignored and do not crash.
  bool Read(FileReader* f) {
    if (!f || !f->IsOpen()) return false;
    int preset_count = 0;
    int current_style = 0;
    if (f->Tell() <= (int)(sizeof(install_time) + 11)) preset_num = -1;
    preset_type = PRESET_DISK;

    for (; f->Available(); f->skipline()) {
      char variable[33];
      variable[0] = 0;
      f->skipwhite();
      if (!f->Available()) break;
      if (f->Peek() == '#') continue;
      int line_begin = f->Tell();
      f->readVariable(variable);
      if (!variable[0]) continue;

      if (!strcmp(variable, "new_preset")) {
	preset_count++;
	if (preset_count == 2) {
	  FinalizeFontSearchPath();
	  FillMissingAccentPresetStyles();
	  preset_num++;
	  f->Seek(line_begin);
	  return true;
	}
	continue;
      }

      if (!strcmp(variable, "end")) {
	f->Seek(line_begin);
	if (preset_count == 0) break;
	if (preset_count == 1) {
	  FinalizeFontSearchPath();
	  FillMissingAccentPresetStyles();
	  preset_num++;
	  return true;
	}
	return false;
      }

      if (!preset_count) continue;
      if (!f->Available() || f->Peek() != '=') continue;
      f->Read();
      f->skipspace();

      if (!strcmp(variable, "name")) {
	char* tmp = f->readString();
	name = tmp ? tmp : "";
	/* LSPtr owns tmp when assigned; do not free */
	continue;
      }
      if (!strcmp(variable, "font")) {
	char* tmp = f->readString();
	font_primary = tmp ? tmp : "";
	/* LSPtr owns tmp when assigned; do not free */
	continue;
      }
      if (!strcmp(variable, "font_overlay")) {
	char* tmp = f->readString();
	if (tmp) {
	  font_overlay.set(NormalizePresetFontPath(tmp));
	} else {
	  font_overlay = "";
	}
	continue;
      }
      if (!strcmp(variable, "voice")) {
	char* tmp = f->readString();
	voice = tmp ? tmp : "";
	continue;
      }
      if (!strcmp(variable, "track")) {
	char* tmp = f->readString();
	track = tmp ? tmp : "";
	/* LSPtr owns tmp when assigned; do not free */
	continue;
      }
      if (!strcmp(variable, "variation")) {
	char* tmp = f->readString();
	if (tmp) {
	  variation = (uint32_t)strtol(tmp, nullptr, 10);
	  free(tmp);
	}
	continue;
      }
      if (!strcmp(variable, "style")) {
	char* tmp = f->readString();
#if NUM_BLADES > 0
	if (current_style >= 0 && current_style < (int)NUM_BLADES) {
	  if (tmp) (void)ValidateStyleString(tmp);
	  current_style_[current_style] = tmp ? tmp : "";
	  /* LSPtr owns tmp when assigned; do not free */
	} else if (tmp) {
	  free(tmp);
	}
#else
	if (tmp) free(tmp);
#endif
	current_style++;
	continue;
      }
    }
    if (preset_count == 1) {
      FinalizeFontSearchPath();
      FillMissingAccentPresetStyles();
      preset_num++;
      return true;
    }
    return false;
  }

  bool Write(BufferedFileWriter* f) {
    DOVALIDATE(*this);
    f->Write("new_preset\n");
    DOVALIDATE(*this);
    const char* font_out = font.get();
    if (voice.get() && voice.get()[0] && font_primary.get() && font_primary.get()[0])
      font_out = font_primary.get();
    f->write_key_value("font", font_out);
    if (font_overlay.get() && font_overlay.get()[0])
      f->write_key_value("font_overlay", font_overlay.get());
    if (voice.get() && voice.get()[0])
      f->write_key_value("voice", voice.get());
    DOVALIDATE(*this);
    f->write_key_value("track", track.get());
    DOVALIDATE(*this);
//#define WRITE_PRESET_STYLE(N) f->write_key_value("style", ValidateStyleString(current_style_[N-1].get()));
//    ONCEPERBLADE(WRITE_PRESET_STYLE);
#if NUM_BLADES > 0
    for (size_t N = 0; N < NUM_BLADES; N++) {
      f->write_key_value("style", ValidateStyleString(current_style_[N].get()));
    }
#endif
    f->write_key_value("name", name.get());
    char tmp[12];
    itoa(variation, tmp, 10);
    f->write_key_value("variation", tmp);
    return true;
  }

  void Print() {
    PrintQuotedValue("FONT", font.get());
    PrintQuotedValue("TRACK", track.get());
#define PRINT_PRESET_STYLE(N) PrintQuotedValue("STYLE" #N, ValidateStyleString(current_style_[N-1].get()));
    ONCEPERBLADE(PRINT_PRESET_STYLE);
    PrintQuotedValue("NAME", name.get());
    STDOUT << "VARIATION=" << variation << "\n";
  }

  static bool isSpace(int c) {
    return c == '\n' || c == '\r' || c == ' ' || c == '\t';
  }

  bool ValidatePresets(FileReader* f) {
    if (f->FileSize() < 4) return false;
    int pos = 0;
#ifndef KEEP_SAVEFILES_WHEN_PROGRAMMING
    char variable[33];
    f->readVariable(variable);
    if (strcmp(variable, "installed")) return false;
    if (f->Read() != '=') return false;
    if (!f->Expect(install_time)) return false;
    {
      int eol = f->Read();
      if (eol == '\r' && f->Peek() == '\n') f->Read();
      else if (eol != '\n' && eol != '\r') return false;
    }
    pos = f->Tell();
#endif

    int p = f->FileSize() - 1;
    while (p > 0) { f->Seek(p); if (!isSpace(f->Read())) break; p--; }
    f->Seek(p - 3);
    if (!isSpace(f->Read())) return false;
    if (toLower(f->Read()) != 'e') return false;
    if (toLower(f->Read()) != 'n') return false;
    if (toLower(f->Read()) != 'd') return false;
    f->Seek(pos);

    return true;
  }

  bool TryValidator(FileValidator* a) {
    if (!a->validHeader()) return false;
    if (!a->validateChecksum()) return false;
    read_from_ext_ = a->ext;
    iteration_ = a->iteration();
    return true;
  }

  bool TryPlain(FileValidator* a) {
    a->f.Seek(0);
    if (!ValidatePresets(& a->f)) return false;
    read_from_ext_ = a->ext;
    iteration_ = 0;
    return true;
  }

  FileReader *OpenPresets2(FileSelector* fs) {
    if (GetSaveDir() != read_from_save_dir_) {
      read_from_ext_ = ConfigFileExt::CONFIG_UNKNOWN;
      iteration_ = 0;
      read_from_save_dir_ = GetSaveDir();
    }
    if (iteration_) {
      if (read_from_ext_ == ConfigFileExt::CONFIG_INI) {
	return & fs->ini.f;
      } else if(read_from_ext_ == ConfigFileExt::CONFIG_TMP) {
	return & fs->tmp.f;
      }
    }
    if (TryValidator(fs->a)) return & fs->a->f;
    if (TryValidator(fs->b)) return & fs->b->f;
    if (TryPlain(&fs->ini)) return & fs->ini.f;
    if (TryPlain(&fs->tmp)) return & fs->tmp.f;
    return nullptr;
  }

  FileReader *OpenPresets(FileSelector* fs) {
    FileReader* ret = OpenPresets2(fs);
    if (read_from_ext_ == ConfigFileExt::CONFIG_INI) {
      fs->tmp.f.Close();
    }
    if (read_from_ext_ == ConfigFileExt::CONFIG_TMP) {
      fs->ini.f.Close();
    }
    return ret;
  }

  bool CreateINI() {
#ifndef ENABLE_SD
    return false;
#else
    PathHelper ini_fn(GetSaveDir(), "presets.ini");
    BufferedFileWriter f(ini_fn);
    f.write_key_value("installed", install_time);
    CurrentPreset tmp;
    for (size_t i = 0; i < GetNumPresets(); i++) {
      if (UseSDConfig()) tmp.SetFromSD((int)i); else tmp.Set((int)i);
      DOVALIDATE(tmp);
      tmp.Write(&f);
    }
    f.Write("end\n");
    f.Close(++iteration_);
    return true;
#endif
  }

  // preset = -1 means to load the *last* pre
  bool Load(int preset) {
#ifndef ENABLE_SD
    return false;
#else
    FileSelector fs(GetSaveDir(), "presets");
    FileReader* f = OpenPresets(&fs);
    if (!f) return false;
#ifdef ENABLE_DEBUG
    if (!f->IsOpen()) {
      STDERR << "File returned by OpenPresets is not open!\n";
      return false;
    }
#endif
    int start = f->Tell();
    int n = 0;
    preset_num = -1;
    while (true) {
      if (Read(f)) {
	if (n == preset) return true;
	n++;
      } else {
	if (n && preset == -1) return true;
	if (n == preset) {
	  f->Seek(start);
	  n=0;
	  preset_num = -1;
	  Read(f);
	  return true;
	}
	return false;
      }
    }
#endif
  }

  void SaveAtLocked(int position) {
#ifdef ENABLE_DEBUG
    if (GetSaveDir() != read_from_save_dir_) {
      STDERR << "WARNING! SAVE DIR DOES NOT MATCH\n";
    }
#endif
#ifdef ENABLE_SD

    DOVALIDATE(*this);
    FileSelector fs(GetSaveDir(), "presets");
    FileReader *f = OpenPresets(&fs);
    if (!f) {
      fs.Close();
      CreateINI();
      SaveAtLocked(position);
      return;
    }
    DOVALIDATE(*this);

    if (read_from_ext_ == ConfigFileExt::CONFIG_INI) {
      read_from_ext_ = ConfigFileExt::CONFIG_TMP;
    } else {
      read_from_ext_ = ConfigFileExt::CONFIG_INI;
    }
    iteration_++;

    PathHelper tmp_fn(GetSaveDir(), "presets", read_from_ext_ == ConfigFileExt::CONFIG_INI ? "ini" : "tmp");
    STDERR << "Creating file " << tmp_fn << " iteration = " << iteration_ << "\n";

    BufferedFileWriter out(tmp_fn);
    DOVALIDATE(*this);
    out.write_key_value("installed", install_time);
    CurrentPreset tmp;
    int opos = 0;
    if (position == 0) {
      DOVALIDATE(*this);
      Write(&out);
      opos++;
    }
    tmp.preset_num = -1;
    while (tmp.Read(f)) {
      if (tmp.preset_num != preset_num) {
	DOVALIDATE(tmp);
	tmp.Write(&out);
	opos++;
	if (position == opos) {
	  DOVALIDATE(*this);
	  Write(&out);
	  opos++;
	}
      }
    }
    fs.Close();
    out.Write("end\n");
    out.Close(iteration_);
    preset_num = position;
#endif
  }

  // position = 0 -> first spot
  // position = N -> last
  // position = -1 -> delete
  // To duplicate, set preset_num to -1
  void SaveAt(int position) {
    LOCK_SD(true);
    SaveAtLocked(position);
    LOCK_SD(false);
  }

  void Save() { SaveAt(preset_num); }

  void SetPreset(int preset) {
    Clear();
    LOCK_SD(true);
    if (UseSDConfig()) {
      SetFromSD(preset);
    } else if (!Load(preset)) {
      Set(preset);
    }
    LOCK_SD(false);
  }

  void SetStyle(int blade, LSPtr<char> style) {
    DOVALIDATE(*this);
    ValidateStyleString(style.get());
#if NUM_BLADES > 0
    current_style_[blade-1] = std::move(style);
#endif
    DOVALIDATE(*this);
  }

  const char* GetStyle(int blade) {
#if NUM_BLADES > 0
    return current_style_[blade-1].get();
#else
    return "";
#endif
  }
};

#endif
