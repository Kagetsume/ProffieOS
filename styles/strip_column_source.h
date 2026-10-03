#ifndef STYLES_STRIP_COLUMN_SOURCE_H
#define STYLES_STRIP_COLUMN_SOURCE_H

// Shared SD column loader + ring-buffered frame prefetch for strip_column / strip_column_mask.

#include "strip_column.h"
#include "strip_column_bmp.h"
#include "../common/file_reader.h"
#include "../common/math.h"
#include "../common/color.h"
#include "../common/saber_base.h"
#include "../common/stdout.h"
#include "../common/arg_parser.h"
#include <string.h>

#ifndef STRIP_COLUMN_BMP_ROWS_PER_RUN
#define STRIP_COLUMN_BMP_ROWS_PER_RUN 12
#endif

#ifdef ENABLE_AUDIO
#include "../sound/audio_stream_work.h"
#else
#define LOCK_SD(X) do { (void)(X); } while(0)
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
    } else {
      STDERR << tag << ": " << reason << " (layer transparent)\n";
    }
  }

  void LogOpenSuccessOnce(const StripColumnOpenOptions& opts) {
    if (open_ok_logged_) return;
    open_ok_logged_ = true;
    const char* tag = opts.style_name ? opts.style_name : "strip_column";
    STDERR << tag << ": opened " << path_ << " frames=" << num_frames_
           << " bmp=" << bmp_info_.width << "x" << bmp_info_.height << "\n";
  }

  void CloseOpenFile() {
    file_.Close();
    opened_ = false;
    header_ok_ = false;
    cache_.ClearAllSlots();
  }

  void CloseSdFileHandleOnly() {
    if (file_.IsOpen()) file_.Close();
  }

  void ReleaseMediaForBlade(BladeBase* blade) {
    if (StripColumnShouldReleaseMedia(blade)) {
      CloseOpenFile();
      return;
    }
    if (!SaberBase::IsOn()) CloseSdFileHandleOnly();
  }

  void InvalidateIfUnmounted() {
#ifdef ENABLE_SD
    if (opened_ && !LSFS::IsMounted()) CloseOpenFile();
#endif
  }

  bool EnsureOpen(const StripColumnOpenOptions& opts, int source_height, BladeBase* blade) {
    InvalidateIfUnmounted();
    ReleaseMediaForBlade(blade);
    if (!SaberBase::IsOn()) return false;
    if (opened_) {
      if (file_.IsOpen()) return true;
      CloseOpenFile();
    }

    source_height_ = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);

    if (!header_ok_) {
      RefreshPathIfEmpty();
      if (!path_[0]) {
        LogOpenFailureOnce(opts, "empty file path");
        return false;
      }
      LOCK_SD(true);
      if (!file_.Open(path_)) {
        LOCK_SD(false);
        LogOpenFailureOnce(opts, "missing SD file");
        return false;
      }
      file_.Seek(0);
      if (!StripColumnBmpParseHeader(&file_, &bmp_info_)) {
        const char* tag = opts.style_name ? opts.style_name : "strip_column";
        STDERR << tag << ": need 24-bit uncompressed BMP\n";
        file_.Close();
        LOCK_SD(false);
        return false;
      }
      num_frames_ = StripColumnBmpNumFrames(&bmp_info_, StripColumnPath::GetFrameAxis());
      if (num_frames_ == 0) num_frames_ = 1;
      header_ok_ = true;
      LogOpenSuccessOnce(opts);
      LOCK_SD(false);
    }

    if (header_ok_ && !opened_) {
      if (cache_.LoadFrameSlice(&file_, &bmp_info_, StripColumnPath::GetFrameAxis(),
                                source_height_, 0, 0)) {
        opened_ = true;
        cache_.OnFirstFrameReady();
      }
    }
    return opened_;
  }

  void WarnSourceHeightVsBmp(int source_height, const char* style_name = "strip_column") {
    if (!header_ok_ || height_warned_) return;
    uint32_t blade_px =
        StripColumnBmpBladePixelsInFile(&bmp_info_, StripColumnPath::GetFrameAxis());
    if ((uint32_t)source_height > blade_px) {
      height_warned_ = true;
      const char* tag = style_name ? style_name : "strip_column";
      STDERR << tag << ": source_height " << source_height << " exceeds BMP blade span "
             << blade_px << " (clamping)\n";
    }
  }

  // Updates cached frame when open; no-op when closed or num_leds <= 0.
  void AdvanceAnimation(int source_height, int fps, int num_leds, BladeBase* blade) {
    InvalidateIfUnmounted();
    ReleaseMediaForBlade(blade);
    if (!SaberBase::IsOn()) return;
    if (!opened_ || num_leds <= 0) return;
    source_height_ = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    fps = clampi32(fps, 1, 240);
    int frame_ms = clampi32(1000 / fps, 1, 60000);

    cache_.Tick(&file_, &bmp_info_, StripColumnPath::GetFrameAxis(), source_height_, frame_ms,
                num_frames_);
  }

  const uint8_t* CurrentFrameData() const { return cache_.DisplayData(); }

private:
  void Reset() {
    CloseOpenFile();
    path_[0] = 0;
    height_warned_ = false;
    open_warned_ = false;
    open_ok_logged_ = false;
    num_frames_ = 0;
    source_height_ = 0;
    memset(&bmp_info_, 0, sizeof(bmp_info_));
  }

  char path_[128];
  FileReader file_;
  StripColumnColumnCache cache_;
  bool opened_;
  bool header_ok_;
  bool height_warned_;
  bool open_warned_;
  bool open_ok_logged_;
  StripColumnBmpInfo bmp_info_;
  uint32_t num_frames_;
  int source_height_;
};

#endif  // STYLES_STRIP_COLUMN_SOURCE_H
