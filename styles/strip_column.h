#ifndef STYLES_STRIP_COLUMN_H
#define STYLES_STRIP_COLUMN_H

// Strip column animation base (composable config layer-0).
//
// Media is a normal 24-bit uncompressed Windows BMP on SD — the same export you get
// from GIMP or Photoshop (BI_RGB, no RLE, no palette). No custom container format.
// SD path relative to card root, e.g. animations/plasma.bmp (quote if the path has spaces)
//   width  = number of animation frames (one vertical column per frame)
//   height = blade length in pixels (top of image = hilt, bottom = tip)
//
// source_height in the style args must match the BMP height; if it exceeds the file,
// rows are clamped and a serial warning is logged. Blade LEDs resample the column
// with linear RGB interpolation (hilt/tip aligned).
//
// Named style: strip_column
//   strip_column <sd_path> <source_height> <fps> <extend_ms> <retract_ms>
//   extend_ms / retract_ms: use -1 to match ignition / retraction sound length.
// Example (config layer base):
//   layer = strip_column animations/plasma.bmp 144 30 {{ext}} {{ret}}
//
// Stack multiply / clash / lockup overlays via additional layer = lines as today.

#include "bend_inout.h"
#include "colors.h"
#include "style_ptr.h"
#include "strip_column_bmp.h"
#include "../common/file_reader.h"
#include "../common/math.h"
#include "../common/saber_base.h"
#include "../common/stdout.h"
#ifdef ENABLE_AUDIO
#include "../sound/audio_stream_work.h"
#else
#define LOCK_SD(X) do { (void)(X); } while(0)
#endif

#ifndef STRIP_COLUMN_BMP_ROWS_PER_RUN
#define STRIP_COLUMN_BMP_ROWS_PER_RUN 24
#endif
#ifndef STRIP_COLUMN_FRAME_RING_SIZE
#define STRIP_COLUMN_FRAME_RING_SIZE 6
#endif
#if STRIP_COLUMN_FRAME_RING_SIZE < 2
#error STRIP_COLUMN_FRAME_RING_SIZE must be at least 2
#endif
#ifndef STRIP_COLUMN_TICK_MAX_LOAD_SLICES
#define STRIP_COLUMN_TICK_MAX_LOAD_SLICES 2
#endif
#include "../functions/int_arg.h"
#include <string.h>

#define STRIP_COLUMN_RECORD_SIZE 512
// In-RAM column cache size (not an on-disk format). Max RGB rows = 512 / 3.
#define STRIP_COLUMN_MAX_SOURCE_HEIGHT 170

// First FILE arg from strip_column / strip_column_mask style args (supports quoted paths).
inline size_t StripColumnExtractFirstFileArg(const char* args, char* dest, size_t dest_max) {
  if (!dest || dest_max == 0) return 0;
  dest[0] = 0;
  if (!args) return 0;
  while (*args == ' ' || *args == '\t') args++;
  size_t i = 0;
  if (*args == '"' || *args == '\'') {
    const char quote = *args++;
    for (; *args && *args != quote && i < dest_max - 1; i++, args++)
      dest[i] = *args;
    dest[i] = 0;
    return i;
  }
  for (; *args && *args != ' ' && *args != '\t' && *args != '\r' && *args != '\n'
         && i < dest_max - 1;
       i++, args++)
    dest[i] = *args;
  dest[i] = 0;
  return i;
}

// Set by StripColumnFactory immediately before Style construction (one path per make()).
class StripColumnPath {
public:
  static void Set(const char* path) {
    StripColumnExtractFirstFileArg(path ? path : "", path_, sizeof(path_));
  }
  static const char* Get() { return path_; }

private:
  static char path_[128];
};

char StripColumnPath::path_[128] = "";

// Maps LED index to a source row index and 15-bit fraction toward the next row (Gradient-style).
inline void StripColumnMapLed(int led, int num_leds, int source_height,
                              int* row_low, int* frac15) {
  *row_low = 0;
  *frac15 = 0;
  if (source_height <= 1 || num_leds <= 1) return;
  led = clampi32(led, 0, num_leds - 1);
  source_height = clampi32(source_height, 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
  int mul = ((source_height - 1) << 15) / (num_leds - 1);
  int x = led * mul;
  int row = x >> 15;
  if (row >= source_height - 1) {
    *row_low = source_height - 1;
    return;
  }
  *row_low = row;
  *frac15 = x & 0x7fff;
}

inline uint8_t StripColumnLerpChannel(uint8_t a, uint8_t b, int frac15) {
  return (uint8_t)(a + (((int)b - (int)a) * frac15 >> 15));
}

// Linear RGB8 sample at LED position; caller applies gamma (sqr) for Color16.
inline void StripColumnSampleAtLed(const uint8_t* data, int led, int num_leds, int source_height,
                                   uint8_t* r, uint8_t* g, uint8_t* b) {
  int row_low = 0;
  int frac15 = 0;
  StripColumnMapLed(led, num_leds, source_height, &row_low, &frac15);
  int idx0 = row_low * 3;
  if (idx0 + 2 >= source_height * 3) {
    *r = *g = *b = 0;
    return;
  }
  if (frac15 == 0 || row_low >= source_height - 1) {
    *r = data[idx0];
    *g = data[idx0 + 1];
    *b = data[idx0 + 2];
    return;
  }
  int idx1 = idx0 + 3;
  *r = StripColumnLerpChannel(data[idx0], data[idx1], frac15);
  *g = StripColumnLerpChannel(data[idx0 + 1], data[idx1 + 1], frac15);
  *b = StripColumnLerpChannel(data[idx0 + 2], data[idx1 + 2], frac15);
}

// Multi-slot column cache: display one frame, prefetch up to RING_SIZE-1 ahead (512 B/slot).
struct StripColumnFrameSlot {
  uint32_t frame;
  uint8_t data[STRIP_COLUMN_RECORD_SIZE];
};

class StripColumnColumnCache {
public:
  StripColumnColumnCache()
      : current_(0), loading_buf_(-1), rows_loaded_(0), loading_frame_(0), last_swap_ms_(0) {
    ClearAllSlots();
  }

  void ClearAllSlots() {
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++)
      frames_[i].frame = ~0u;
  }

  void OnFirstFrameReady() {
    current_ = 0;
    last_swap_ms_ = millis();
    for (int i = 1; i < STRIP_COLUMN_FRAME_RING_SIZE; i++)
      frames_[i].frame = ~0u;
  }

  const uint8_t* DisplayData() const { return frames_[current_].data; }

  bool LoadFrameSlice(FileReader* file, StripColumnBmpInfo* bmp, int source_height,
                      int buf, uint32_t frame_index) {
    return AdvanceBmpColumnLoad(file, bmp, source_height, buf, frame_index);
  }

  // One animation tick: swap when ready + up to two SD slices (finish column → prefetch sooner).
  void Tick(FileReader* file, StripColumnBmpInfo* bmp, int source_height, int frame_ms,
            uint32_t num_frames) {
    if (!file || !bmp || num_frames == 0) return;
    if (frames_[current_].frame == ~0u) return;

    for (int pass = 0; pass < STRIP_COLUMN_TICK_MAX_LOAD_SLICES; pass++) {
      uint32_t display_frame = frames_[current_].frame;
      uint32_t now = millis();
      uint32_t next_display = (display_frame + 1) % num_frames;
      for (int s = 0; s < STRIP_COLUMN_FRAME_RING_SIZE; s++) {
        if (frames_[s].frame == next_display &&
            (int32_t)(now - last_swap_ms_) >= (uint32_t)frame_ms) {
          current_ = s;
          last_swap_ms_ = now;
          break;
        }
      }

      if (loading_buf_ >= 0) {
        AdvanceBmpColumnLoad(file, bmp, source_height, loading_buf_, loading_frame_);
        if (loading_buf_ >= 0) return;
        continue;
      }

      display_frame = frames_[current_].frame;
      for (int offset = 1; offset < STRIP_COLUMN_FRAME_RING_SIZE; offset++) {
        uint32_t want = (display_frame + (uint32_t)offset) % num_frames;
        if (SlotHasCompleteFrame(want)) continue;
        int slot = PickSlotForLoad(display_frame, num_frames);
        if (slot < 0) continue;
        AdvanceBmpColumnLoad(file, bmp, source_height, slot, want);
        return;
      }
      return;
    }
  }

private:
  bool SlotHasCompleteFrame(uint32_t frame_index) const {
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (frames_[i].frame == frame_index) return true;
    }
    return false;
  }

  bool FrameInPrefetchWindow(uint32_t display_frame, uint32_t num_frames,
                             uint32_t candidate) const {
    for (int offset = 1; offset < STRIP_COLUMN_FRAME_RING_SIZE; offset++) {
      if (((display_frame + (uint32_t)offset) % num_frames) == candidate) return true;
    }
    return false;
  }

  int PickSlotForLoad(uint32_t display_frame, uint32_t num_frames) const {
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (i == current_ || i == loading_buf_) continue;
      if (frames_[i].frame == ~0u) return i;
    }
    // Prefer evicting the oldest frame behind the playhead (not in prefetch window).
    int best = -1;
    uint32_t best_dist = 0;
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (i == current_ || i == loading_buf_) continue;
      uint32_t f = frames_[i].frame;
      if (f == ~0u) return i;
      if (FrameInPrefetchWindow(display_frame, num_frames, f)) continue;
      uint32_t dist = (display_frame + num_frames - f) % num_frames;
      if (best < 0 || dist > best_dist) {
        best = i;
        best_dist = dist;
      }
    }
    return best;
  }

  bool AdvanceBmpColumnLoad(FileReader* file, StripColumnBmpInfo* bmp, int source_height,
                            int buf, uint32_t frame_index) {
    if (!file->IsOpen()) return false;
    if (loading_buf_ != buf || loading_frame_ != frame_index) {
      loading_buf_ = buf;
      loading_frame_ = frame_index;
      rows_loaded_ = 0;
      memset(frames_[buf].data, 0, sizeof(frames_[buf].data));
      frames_[buf].frame = ~0u;
    }
    int row_end = rows_loaded_ + STRIP_COLUMN_BMP_ROWS_PER_RUN;
    if (row_end > source_height) row_end = source_height;
    if (!StripColumnBmpLoadColumnRows(file, bmp, frame_index, rows_loaded_, row_end,
                                      frames_[buf].data, STRIP_COLUMN_RECORD_SIZE)) {
      loading_buf_ = -1;
      rows_loaded_ = 0;
      return false;
    }
    rows_loaded_ = row_end;
    if (rows_loaded_ >= source_height) {
      frames_[buf].frame = frame_index;
      loading_buf_ = -1;
      rows_loaded_ = 0;
      return true;
    }
    return false;
  }

  StripColumnFrameSlot frames_[STRIP_COLUMN_FRAME_RING_SIZE];
  int current_;
  int loading_buf_;
  int rows_loaded_;
  uint32_t loading_frame_;
  uint32_t last_swap_ms_;
};

template<class SOURCE_HEIGHT, class FPS>
class StripColumnL {
public:
  StripColumnL() : opened_(false), height_warned_(false), open_fail_logged_(false),
                   open_ok_logged_(false), num_frames_(0), num_leds_(0), source_height_(0),
                   frame_ms_(33), header_ok_(false) {
    path_[0] = 0;
    memset(&bmp_info_, 0, sizeof(bmp_info_));
  }

  bool run(BladeBase* blade) {
    height_.run(blade);
    fps_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    source_height_ = clampi32(height_.getInteger(0), 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    int fps = clampi32(fps_.getInteger(0), 1, 240);
    frame_ms_ = clampi32(1000 / fps, 1, 60000);

    // Do not touch SD for BMP until saber is on — opening/reading here blocks the whole
    // Looper (buttons dead) while accent PWM may already be running.
    if (!opened_) {
      if (!SaberBase::IsOn()) return true;
      if (!header_ok_) {
        const char* p = StripColumnPath::Get();
        if (p && p[0]) {
          strncpy(path_, p, sizeof(path_) - 1);
          path_[sizeof(path_) - 1] = 0;
        }
        if (!path_[0]) {
          if (!open_fail_logged_) {
            open_fail_logged_ = true;
            STDERR << "strip_column: empty file path (layer transparent)\n";
          }
          return true;
        }
        LOCK_SD(true);
        if (!file_.Open(path_)) {
          LOCK_SD(false);
          if (!open_fail_logged_) {
            open_fail_logged_ = true;
            STDERR << "strip_column: missing SD file " << path_ << " (layer transparent)\n";
          }
          return true;
        }
        file_.Seek(0);
        if (!StripColumnBmpParseHeader(&file_, &bmp_info_)) {
          STDERR << "strip_column: need 24-bit uncompressed BMP\n";
          file_.Close();
        } else {
          num_frames_ = bmp_info_.width;
          if (num_frames_ == 0) num_frames_ = 1;
          WarnSourceHeightVsBmp();
          header_ok_ = true;
          if (!open_ok_logged_) {
            open_ok_logged_ = true;
            STDERR << "strip_column: opened " << path_ << " frames=" << num_frames_
                   << " bmp=" << bmp_info_.width << "x" << bmp_info_.height << "\n";
          }
        }
        LOCK_SD(false);
      }
      if (header_ok_ && !opened_) {
        if (cache_.LoadFrameSlice(&file_, &bmp_info_, source_height_, 0, 0)) {
          opened_ = true;
          cache_.OnFirstFrameReady();
        }
        return true;
      }
    }

    if (opened_) WarnSourceHeightVsBmp();

    if (!opened_ || num_leds_ <= 0) return true;

    cache_.Tick(&file_, &bmp_info_, source_height_, frame_ms_, num_frames_);
    return true;
  }

  SimpleColor getColor(int led) {
    if (!opened_ || num_leds_ <= 0) return Black().getColor(led);
    const uint8_t* data = cache_.DisplayData();
    uint8_t r, g, b;
    StripColumnSampleAtLed(data, led, num_leds_, source_height_, &r, &g, &b);
    return SimpleColor(Color16(sqr(r), sqr(g), sqr(b)));
  }

private:
  uint16_t sqr(uint8_t x) { return (uint16_t)x * x; }

  void WarnSourceHeightVsBmp() {
    if (height_warned_) return;
    if (source_height_ > (int)bmp_info_.height) {
      height_warned_ = true;
      STDERR << "strip_column: source_height " << source_height_
             << " exceeds BMP height " << bmp_info_.height << " (clamping)\n";
    }
  }

  SOURCE_HEIGHT height_;
  FPS fps_;
  char path_[128];
  FileReader file_;
  StripColumnColumnCache cache_;
  bool opened_;
  bool height_warned_;
  bool open_fail_logged_;
  bool open_ok_logged_;
  StripColumnBmpInfo bmp_info_;
  uint32_t num_frames_;
  int num_leds_;
  int source_height_;
  int frame_ms_;
  bool header_ok_;
};

template<class SOURCE_HEIGHT, class FPS, class EXTEND_MS, class RETRACT_MS>
StyleAllocator StyleStripColumnBendPtrX() {
  return StylePtr<InOutTrBendAuto<
    StripColumnL<SOURCE_HEIGHT, FPS>,
    EXTEND_MS,
    RETRACT_MS>>();
}

class StripColumnFactory : public StyleFactory {
public:
  BladeStyle* make() override {
    if (!CurrentArgParser) return nullptr;
    const char* path = CurrentArgParser->GetArg(1, "FILE", "");
    StripColumnPath::Set(path);
    return StyleStripColumnBendPtrX<
      IntArg<2, 144>,
      IntArg<3, 30>,
      IntArg<4, 300>,
      IntArg<5, 800>>()->make();
  }
};

static StripColumnFactory strip_column_factory;

#endif  // STYLES_STRIP_COLUMN_H
