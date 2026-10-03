#ifndef STYLES_STRIP_COLUMN_SOURCE_H
#define STYLES_STRIP_COLUMN_SOURCE_H

// Shared SD column loader + double-buffered frame advance for strip_column / strip_column_mask.

#include "strip_column.h"
#include "strip_column_bmp.h"
#include "../common/file_reader.h"
#include "../common/looper.h"
#include "../common/math.h"
#include "../common/color.h"
#include "../common/stdout.h"
#include "../common/arg_parser.h"
#include <string.h>

#ifdef ENABLE_AUDIO
#include "../sound/audio_stream_work.h"
#else
#define LOCK_SD(X) do { (void)(X); } while(0)
#endif

#if defined(ENABLE_SD) && defined(ARDUINO_ARCH_STM32L4)
void MountSDCard();
#endif

#define STRIP_COLUMN_RECORD_SIZE 512
#define STRIP_COLUMN_MAX_SOURCE_HEIGHT 170

inline void StripColumnSanitizePath(char* path, size_t path_max) {
  if (!path || path_max == 0) return;
  size_t n = strnlen(path, path_max);
  while (n > 0 && (path[n - 1] == '\r' || path[n - 1] == '\n' || path[n - 1] == ' ' ||
                     path[n - 1] == '\t')) {
    path[--n] = 0;
  }
  size_t start = 0;
  while (path[start] == ' ' || path[start] == '\t') start++;
  if (start > 0 && start < n) memmove(path, path + start, n - start + 1);
}

// Set by strip_column / strip_column_mask factories immediately before Style construction.
class StripColumnPendingPath {
public:
  static void Set(const char* path) {
    StripColumnExtractFirstFileArg(path ? path : "", path_, sizeof(path_));
    char* p = path_;
    while (*p == '/') p++;
    if (p != path_) memmove(path_, p, strlen(p) + 1);
    StripColumnSanitizePath(path_, sizeof(path_));
  }
  static const char* Get() { return path_; }

private:
  static char path_[128];
};

char StripColumnPendingPath::path_[128] = "";

struct StripColumnOpenOptions {
  const char* style_name;
};

struct StripColumnBootFrameCache {
  char path[128];
  uint8_t data[STRIP_COLUMN_RECORD_SIZE];
  StripColumnBmpInfo bmp_info;
  uint32_t num_frames;
  int source_height;
  bool valid;
};

inline StripColumnBootFrameCache& StripColumnBootFrameCacheState() {
  static StripColumnBootFrameCache cache;
  return cache;
}

inline bool StripColumnBootFrameCacheMatches(const char* path, int source_height) {
  const StripColumnBootFrameCache& cache = StripColumnBootFrameCacheState();
  if (!cache.valid || !path || !path[0]) return false;
  if (strcmp(cache.path, path) != 0) return false;
  if (source_height > 0 && cache.source_height > 0 && source_height != cache.source_height) return false;
  return true;
}

// Returns true when the layer should contribute no pixels (missing/invalid media).
inline RGBA_um_nod StripColumnLayerTransparent() {
  return RGBA_um_nod::Transparent();
}

inline void StripColumnCopySdPath(char* dest, size_t dest_max, const char* src) {
  if (!dest || dest_max == 0) return;
  StripColumnExtractFirstFileArg(src ? src : "", dest, dest_max);
  char* p = dest;
  while (*p == '/') p++;
  if (p != dest) memmove(dest, p, strlen(p) + 1);
  StripColumnSanitizePath(dest, dest_max);
}

inline bool StripColumnTryOpenFile(FileReader* file, const char* path) {
  if (!file || !path || !path[0]) return false;
  if (file->OpenFast(path)) return true;
  char slash_path[129];
  if (path[0] != '/') {
    slash_path[0] = '/';
    strncpy(slash_path + 1, path, sizeof(slash_path) - 2);
    slash_path[sizeof(slash_path) - 1] = 0;
    if (file->OpenFast(slash_path)) return true;
  }
  if (file->Open(path)) return true;
  if (path[0] != '/' && file->Open(slash_path)) return true;
  return false;
}

#ifdef ENABLE_SD
inline void StripColumnPreloadBootFrame(const char* path, int source_height) {
  if (!path || !path[0]) return;
  char sd_path[128];
  StripColumnCopySdPath(sd_path, sizeof(sd_path), path);
  StripColumnBootFrameCache& cache = StripColumnBootFrameCacheState();
  if (cache.valid && strcmp(cache.path, sd_path) == 0) return;

  source_height = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
  LOCK_SD(true);
  FileReader file;
  bool opened = StripColumnTryOpenFile(&file, sd_path);
  if (!opened) {
    LOCK_SD(false);
    return;
  }
  StripColumnBmpInfo info;
  if (!StripColumnBmpParseHeader(&file, &info)) {
    file.Close();
    LOCK_SD(false);
    return;
  }
  int rows = source_height;
  if (rows > (int)info.height) rows = (int)info.height;
  if (rows > STRIP_COLUMN_MAX_SOURCE_HEIGHT) rows = STRIP_COLUMN_MAX_SOURCE_HEIGHT;
  StripColumnBmpLoadColumn(&file, &info, 0, rows, cache.data, STRIP_COLUMN_RECORD_SIZE);
  file.Close();
  LOCK_SD(false);

  strncpy(cache.path, sd_path, sizeof(cache.path) - 1);
  cache.path[sizeof(cache.path) - 1] = 0;
  cache.bmp_info = info;
  cache.num_frames = info.width ? info.width : 1;
  cache.source_height = source_height;
  cache.valid = true;
}
#else
inline void StripColumnPreloadBootFrame(const char* path, int source_height) {
  (void)path;
  (void)source_height;
}
#endif

class StripColumnFrameSource {
public:
  StripColumnFrameSource() : open_ok_logged_(false) { Reset(); }
  ~StripColumnFrameSource() { CloseOpenFile(); }

  void CapturePendingPath() {
    const char* p = nullptr;
    if (CurrentArgParser) {
      p = CurrentArgParser->GetArg(1, "FILE", "");
    }
    if (!p || !p[0]) p = StripColumnPendingPath::Get();
    StripColumnCopySdPath(path_, sizeof(path_), p);
  }

  void RefreshPathIfEmpty() {
    if (path_[0]) return;
    CapturePendingPath();
    if (path_[0]) return;
    const char* p = StripColumnPendingPath::Get();
    StripColumnCopySdPath(path_, sizeof(path_), p);
  }

  bool IsOpen() const { return opened_; }

  void LogOpenFailureOnce(const StripColumnOpenOptions& opts, const char* reason) {
    if (open_warned_) return;
    open_warned_ = true;
    const char* tag = opts.style_name ? opts.style_name : "strip_column";
    if (path_[0]) {
      STDERR << tag << ": " << reason << " " << path_ << " (layer transparent)\n";
      STDOUT << tag << ": " << reason << " " << path_ << " (layer transparent)\n";
    } else {
      STDERR << tag << ": " << reason << " (layer transparent)\n";
      STDOUT << tag << ": " << reason << " (layer transparent)\n";
    }
  }

  void LogOpenSuccessOnce(const StripColumnOpenOptions& opts) {
    if (open_ok_logged_) return;
    open_ok_logged_ = true;
    const char* tag = opts.style_name ? opts.style_name : "strip_column";
    STDERR << tag << ": opened " << path_ << " frames=" << num_frames_;
    STDOUT << tag << ": opened " << path_ << " frames=" << num_frames_;
    if (use_bmp_) {
      STDERR << " bmp=" << bmp_info_.width << "x" << bmp_info_.height;
      STDOUT << " bmp=" << bmp_info_.width << "x" << bmp_info_.height;
    }
    STDERR << "\n";
    STDOUT << "\n";
  }

  void CloseOpenFile() {
    file_.Close();
    opened_ = false;
  }

  void InvalidateIfUnmounted() {
#ifdef ENABLE_SD
    if (opened_ && !LSFS::IsMounted()) CloseOpenFile();
#endif
  }

  bool EnsureOpen(const StripColumnOpenOptions& opts, int source_height) {
    InvalidateIfUnmounted();
    if (opened_) {
      if (file_.IsOpen()) return true;
      // Boot frame cache optional; style loader warm does not preload BMP columns.
      if (StripColumnBootFrameCacheMatches(path_, source_height > 0 ? source_height : source_height_))
        return true;
      CloseOpenFile();
    }
    RefreshPathIfEmpty();
    if (!path_[0]) {
      LogOpenFailureOnce(opts, "missing file path");
      return false;
    }
    source_height_ = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    if (StripColumnBootFrameCacheMatches(path_, source_height_)) {
      const StripColumnBootFrameCache& boot = StripColumnBootFrameCacheState();
      use_bmp_ = true;
      bmp_info_ = boot.bmp_info;
      num_frames_ = boot.num_frames ? boot.num_frames : 1;
      opened_ = true;
      memcpy(frames_[0].data, boot.data, STRIP_COLUMN_RECORD_SIZE);
      frames_[0].frame = 0;
      current_ = 0;
      back_ready_ = false;
      frames_[1].frame = ~0u;
      LogOpenSuccessOnce(opts);
      return true;
    }
    bool opened_file = false;
#if defined(ENABLE_SD) && defined(ARDUINO_ARCH_STM32L4)
    MountSDCard();
#endif
    opened_file = StripColumnTryOpenFile(&file_, path_);
    if (!opened_file) {
      LogOpenFailureOnce(opts, "missing SD file");
      return false;
    }

    file_.Seek(0);
    int sig0 = file_.Read();
    int sig1 = file_.Read();
    bool path_is_bmp = false;
    {
      const char* dot = strrchr(path_, '.');
      if (dot && strcasecmp(dot, ".bmp") == 0) path_is_bmp = true;
    }
    if (sig0 == 'B' && sig1 == 'M') {
      file_.Seek(0);
      if (StripColumnBmpParseHeader(&file_, &bmp_info_)) {
        use_bmp_ = true;
        num_frames_ = bmp_info_.width;
        if (num_frames_ == 0) num_frames_ = 1;
        opened_ = true;
      } else {
        LogOpenFailureOnce(opts, "invalid BMP");
        file_.Close();
      }
    } else {
      LogOpenFailureOnce(opts, path_is_bmp ? "invalid BMP" : "need 24-bit BMP");
      file_.Close();
    }

    if (opened_) {
      if (source_height_ <= 0)
        source_height_ = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
      if (StripColumnBootFrameCacheMatches(path_, source_height_)) {
        const StripColumnBootFrameCache& boot = StripColumnBootFrameCacheState();
        memcpy(frames_[0].data, boot.data, STRIP_COLUMN_RECORD_SIZE);
        frames_[0].frame = 0;
      } else {
        LoadFrameInto(0, 0);
      }
      current_ = 0;
      back_ready_ = false;
      frames_[1].frame = ~0u;
      LogOpenSuccessOnce(opts);
    }
    return opened_;
  }

  void WarnSourceHeightVsBmp(int source_height, const char* style_name = "strip_column") {
    if (!opened_ || !use_bmp_ || height_warned_) return;
    if (source_height > (int)bmp_info_.height) {
      height_warned_ = true;
      const char* tag = style_name ? style_name : "strip_column";
      STDERR << tag << ": source_height " << source_height
             << " exceeds BMP height " << bmp_info_.height << " (clamping)\n";
    }
  }

  // Updates cached frame when open; no-op when closed or num_leds <= 0.
  void AdvanceAnimation(int source_height, int fps, int num_leds) {
    InvalidateIfUnmounted();
    if (!opened_ || num_leds <= 0) return;
    source_height_ = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    fps = clampi32(fps, 1, 240);
    int frame_ms = clampi32(1000 / fps, 1, 60000);

    uint32_t want = (millis() / frame_ms) % num_frames_;
    if (frames_[current_].frame != want) {
      int back = 1 - current_;
      if (back_ready_ && frames_[back].frame == want) {
        current_ = back;
        back_ready_ = false;
      } else {
        LoadFrameInto(back, want);
        current_ = back;
        back_ready_ = false;
      }
    }

    int back = 1 - current_;
    uint32_t next = (want + 1) % num_frames_;
    if (!back_ready_ && frames_[back].frame != next) {
      LoadFrameInto(back, next);
      back_ready_ = true;
    }
  }

  const uint8_t* CurrentFrameData() const { return frames_[current_].data; }

private:
  struct Frame {
    uint32_t frame;
    uint8_t data[STRIP_COLUMN_RECORD_SIZE];
  };

  void Reset() {
    CloseOpenFile();
    path_[0] = 0;
    current_ = 0;
    back_ready_ = false;
    use_bmp_ = false;
    height_warned_ = false;
    open_warned_ = false;
    open_ok_logged_ = false;
    num_frames_ = 0;
    source_height_ = 0;
    frames_[0].frame = frames_[1].frame = ~0u;
    memset(&bmp_info_, 0, sizeof(bmp_info_));
  }

  void LoadFrameInto(int buf, uint32_t frame_index) {
    InvalidateIfUnmounted();
    if (!opened_ || !file_.IsOpen()) {
      if (opened_) CloseOpenFile();
      return;
    }
    if (use_bmp_) {
      if (frame_index == 0 && StripColumnBootFrameCacheMatches(path_, source_height_)) {
        memcpy(frames_[buf].data, StripColumnBootFrameCacheState().data, STRIP_COLUMN_RECORD_SIZE);
      } else {
        int rows = source_height_ > 0 ? source_height_ : (int)bmp_info_.height;
        if (rows > STRIP_COLUMN_MAX_SOURCE_HEIGHT) rows = STRIP_COLUMN_MAX_SOURCE_HEIGHT;
        StripColumnBmpLoadColumn(&file_, &bmp_info_, frame_index, rows,
                                 frames_[buf].data, STRIP_COLUMN_RECORD_SIZE);
      }
    }
    frames_[buf].frame = frame_index;
    Looper::DoHFLoop();
  }

  char path_[128];
  FileReader file_;
  Frame frames_[2];
  int current_;
  bool back_ready_;
  bool opened_;
  bool use_bmp_;
  bool height_warned_;
  bool open_warned_;
  bool open_ok_logged_;
  StripColumnBmpInfo bmp_info_;
  uint32_t num_frames_;
  int source_height_;
};

#endif  // STYLES_STRIP_COLUMN_SOURCE_H
