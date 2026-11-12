#ifndef STYLES_STRIP_COLUMN_H
#define STYLES_STRIP_COLUMN_H

// Strip column animation base (composable config layer-0).
//
// Media is a 24-bit uncompressed Windows BMP or an uncompressed true-color TGA.
// The format comes from the file header, not the filename.
// SD path relative to card root, e.g. animations/plasma.bmp (quote if the path has spaces)
//   width  = blade length in pixels (left of a row = hilt), capped at 192
//   height = number of animation frames (one horizontal row per frame)
//
// Each reader writes a normalized RGBA row. BMP alpha is 255. TGA 32-bit keeps the
// file opacity byte, and the shared sampler blends it. Rendering does not branch
// on the file type after the row is read.
//
// source_height in the style args is that width. If it exceeds the file, pixels are
// clamped and a serial warning is logged. A file wider than 192 along the blade is
// ignored. Blade LEDs resample the row with linear interpolation (hilt/tip aligned).
//
// Named style: strip_column
//   strip_column <sd_path> <source_height> <fps> [frames_y] [extend_ms] [retract_ms]
//   Optional frames_y / row / rows is accepted and ignored. frames_x is rejected.
//   extend_ms / retract_ms: use -1 to match ignition / retraction sound length.
// Example (config layer base):
//   layer = strip_column animations/cyan-plasma.bmp 144 30 {{ext}} {{ret}}
//
// Stack multiply / clash / lockup overlays via additional layer = lines as today.
//
// Missing/invalid image: scrolling strobe red bands (two sweeps up, two down) instead of a blank base.

#include "bend_inout.h"
#include "../colors.h"
#include "../style_ptr.h"
#include "strip_column_image.h"
#include "strip_column_fallback.h"
#include "../../common/file_reader.h"
#include "../../common/math.h"
#include "../../blades/blade_base.h"
#include "../../common/saber_base.h"
#include "../../common/stdout.h"

inline bool StripColumnOpenPath(FileReader* file, const char* path) {
  if (!file || !path || !path[0]) return false;
  if (file->Open(path)) return true;
  if (path[0] != '/') {
    char slash_path[129];
    slash_path[0] = '/';
    strncpy(slash_path + 1, path, sizeof(slash_path) - 2);
    slash_path[sizeof(slash_path) - 1] = 0;
    return file->Open(slash_path);
  }
  return false;
}
#ifdef ENABLE_AUDIO
#include "../../sound/audio_stream_work.h"
#else
#define LOCK_SD(X) do { (void)(X); } while(0)
#endif

#ifndef STRIP_COLUMN_FRAME_RING_SIZE
#define STRIP_COLUMN_FRAME_RING_SIZE 8
#endif
#if STRIP_COLUMN_FRAME_RING_SIZE < 2
#error STRIP_COLUMN_FRAME_RING_SIZE must be at least 2
#endif
#ifndef STRIP_COLUMN_TICK_MAX_LOAD_SLICES
#define STRIP_COLUMN_TICK_MAX_LOAD_SLICES 1
#endif
// Start the next multi-row read when this many frames, or fewer,
// are already buffered strictly ahead of the displayed frame. Steady state
// refills at 2, so one extra frame is still queued while the card read runs.
#ifndef STRIP_COLUMN_Y_AHEAD_WATERMARK
#define STRIP_COLUMN_Y_AHEAD_WATERMARK 2
#endif
// Only if EFFECT_RETRACTION sound_length is 0. Matches this style's default retract_ms.
#ifndef STRIP_COLUMN_RETRACT_FALLBACK_MS
#define STRIP_COLUMN_RETRACT_FALLBACK_MS 800
#endif
#include "../../functions/int_arg.h"
#include <string.h>
#include "config_play_cue.h"
#include "strip_column_pool.h"

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

inline bool StripColumnShouldReleaseMedia(BladeBase* blade) {
  (void)blade;
  return !SaberBase::IsOn();
}

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

// File byte 255 is fully opaque (32768). Anything lower blends in the compositor.
inline uint16_t StripColumnAlpha8To15(uint8_t a) {
  if (a == 255) return 32768;
  return (uint16_t)(((uint32_t)a * 32768u) / 255u);
}

// Linear RGBA8 sample at LED position. Caller applies gamma (sqr) to RGB only.
// Alpha stays linear so a TGA opacity byte actually blends.
inline void StripColumnSampleAtLed(const uint8_t* data, int led, int num_leds, int source_height,
                                   uint8_t* r, uint8_t* g, uint8_t* b, uint8_t* a) {
  int row_low = 0;
  int frac15 = 0;
  StripColumnMapLed(led, num_leds, source_height, &row_low, &frac15);
  int idx0 = row_low * STRIP_COLUMN_PIXEL_BYTES;
  if (idx0 + 3 >= source_height * STRIP_COLUMN_PIXEL_BYTES) {
    *r = *g = *b = *a = 0;
    return;
  }
  if (frac15 == 0 || row_low >= source_height - 1) {
    *r = data[idx0];
    *g = data[idx0 + 1];
    *b = data[idx0 + 2];
    *a = data[idx0 + 3];
    return;
  }
  int idx1 = idx0 + STRIP_COLUMN_PIXEL_BYTES;
  *r = StripColumnLerpChannel(data[idx0], data[idx1], frac15);
  *g = StripColumnLerpChannel(data[idx0 + 1], data[idx1 + 1], frac15);
  *b = StripColumnLerpChannel(data[idx0 + 2], data[idx1 + 2], frac15);
  *a = StripColumnLerpChannel(data[idx0 + 3], data[idx1 + 3], frac15);
}

inline void StripColumnSampleAtLed(const uint8_t* data, int led, int num_leds, int source_height,
                                   uint8_t* r, uint8_t* g, uint8_t* b) {
  uint8_t a = 0;
  StripColumnSampleAtLed(data, led, num_leds, source_height, r, g, b, &a);
}

// Multi-slot column cache: display one frame, prefetch up to RING_SIZE-1 ahead.
// Each slot is a fixed 192*4 RGBA8 row. A base picture owns a private ring.
// An event picture checks a ring out of the shared pool.
class StripColumnColumnCache {
public:
  StripColumnColumnCache()
      : frames_(nullptr), current_(0), loading_buf_(-1), rows_loaded_(0),
        loading_frame_(0), last_swap_ms_(0), pool_epoch_(0), ring_from_pool_(false),
        use_event_pool_(false) {}

  ~StripColumnColumnCache() { ReleaseStorage(); }

  StripColumnColumnCache(const StripColumnColumnCache&) = delete;
  StripColumnColumnCache& operator=(const StripColumnColumnCache&) = delete;

  bool allocated() const { return frames_ != nullptr; }

  // Event images check out a pool ring. Base images keep a private ring.
  void UseEventPool(bool on) { use_event_pool_ = on; }
  bool HoldingEventRing() const { return ring_from_pool_ && frames_ != nullptr; }

  bool EnsureStorage() {
    if (frames_ && ring_from_pool_ == use_event_pool_) return true;
    if (frames_) ReleaseStorage();
    StripColumnFrameSlot* born = nullptr;
    uint32_t epoch = 0;
    bool from_pool = false;
    if (use_event_pool_) {
      born = StripColumnEventPoolAcquire(&epoch);
      if (!born) return false;
      from_pool = true;
    } else {
      born = new StripColumnFrameSlot[STRIP_COLUMN_FRAME_RING_SIZE];
      if (!born) return false;
    }
    frames_ = born;
    pool_epoch_ = epoch;
    ring_from_pool_ = from_pool;
    current_ = 0;
    ClearAllSlots();
    return true;
  }

  // Null this cache before the ring is released or deleted, so later reads
  // and writes in this layer see no buffer. Event rings stay allocated in
  // the pool until 2 seconds after the last holder drops them.
  void ReleaseStorage() {
    StripColumnFrameSlot* dying = frames_;
    bool from_pool = ring_from_pool_;
    uint32_t epoch = pool_epoch_;
    frames_ = nullptr;
    ring_from_pool_ = false;
    pool_epoch_ = 0;
    current_ = 0;
    loading_buf_ = -1;
    rows_loaded_ = 0;
    loading_frame_ = 0;
    if (!dying) return;
    if (from_pool) StripColumnEventPoolRelease(dying, epoch);
    else delete[] dying;
  }

  void ClearAllSlots() {
    loading_buf_ = -1;
    rows_loaded_ = 0;
    loading_frame_ = 0;
    if (!frames_) return;
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++)
      frames_[i].frame = ~0u;
  }

  void OnFirstFrameReady() {
    if (!frames_) return;
    current_ = 0;
    last_swap_ms_ = millis();
    for (int i = 1; i < STRIP_COLUMN_FRAME_RING_SIZE; i++)
      frames_[i].frame = ~0u;
  }

  const uint8_t* DisplayData() const {
    if (!frames_) return nullptr;
    return frames_[current_].data;
  }

  // +1 plays frame 0 toward the last row. -1 plays back toward row 0.
  // A direction change drops prefetched slots and keeps the frame on screen.
  void NoteDirection(int direction) {
    int d = direction < 0 ? -1 : 1;
    if (d == direction_) return;
    direction_ = d;
    if (!frames_) {
      loading_buf_ = -1;
      rows_loaded_ = 0;
      return;
    }
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (i == current_) continue;
      frames_[i].frame = ~0u;
    }
    loading_buf_ = -1;
    rows_loaded_ = 0;
  }

  bool LoadFrameSlice(FileReader* file, const StripColumnImageInfo* image,
                      int source_height, int buf, uint32_t frame_index) {
    if (!EnsureStorage()) return false;
    return AdvanceColumnLoad(file, image, source_height, buf, frame_index);
  }

  // Show one absolute frame. Used when a wipe scrubs the file instead of looping.
  bool ShowFrame(FileReader* file, const StripColumnImageInfo* image,
                 int source_height, uint32_t frame_index) {
    if (!file || !image || !EnsureStorage() || !frames_) return false;
    if (current_ < 0 || current_ >= STRIP_COLUMN_FRAME_RING_SIZE) current_ = 0;
    if (frames_[current_].frame == frame_index) return true;
    ClearAllSlots();
    if (!LoadFrameSlice(file, image, source_height, 0, frame_index) || !frames_) return false;
    current_ = 0;
    last_swap_ms_ = millis();
    return frames_[0].frame == frame_index;
  }

  // One animation tick: swap when ready, then one SD load.
  // direction +1 walks rows 0 → n. direction -1 walks n → 0.
  // That load is one multi-row read once the ahead-watermark is hit.
  void Tick(FileReader* file, const StripColumnImageInfo* image,
            int source_height, int frame_ms, uint32_t num_frames, int direction = 1,
            bool fit_once = false) {
    if (!file || !image || num_frames == 0 || !frames_) return;
    if (current_ < 0 || current_ >= STRIP_COLUMN_FRAME_RING_SIZE) return;
    fit_once_ = fit_once;
    NoteDirection(direction);
    if (frames_[current_].frame == ~0u) return;

    for (int pass = 0; pass < STRIP_COLUMN_TICK_MAX_LOAD_SLICES; pass++) {
      uint32_t display_frame = frames_[current_].frame;
      uint32_t now = millis();
      uint32_t next_display = AheadFrame(display_frame, 1, num_frames);
      // Fit-to-window holds the last row instead of looping back to row 0.
      bool wrapped = direction_ >= 0 ? (next_display < display_frame)
                                     : (next_display > display_frame);
      if (fit_once && wrapped) return;
      for (int s = 0; s < STRIP_COLUMN_FRAME_RING_SIZE; s++) {
        if (frames_[s].frame == next_display &&
            (int32_t)(now - last_swap_ms_) >= (uint32_t)frame_ms) {
          current_ = s;
          last_swap_ms_ = now;
          break;
        }
      }

      if (loading_buf_ >= 0) {
        AdvanceColumnLoad(file, image, source_height, loading_buf_, loading_frame_);
        if (loading_buf_ >= 0) return;
        continue;
      }

      PrefetchFramesAlongY(file, image, source_height, num_frames);
      return;
    }
  }

private:
  // offset 0 is the displayed frame. Positive offsets walk the play direction.
  uint32_t AheadFrame(uint32_t frame, uint32_t offset, uint32_t num_frames) const {
    if (num_frames == 0) return 0;
    offset %= num_frames;
    if (offset == 0) return frame;
    if (direction_ >= 0) return (frame + offset) % num_frames;
    return (frame + num_frames - offset) % num_frames;
  }

  bool SlotHasCompleteFrame(uint32_t frame_index) const {
    if (!frames_) return false;
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (frames_[i].frame == frame_index) return true;
    }
    return false;
  }

  // How many complete frames sit in a row immediately after the displayed frame.
  int CountBufferedAhead(uint32_t display_frame, uint32_t num_frames) const {
    int limit = STRIP_COLUMN_FRAME_RING_SIZE - 1;
    if ((int)num_frames - 1 < limit) limit = (int)num_frames - 1;
    int n = 0;
    for (int offset = 1; offset <= limit; offset++) {
      uint32_t want = AheadFrame(display_frame, (uint32_t)offset, num_frames);
      if (!SlotHasCompleteFrame(want)) break;
      n++;
    }
    return n;
  }

  // Tick load. Card stays idle while more than STRIP_COLUMN_Y_AHEAD_WATERMARK
  // frames are already buffered strictly ahead of the playhead. At the watermark
  // (and when nothing is queued yet), one seek reads up to STRIP_COLUMN_BMP_Y_BULK_ROWS
  // upcoming rows, or fewer when fewer ring slots are free.
  void PrefetchFramesAlongY(FileReader* file, const StripColumnImageInfo* image,
                            int source_height, uint32_t num_frames) {
    if (!frames_) return;
    uint32_t display_frame = frames_[current_].frame;
    int ahead = CountBufferedAhead(display_frame, num_frames);
    if (ahead > STRIP_COLUMN_Y_AHEAD_WATERMARK) return;
    if (!file->IsOpen()) return;

    uint32_t wants[STRIP_COLUMN_BMP_Y_BULK_ROWS];
    int slots[STRIP_COLUMN_BMP_Y_BULK_ROWS];
    uint8_t* outs[STRIP_COLUMN_BMP_Y_BULK_ROWS];
    int n = 0;
    const int cap = STRIP_COLUMN_BMP_Y_BULK_ROWS;
    for (int k = 0; n < cap; k++) {
      int offset = ahead + 1 + k;
      if ((uint32_t)offset > num_frames) break;
      uint32_t want = AheadFrame(display_frame, (uint32_t)offset, num_frames);
      if (want == display_frame) break;
      if (fit_once_ && direction_ >= 0 && want <= display_frame) break;
      if (fit_once_ && direction_ < 0 && want >= display_frame) break;
      if (SlotHasCompleteFrame(want)) break;
      int slot = PickSlotForLoad(display_frame, num_frames, slots, n);
      if (slot < 0) break;
      wants[n] = want;
      slots[n] = slot;
      outs[n] = frames_[slot].data;
      n++;
    }
    if (n < 1) return;

    if (StripColumnLoadFrameRows(file, image, wants, n, source_height, outs,
                                STRIP_COLUMN_RECORD_SIZE)) {
      for (int i = 0; i < n; i++) frames_[slots[i]].frame = wants[i];
      loading_buf_ = -1;
      rows_loaded_ = 0;
      return;
    }

    // Non-contiguous rows (loop wrap) or a short bulk read: one frame only.
    AdvanceColumnLoad(file, image, source_height, slots[0], wants[0]);
  }

  bool FrameInPrefetchWindow(uint32_t display_frame, uint32_t num_frames,
                             uint32_t candidate) const {
    for (int offset = 1; offset < STRIP_COLUMN_FRAME_RING_SIZE; offset++) {
      if (AheadFrame(display_frame, (uint32_t)offset, num_frames) == candidate) return true;
    }
    return false;
  }

  bool SlotSkipped(int idx, const int* skip, int skip_n) const {
    if (idx == current_ || idx == loading_buf_) return true;
    if (!skip || skip_n <= 0) return false;
    for (int s = 0; s < skip_n; s++) {
      if (skip[s] == idx) return true;
    }
    return false;
  }

  int PickSlotForLoad(uint32_t display_frame, uint32_t num_frames,
                      const int* skip = nullptr, int skip_n = 0) const {
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (SlotSkipped(i, skip, skip_n)) continue;
      if (frames_[i].frame == ~0u) return i;
    }
    // Prefer evicting the oldest frame behind the playhead (not in prefetch window).
    int best = -1;
    uint32_t best_dist = 0;
    for (int i = 0; i < STRIP_COLUMN_FRAME_RING_SIZE; i++) {
      if (SlotSkipped(i, skip, skip_n)) continue;
      uint32_t f = frames_[i].frame;
      if (f == ~0u) return i;
      if (FrameInPrefetchWindow(display_frame, num_frames, f)) continue;
      uint32_t dist = direction_ >= 0
                          ? (display_frame + num_frames - f) % num_frames
                          : (f + num_frames - display_frame) % num_frames;
      if (best < 0 || dist > best_dist) {
        best = i;
        best_dist = dist;
      }
    }
    return best;
  }

  bool AdvanceColumnLoad(FileReader* file, const StripColumnImageInfo* image,
                        int source_height, int buf, uint32_t frame_index) {
    if (!frames_ || !file->IsOpen()) return false;
    if (buf < 0 || buf >= STRIP_COLUMN_FRAME_RING_SIZE) {
      loading_buf_ = -1;
      return false;
    }
    loading_buf_ = buf;
    loading_frame_ = frame_index;
    rows_loaded_ = 0;
    memset(frames_[buf].data, 0, sizeof(frames_[buf].data));
    frames_[buf].frame = ~0u;
    if (!StripColumnLoadFrameRow(file, image, frame_index, source_height,
                                 frames_[buf].data, STRIP_COLUMN_RECORD_SIZE)) {
      loading_buf_ = -1;
      frames_[buf].frame = ~0u;
      return false;
    }
    frames_[buf].frame = frame_index;
    loading_buf_ = -1;
    return true;
  }

  StripColumnFrameSlot* frames_;
  int current_;
  int loading_buf_;
  int rows_loaded_;
  uint32_t loading_frame_;
  uint32_t last_swap_ms_;
  int direction_ = 1;
  bool fit_once_ = false;
  uint32_t pool_epoch_;
  bool ring_from_pool_;
  bool use_event_pool_;
};

template<class SOURCE_HEIGHT, class FPS>
class StripColumnL {
public:
  StripColumnL() : opened_(false), bmp_missing_(false), show_missing_fallback_(false),
                   height_warned_(false), open_fail_logged_(false),
                   open_ok_logged_(false), num_frames_(0), num_leds_(0), source_height_(0),
                   frame_ms_(33), event_window_ms_(0), event_driven_(false), header_ok_(false),
                   was_on_(false),
                   retract_armed_(false), retract_deadline_ms_(0) {
    path_[0] = 0;
    // Capture this layer's file now. StripColumnPath is shared, and run()
    // must not replace a non-empty path_ from it later.
    const char* pending = StripColumnPath::Get();
    if (pending && pending[0]) {
      strncpy(path_, pending, sizeof(path_) - 1);
      path_[sizeof(path_) - 1] = 0;
    }
    memset(&image_, 0, sizeof(image_));
  }

  void ReleasePlayback() {
    if (file_.IsOpen()) file_.Close();
    opened_ = false;
    cache_.ReleaseStorage();
    event_window_ms_ = 0;
    show_missing_fallback_ = false;
  }

  bool run(BladeBase* blade) {
    // Idle event rings free 2 seconds after their last holder drops them.
    // This picture's private ring is not in that pool.
    StripColumnEventPoolSweep();
    int cue_window = 0;
    if (ConfigPlayCue::ConsumeRelease()) {
      ReleasePlayback();
      event_driven_ = false;
      cache_.UseEventPool(false);
      return true;
    }
    if (ConfigPlayCue::ConsumeRestart(&cue_window)) {
      event_driven_ = true;
      event_window_ms_ = cue_window;
      cache_.UseEventPool(true);
      if (file_.IsOpen()) file_.Close();
      opened_ = false;
      // A retrigger keeps the ring this picture already holds.
      if (cache_.HoldingEventRing()) cache_.ClearAllSlots();
      else cache_.ReleaseStorage();
    }
    cache_.UseEventPool(event_driven_);
    height_.run(blade);
    fps_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    source_height_ = clampi32(height_.getInteger(0), 1, STRIP_COLUMN_MAX_SOURCE_HEIGHT);
    int fps = clampi32(fps_.getInteger(0), 1, 240);
    frame_ms_ = clampi32(1000 / fps, 1, 60000);

    // IsOn() is false for the whole retract, and the driver can leave
    // is_powered() true after the wipe just to keep the style loop running.
    // Latch a deadline on the true→false edge (retraction wav length, same
    // sound_length WavLen reads). Tick only until that deadline, then close
    // the SD file. Do not open SD before the first ignite.
    const bool on = SaberBase::IsOn();
    if (on) {
      was_on_ = true;
      retract_armed_ = false;
    } else if (was_on_) {
      was_on_ = false;
      retract_deadline_ms_ = millis() + (uint32_t)RetractionLengthMs(blade);
      retract_armed_ = opened_;
    }
    bool retract_ticking = false;
    if (retract_armed_) {
      retract_ticking = (int32_t)(retract_deadline_ms_ - millis()) > 0;
      if (!retract_ticking) retract_armed_ = false;
    }
    show_missing_fallback_ = bmp_missing_ && (event_driven_ || on || retract_ticking);

    // A base column frees its private ring once the blade is fully off. An event
    // overlay keeps its pool ring for the window, including preon while IsOn() is false.
    if (!event_driven_ && !(on || retract_ticking)) {
      ReleasePlayback();
      return true;
    }

    // Do not touch SD until the saber is on — opening/reading here blocks the whole
    // Looper (buttons dead) while accent PWM may already be running.
    if (!opened_) {
      // path_ was copied from StripColumnPath in the constructor. That buffer
      // is one static string, so after the style is built it is only the last
      // column's file. Keep a path this layer already holds across open,
      // retract, and the next ignition. Fill from the static buffer only when
      // this layer never captured one.
      if (!path_[0]) {
        const char* p = StripColumnPath::Get();
        if (p && p[0]) {
          strncpy(path_, p, sizeof(path_) - 1);
          path_[sizeof(path_) - 1] = 0;
        }
      }
      if (!path_[0]) {
        bmp_missing_ = true;
        if (!open_fail_logged_) {
          open_fail_logged_ = true;
          STDOUT << "strip_column: empty file path (danger fallback pattern)\n";
        }
        return true;
      }
      LOCK_SD(true);
      if (!header_ok_) {
        if (!StripColumnOpenPath(&file_, path_)) {
          LOCK_SD(false);
          bmp_missing_ = true;
          if (!open_fail_logged_) {
            open_fail_logged_ = true;
            STDOUT << "strip_column: missing SD file " << path_
                   << " (danger fallback pattern)\n";
          }
          return true;
        }
        file_.Seek(0);
        StripColumnImageStatus image_status = StripColumnReadImageHeader(&file_, &image_);
        if (image_status != STRIP_COLUMN_IMAGE_OK) {
          bmp_missing_ = true;
          if (!open_fail_logged_) {
            open_fail_logged_ = true;
            if (image_status == STRIP_COLUMN_IMAGE_TOO_LONG) {
              STDOUT << "strip_column: blade length " << image_.width
                     << " exceeds " << STRIP_COLUMN_BLADE_PIXEL_CAP
                     << " (ignoring image)\n";
            } else {
              STDOUT << "strip_column: need 24-bit uncompressed BMP or uncompressed true-color TGA (danger fallback pattern)\n";
            }
          }
          file_.Close();
          LOCK_SD(false);
          return true;
        }
        num_frames_ = StripColumnImageNumFrames(&image_);
        if (num_frames_ == 0) num_frames_ = 1;
        WarnSourceHeightVsImage();
        header_ok_ = true;
        if (!open_ok_logged_) {
          open_ok_logged_ = true;
          const char* kind = image_.kind == STRIP_COLUMN_IMAGE_TGA ? "tga" : "bmp";
          STDOUT << "strip_column: opened " << path_ << " frames=" << num_frames_
                 << " " << kind << "=" << image_.width << "x" << image_.height << "\n";
        }
      } else if (!file_.IsOpen()) {
        StripColumnOpenPath(&file_, path_);
      }
      if (header_ok_ && !opened_) {
        cache_.ClearAllSlots();
        if (file_.IsOpen() &&
            cache_.LoadFrameSlice(&file_, &image_, source_height_, 0, 0)) {
          opened_ = true;
          bmp_missing_ = false;
          cache_.OnFirstFrameReady();
        } else if (header_ok_) {
          bmp_missing_ = true;
        }
      }
      LOCK_SD(false);
      return true;
    }

    if (opened_) WarnSourceHeightVsImage();

    if (!opened_ || num_leds_ <= 0) return true;

    if (!file_.IsOpen() && path_[0]) {
      LOCK_SD(true);
      StripColumnOpenPath(&file_, path_);
      LOCK_SD(false);
    }

    int use_ms = frame_ms_;
    bool fit = event_window_ms_ > 0 && num_frames_ > 1;
    if (fit) use_ms = clampi32(event_window_ms_ / (int)num_frames_, 1, 60000);
    int direction = event_driven_ ? 1 : (on ? 1 : -1);
    cache_.Tick(&file_, &image_, source_height_, use_ms,
                num_frames_, direction, fit);
    return true;
  }

  RGBA_um_nod getColor(int led) {
    if (opened_ && num_leds_ > 0 && source_height_ > 0) {
      const uint8_t* data = cache_.DisplayData();
      if (data) {
        uint8_t r, g, b, a;
        StripColumnSampleAtLed(data, led, num_leds_, source_height_, &r, &g, &b, &a);
        return RGBA_um_nod(Color16(sqr(r), sqr(g), sqr(b)), StripColumnAlpha8To15(a));
      }
    }
    if (show_missing_fallback_ && num_leds_ > 0) {
      return RGBA_um_nod(StripColumnMissingMediaColor(led, num_leds_, millis()), 32768);
    }
    return RGBA_um_nod(Color16(0, 0, 0), 32768);
  }

private:
  uint16_t sqr(uint8_t x) { return (uint16_t)x * x; }

  // WavLen<EFFECT_RETRACTION>: OneshotEffectDetector + effect->sound_length * 1000.
  int RetractionLengthMs(BladeBase* blade) const {
    int ms = 0;
    if (blade) {
      OneshotEffectDetector<EFFECT_RETRACTION> detector;
      BladeEffect* effect = detector.Find(blade);
      if (effect && effect->sound_length > 0)
        ms = (int)(effect->sound_length * 1000);
    }
    if (ms <= 0) ms = STRIP_COLUMN_RETRACT_FALLBACK_MS;
    return ms;
  }

  void WarnSourceHeightVsImage() {
    if (height_warned_) return;
    uint32_t blade_px = StripColumnImageBladePixels(&image_);
    if ((uint32_t)source_height_ > blade_px) {
      height_warned_ = true;
      STDOUT << "strip_column: source_height " << source_height_
             << " exceeds image blade span " << blade_px << " (clamping)\n";
    }
  }

  SOURCE_HEIGHT height_;
  FPS fps_;
  char path_[128];
  FileReader file_;
  StripColumnColumnCache cache_;
  bool opened_;
  bool bmp_missing_;
  bool show_missing_fallback_;
  bool height_warned_;
  bool open_fail_logged_;
  bool open_ok_logged_;
  StripColumnImageInfo image_;
  uint32_t num_frames_;
  int num_leds_;
  int source_height_;
  int frame_ms_;
  int event_window_ms_;
  bool event_driven_;
  bool header_ok_;
  bool was_on_;
  bool retract_armed_;
  uint32_t retract_deadline_ms_;
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
    const char* arg4 = CurrentArgParser->GetArg(4, "ARG", "");
    const bool layout_word = StripColumnLayoutWordSkipsArg(arg4);
    StripColumnWarnIfColumnsLayout(arg4);
    if (layout_word) {
      return StyleStripColumnBendPtrX<
        IntArg<2, 144>,
        IntArg<3, 30>,
        IntArg<5, 300>,
        IntArg<6, 800>>()->make();
    }
    return StyleStripColumnBendPtrX<
      IntArg<2, 144>,
      IntArg<3, 30>,
      IntArg<4, 300>,
      IntArg<5, 800>>()->make();
  }
};

static StripColumnFactory strip_column_factory;

#endif  // STYLES_STRIP_COLUMN_H
