#ifndef STYLES_STRIP_COLUMN_H
#define STYLES_STRIP_COLUMN_H

// Strip column animation base (composable config layer-0).
//
// End users: GIMP/Photoshop → 24-bit uncompressed BMP on SD (see strip_column_bmp.h).
// SD path relative to SD root:
//   .bmp — 24-bit BI_RGB uncompressed BMP (width = frame count, |height| = blade
//     column; row 0 = hilt at top of image).
//   .scf — optional maintainer fast path: 512-byte records (one SD block per frame);
//     scripts/scf_from_image.py can build .scf from PNG/BMP (not required for users).
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
#include "../common/stdout.h"
#include "../functions/int_arg.h"
#include <string.h>

#define STRIP_COLUMN_RECORD_SIZE 512
// Max RGB rows that fit in one 512-byte record (512 / 3).
#define STRIP_COLUMN_MAX_SOURCE_HEIGHT 170

// Set by StripColumnFactory immediately before Style construction (one path per make()).
class StripColumnPath {
public:
  static void Set(const char* path) {
    if (!path) path = "";
    strncpy(path_, path, sizeof(path_) - 1);
    path_[sizeof(path_) - 1] = 0;
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

template<class SOURCE_HEIGHT, class FPS>
class StripColumnL {
public:
  StripColumnL() : current_(0), back_ready_(false), opened_(false), use_bmp_(false),
                   height_warned_(false), num_frames_(0), num_leds_(0), source_height_(0),
                   frame_ms_(33) {
    path_[0] = 0;
    frames_[0].frame = frames_[1].frame = ~0u;
    memset(&bmp_info_, 0, sizeof(bmp_info_));
  }

  bool run(BladeBase* blade) {
    height_.run(blade);
    fps_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    source_height_ = clampi32(height_.getInteger(0), 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    int fps = clampi32(fps_.getInteger(0), 1, 240);
    frame_ms_ = clampi32(1000 / fps, 1, 60000);

    if (!opened_) {
      const char* p = StripColumnPath::Get();
      if (p && p[0]) {
        strncpy(path_, p, sizeof(path_) - 1);
        path_[sizeof(path_) - 1] = 0;
      }
      if (path_[0] && file_.Open(path_)) {
        int sig0 = file_.Read();
        int sig1 = file_.Read();
        if (sig0 == 'B' && sig1 == 'M') {
          file_.Seek(0);
          if (StripColumnBmpParseHeader(&file_, &bmp_info_)) {
            use_bmp_ = true;
            num_frames_ = bmp_info_.width;
            if (num_frames_ == 0) num_frames_ = 1;
            WarnSourceHeightVsBmp();
            opened_ = true;
          } else {
            file_.Close();
          }
        } else {
          file_.Seek(0);
          use_bmp_ = false;
          uint32_t sz = file_.FileSize();
          num_frames_ = sz / STRIP_COLUMN_RECORD_SIZE;
          if (num_frames_ == 0) num_frames_ = 1;
          opened_ = true;
        }
        if (opened_) {
          LoadFrameInto(0, 0);
          current_ = 0;
          back_ready_ = false;
          frames_[1].frame = ~0u;
        }
      }
    }

    if (opened_ && use_bmp_) WarnSourceHeightVsBmp();

    if (!opened_ || num_leds_ <= 0) return true;

    uint32_t want = (millis() / frame_ms_) % num_frames_;
    Frame& cur = frames_[current_];
    if (cur.frame != want) {
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
    return true;
  }

  SimpleColor getColor(int led) {
    if (!opened_ || num_leds_ <= 0) return Black().getColor(led);
    const uint8_t* data = frames_[current_].data;
    uint8_t r, g, b;
    StripColumnSampleAtLed(data, led, num_leds_, source_height_, &r, &g, &b);
    return SimpleColor(Color16(sqr(r), sqr(g), sqr(b)));
  }

private:
  struct Frame {
    uint32_t frame;
    uint8_t data[STRIP_COLUMN_RECORD_SIZE];
  };

  uint16_t sqr(uint8_t x) { return (uint16_t)x * x; }

  void WarnSourceHeightVsBmp() {
    if (!use_bmp_ || height_warned_) return;
    if (source_height_ > (int)bmp_info_.height) {
      height_warned_ = true;
      STDERR << "strip_column: source_height " << source_height_
             << " exceeds BMP height " << bmp_info_.height << " (clamping)\n";
    }
  }

  void LoadFrameInto(int buf, uint32_t frame_index) {
    if (!file_.IsOpen()) return;
    if (use_bmp_) {
      StripColumnBmpLoadColumn(&file_, &bmp_info_, frame_index, source_height_,
                               frames_[buf].data, STRIP_COLUMN_RECORD_SIZE);
    } else {
      file_.Seek(frame_index * (uint32_t)STRIP_COLUMN_RECORD_SIZE);
      file_.Read(frames_[buf].data, STRIP_COLUMN_RECORD_SIZE);
    }
    frames_[buf].frame = frame_index;
    Looper::DoHFLoop();
  }

  SOURCE_HEIGHT height_;
  FPS fps_;
  char path_[128];
  FileReader file_;
  Frame frames_[2];
  int current_;
  bool back_ready_;
  bool opened_;
  bool use_bmp_;
  bool height_warned_;
  StripColumnBmpInfo bmp_info_;
  uint32_t num_frames_;
  int num_leds_;
  int source_height_;
  int frame_ms_;
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
