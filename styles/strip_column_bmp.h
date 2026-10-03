#ifndef STYLES_STRIP_COLUMN_BMP_H
#define STYLES_STRIP_COLUMN_BMP_H

// Reads ordinary 24-bit uncompressed BMP files from SD (GIMP/Photoshop export).
//
// Frame axis is selected in style args (frames_x | frames_y), not inferred from W/H.
//
// frames_y (default) — time along BMP height, blade along width (e.g. 144×120 = 120 frames):
//   |biHeight| = frame count; biWidth = blade pixels; one BMP row per animation frame.
//
// frames_x — time along width, blade along height (e.g. 27×144 plasma):
//   biWidth = frame count; |biHeight| = blade pixels; one vertical column per frame.

#include "../common/file_reader.h"
#include "../common/looper.h"
#include "../common/stdout.h"
#ifdef ENABLE_AUDIO
#include "../sound/audio_stream_work.h"
#else
#define LOCK_SD(X) do { (void)(X); } while(0)
#endif
#include <stdint.h>
#include <string.h>

enum StripColumnBmpFrameAxis : uint8_t {
  STRIP_COLUMN_FRAMES_ALONG_X = 0,
  STRIP_COLUMN_FRAMES_ALONG_Y = 1,
};

#ifndef STRIP_COLUMN_BMP_DEFAULT_FRAME_AXIS
#define STRIP_COLUMN_BMP_DEFAULT_FRAME_AXIS STRIP_COLUMN_FRAMES_ALONG_Y
#endif

#ifndef STRIP_COLUMN_BMP_MAX_ROW_READ
#define STRIP_COLUMN_BMP_MAX_ROW_READ 512
#endif

struct StripColumnBmpInfo {
  uint32_t width;
  uint32_t height;
  bool top_down;
  uint32_t row_stride;
  uint32_t pixel_offset;
};

inline bool StripColumnBmpTokenEquals(const char* a, const char* b) {
  if (!a || !b) return false;
  while (*a && *b) {
    char ca = *a++;
    char cb = *b++;
    if (ca >= 'A' && ca <= 'Z') ca = (char)(ca + ('a' - 'A'));
    if (cb >= 'A' && cb <= 'Z') cb = (char)(cb + ('a' - 'A'));
    if (ca != cb) return false;
  }
  return *a == 0 && *b == 0;
}

inline bool StripColumnParseFrameAxisToken(const char* tok, StripColumnBmpFrameAxis* out) {
  if (!tok || !tok[0] || !out) return false;
  if ((tok[0] >= '0' && tok[0] <= '9') || (tok[0] == '-' && tok[1] >= '0' && tok[1] <= '9'))
    return false;
  if (StripColumnBmpTokenEquals(tok, "frames_x") || StripColumnBmpTokenEquals(tok, "column") ||
      StripColumnBmpTokenEquals(tok, "columns")) {
    *out = STRIP_COLUMN_FRAMES_ALONG_X;
    return true;
  }
  if (StripColumnBmpTokenEquals(tok, "frames_y") || StripColumnBmpTokenEquals(tok, "row") ||
      StripColumnBmpTokenEquals(tok, "rows")) {
    *out = STRIP_COLUMN_FRAMES_ALONG_Y;
    return true;
  }
  return false;
}

inline const char* StripColumnFrameAxisName(StripColumnBmpFrameAxis axis) {
  return axis == STRIP_COLUMN_FRAMES_ALONG_Y ? "frames_y" : "frames_x";
}

inline bool StripColumnBmpParseHeader(FileReader* f, StripColumnBmpInfo* info) {
  if (!f || !info) return false;
  memset(info, 0, sizeof(*info));
  f->Seek(0);
  if (f->Read() != 'B' || f->Read() != 'M') return false;

  f->Skip(8);
  uint32_t pixel_offset = f->ReadType<uint32_t>();
  uint32_t dib_size = f->ReadType<uint32_t>();
  if (dib_size < 40) return false;

  int32_t width = (int32_t)f->ReadType<uint32_t>();
  int32_t height = (int32_t)f->ReadType<uint32_t>();
  uint16_t planes = f->ReadType<uint16_t>();
  uint16_t bit_count = f->ReadType<uint16_t>();
  uint32_t compression = f->ReadType<uint32_t>();

  if (width <= 0 || planes != 1 || bit_count != 24 || compression != 0) return false;

  bool top_down = height < 0;
  uint32_t abs_height = (uint32_t)(height < 0 ? -height : height);
  if (abs_height == 0) return false;

  info->width = (uint32_t)width;
  info->height = abs_height;
  info->top_down = top_down;
  info->row_stride = ((info->width * 3u + 3u) / 4u) * 4u;
  info->pixel_offset = pixel_offset;
  return true;
}

inline uint32_t StripColumnBmpNumFrames(const StripColumnBmpInfo* info,
                                        StripColumnBmpFrameAxis axis) {
  if (!info) return 0;
  return axis == STRIP_COLUMN_FRAMES_ALONG_Y ? info->height : info->width;
}

inline uint32_t StripColumnBmpBladePixelsInFile(const StripColumnBmpInfo* info,
                                                StripColumnBmpFrameAxis axis) {
  if (!info) return 0;
  return axis == STRIP_COLUMN_FRAMES_ALONG_Y ? info->width : info->height;
}

inline bool StripColumnBmpLoadColumnRows(FileReader* f, const StripColumnBmpInfo* info,
                                         uint32_t column_index, int row_begin, int row_end,
                                         uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf || out_buf_size == 0) return false;
  if (column_index >= info->width) return false;
  if (row_begin < 0) row_begin = 0;
  if (row_end > (int)info->height) row_end = (int)info->height;
  if (row_begin >= row_end) return true;

  const uint32_t col_off = column_index * 3u;
  const bool row_read_ok = info->row_stride <= STRIP_COLUMN_BMP_MAX_ROW_READ &&
                           col_off + 3u <= info->row_stride;

  for (int logical_row = row_begin; logical_row < row_end; logical_row++) {
    if ((size_t)(logical_row + 1) * 3u > out_buf_size) return false;
    uint32_t file_row = info->top_down
                            ? (uint32_t)logical_row
                            : (info->height - 1u - (uint32_t)logical_row);
    uint8_t* px = out_buf + logical_row * 3;

    LOCK_SD(true);
    if (row_read_ok) {
      uint8_t row_buf[STRIP_COLUMN_BMP_MAX_ROW_READ];
      uint32_t pos = info->pixel_offset + file_row * info->row_stride;
      f->Seek(pos);
      int got = f->Read(row_buf, (int)info->row_stride);
      LOCK_SD(false);
      if (got != (int)info->row_stride) return false;
      px[0] = row_buf[col_off + 2];
      px[1] = row_buf[col_off + 1];
      px[2] = row_buf[col_off];
    } else {
      uint32_t pos = info->pixel_offset + file_row * info->row_stride + col_off;
      f->Seek(pos);
      int got = f->Read(px, 3);
      LOCK_SD(false);
      if (got != 3) return false;
      uint8_t b = px[0];
      px[0] = px[2];
      px[2] = b;
    }
    Looper::DoHFLoop();
  }
  return true;
}

// frames_y: one animation frame = one BMP row; copy width pixels into column buffer (row 0 = hilt).
inline bool StripColumnBmpLoadFrameAlongY(FileReader* f, const StripColumnBmpInfo* info,
                                          uint32_t frame_index, int source_height,
                                          uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf || out_buf_size == 0) return false;
  if (frame_index >= info->height) return false;
  if (source_height < 0) source_height = 0;
  if (source_height > (int)info->width) source_height = (int)info->width;

  uint32_t file_row =
      info->top_down ? frame_index : (info->height - 1u - frame_index);

  LOCK_SD(true);
  uint8_t row_buf[STRIP_COLUMN_BMP_MAX_ROW_READ];
  if (info->row_stride > STRIP_COLUMN_BMP_MAX_ROW_READ) {
    LOCK_SD(false);
    return false;
  }
  uint32_t pos = info->pixel_offset + file_row * info->row_stride;
  f->Seek(pos);
  int got = f->Read(row_buf, (int)info->row_stride);
  LOCK_SD(false);
  if (got != (int)info->row_stride) return false;

  memset(out_buf, 0, out_buf_size);
  for (int i = 0; i < source_height; i++) {
    if ((size_t)(i + 1) * 3u > out_buf_size) return false;
    uint32_t off = (uint32_t)i * 3u;
    uint8_t* px = out_buf + i * 3;
    px[0] = row_buf[off + 2];
    px[1] = row_buf[off + 1];
    px[2] = row_buf[off];
  }
  Looper::DoHFLoop();
  return true;
}

inline bool StripColumnBmpLoadFrameSlice(FileReader* f, const StripColumnBmpInfo* info,
                                         StripColumnBmpFrameAxis axis, uint32_t frame_index,
                                         int row_begin, int row_end, int source_height,
                                         uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf) return false;
  if (axis == STRIP_COLUMN_FRAMES_ALONG_Y) {
    if (row_begin != 0) return false;
    return StripColumnBmpLoadFrameAlongY(f, info, frame_index, source_height, out_buf,
                                         out_buf_size);
  }
  return StripColumnBmpLoadColumnRows(f, info, frame_index, row_begin, row_end, out_buf,
                                      out_buf_size);
}

// frames_x helper: load one vertical column (legacy tests and static masks).
inline bool StripColumnBmpLoadColumn(FileReader* f, const StripColumnBmpInfo* info,
                                     uint32_t column_index, int source_height,
                                     uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf || out_buf_size == 0) return false;
  memset(out_buf, 0, out_buf_size);
  if (column_index >= info->width) return false;
  int rows = source_height;
  if (rows > (int)info->height) rows = (int)info->height;
  if (rows < 0) rows = 0;
  return StripColumnBmpLoadColumnRows(f, info, column_index, 0, rows, out_buf, out_buf_size);
}

#endif  // STYLES_STRIP_COLUMN_BMP_H
