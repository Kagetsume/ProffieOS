#ifndef STYLES_STRIP_COLUMN_TGA_H
#define STYLES_STRIP_COLUMN_TGA_H

// Uncompressed true-color TGA (image type 2). No RLE, no color map, no interleave.
//
// One row is one animation frame. Width is blade pixels, height is the frame count.
// Pixels on disk are BGR or BGRA, little-endian, left to right. The reader writes a
// normalized RGBA row straight into the caller's buffer: one sequential read, then the
// channel swap the format requires. 32-bit files keep the opacity byte. 24-bit files
// have no opacity byte, so alpha is 255.

#include "../../common/file_reader.h"
#include "../../common/looper.h"
#include "../../common/stdout.h"
#ifdef ENABLE_AUDIO
#include "../../sound/audio_stream_work.h"
#else
#ifndef LOCK_SD
#define LOCK_SD(X) do { (void)(X); } while(0)
#endif
#endif
#include <stdint.h>
#include <string.h>

#ifndef STRIP_COLUMN_BMP_Y_BULK_ROWS
#define STRIP_COLUMN_BMP_Y_BULK_ROWS 4
#endif

struct StripColumnTgaInfo {
  uint32_t width;
  uint32_t height;
  bool top_down;
  uint32_t row_stride;
  uint32_t pixel_offset;
  uint8_t bpp;
};

inline bool StripColumnTgaReadU8(FileReader* f, uint8_t* out) {
  int c = f->Read();
  if (c < 0) return false;
  *out = (uint8_t)c;
  return true;
}

inline bool StripColumnTgaReadU16(FileReader* f, uint16_t* out) {
  uint8_t lo, hi;
  if (!StripColumnTgaReadU8(f, &lo) || !StripColumnTgaReadU8(f, &hi)) return false;
  *out = (uint16_t)lo | ((uint16_t)hi << 8);
  return true;
}

// Little-endian header, left-to-right pixels, non-interleaved. Right-to-left and
// RLE are rejected so a row can be decoded forward in one pass.
inline bool StripColumnTgaParseHeader(FileReader* f, StripColumnTgaInfo* info) {
  if (!f || !info) return false;
  memset(info, 0, sizeof(*info));
  f->Seek(0);
  uint8_t id_len = 0, cmap_type = 0, image_type = 0;
  if (!StripColumnTgaReadU8(f, &id_len) ||
      !StripColumnTgaReadU8(f, &cmap_type) ||
      !StripColumnTgaReadU8(f, &image_type)) {
    return false;
  }
  uint16_t cmap_first = 0, cmap_len = 0;
  uint8_t cmap_entry = 0;
  if (!StripColumnTgaReadU16(f, &cmap_first) ||
      !StripColumnTgaReadU16(f, &cmap_len) ||
      !StripColumnTgaReadU8(f, &cmap_entry)) {
    return false;
  }
  (void)cmap_first;
  (void)cmap_len;
  (void)cmap_entry;
  uint16_t x_origin = 0, y_origin = 0, width = 0, height = 0;
  uint8_t depth = 0, desc = 0;
  if (!StripColumnTgaReadU16(f, &x_origin) ||
      !StripColumnTgaReadU16(f, &y_origin) ||
      !StripColumnTgaReadU16(f, &width) ||
      !StripColumnTgaReadU16(f, &height) ||
      !StripColumnTgaReadU8(f, &depth) ||
      !StripColumnTgaReadU8(f, &desc)) {
    return false;
  }
  (void)x_origin;
  (void)y_origin;

  // Type 2 is uncompressed true-color. 10 is RLE. 1/9 are color-mapped.
  if (cmap_type != 0 || image_type != 2) return false;
  if (width == 0 || height == 0) return false;
  // Bits 6-7 are interleave. Bit 4 is right-to-left. Either needs a second pass.
  if (desc & 0xD0) return false;

  uint8_t alpha_bits = (uint8_t)(desc & 0x0F);
  uint8_t bpp = 0;
  if (depth == 24) {
    if (alpha_bits != 0) return false;
    bpp = 3;
  } else if (depth == 32) {
    if (alpha_bits != 0 && alpha_bits != 8) return false;
    bpp = 4;
  } else {
    return false;
  }

  info->width = width;
  info->height = height;
  info->top_down = (desc & 0x20) != 0;
  info->bpp = bpp;
  info->row_stride = (uint32_t)width * bpp;
  info->pixel_offset = 18u + id_len;
  return info->row_stride / bpp == width;
}

inline uint32_t StripColumnTgaFrameFileRow(const StripColumnTgaInfo* info,
                                          uint32_t frame_index) {
  return info->top_down ? frame_index : (info->height - 1u - frame_index);
}

// BGR(A) at the current file position into RGBA at out. No scratch row.
// 32-bit: one read, then swap B and R. The opacity byte is already in place.
// 24-bit: one read of BGR, expanded in place to RGBA with alpha 255.
inline bool StripColumnTgaDecodePixels(FileReader* f, int bpp, int n_pixels, uint8_t* out) {
  if (n_pixels <= 0) return true;
  if (!f || !out) return false;
  if (bpp == 4) {
    const int nbytes = n_pixels * 4;
    if (f->Read(out, nbytes) != nbytes) return false;
    uint8_t* p = out;
    for (int i = 0; i < n_pixels; i++, p += 4) {
      uint8_t b = p[0];
      p[0] = p[2];
      p[2] = b;
    }
    return true;
  }
  if (bpp == 3) {
    const int nbytes = n_pixels * 3;
    if (f->Read(out, nbytes) != nbytes) return false;
    for (int i = n_pixels - 1; i >= 0; i--) {
      uint8_t b = out[i * 3];
      uint8_t g = out[i * 3 + 1];
      uint8_t r = out[i * 3 + 2];
      uint8_t* d = out + (size_t)i * 4;
      d[0] = r;
      d[1] = g;
      d[2] = b;
      d[3] = 255;
    }
    return true;
  }
  return false;
}

// Consume unread pixels so the next row starts at the file cursor. A seek here
// would break a sequential multi-row read.
inline bool StripColumnTgaSkipBytes(FileReader* f, int nbytes) {
  uint8_t sink[32];
  while (nbytes > 0) {
    int n = nbytes > (int)sizeof(sink) ? (int)sizeof(sink) : nbytes;
    if (f->Read(sink, n) != n) return false;
    nbytes -= n;
  }
  return true;
}

inline bool StripColumnTgaSeekRow(FileReader* f, const StripColumnTgaInfo* info,
                                 uint32_t file_row) {
  uint32_t pos = info->pixel_offset + file_row * info->row_stride;
  if (f->Tell() != pos) f->Seek(pos);
  return true;
}

inline bool StripColumnTgaLoadFrameAlongY(FileReader* f, const StripColumnTgaInfo* info,
                                         uint32_t frame_index, int source_height,
                                         uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf || out_buf_size == 0) return false;
  if (frame_index >= info->height) return false;
  if (info->bpp != 3 && info->bpp != 4) return false;
  if (source_height < 0) source_height = 0;
  if (source_height > (int)info->width) source_height = (int)info->width;
  if (source_height > 0 && (size_t)source_height * 4u > out_buf_size) return false;

  uint32_t file_row = StripColumnTgaFrameFileRow(info, frame_index);
  LOCK_SD(true);
  StripColumnTgaSeekRow(f, info, file_row);
  bool ok = StripColumnTgaDecodePixels(f, info->bpp, source_height, out_buf);
  LOCK_SD(false);
  if (!ok) return false;
  Looper::DoHFLoop();
  return true;
}

inline bool StripColumnTgaLoadFramesAlongYBulk(FileReader* f, const StripColumnTgaInfo* info,
                                              const uint32_t* frame_indices, int n,
                                              int source_height,
                                              uint8_t* const* out_bufs, size_t out_buf_size) {
  if (!f || !info || !frame_indices || !out_bufs || n < 1) return false;
  if (n > STRIP_COLUMN_BMP_Y_BULK_ROWS) return false;
  if (info->bpp != 3 && info->bpp != 4) return false;
  if (info->row_stride == 0) return false;

  uint32_t file_rows[STRIP_COLUMN_BMP_Y_BULK_ROWS];
  for (int i = 0; i < n; i++) {
    if (!out_bufs[i] || frame_indices[i] >= info->height) return false;
    file_rows[i] = StripColumnTgaFrameFileRow(info, frame_indices[i]);
  }
  for (int i = 1; i < n; i++) {
    uint32_t prev = file_rows[i - 1];
    uint32_t cur = file_rows[i];
    const bool forward = (cur == prev + 1u);
    const bool backward = (prev != 0u && cur + 1u == prev);
    if (!forward && !backward) return false;
    const bool first_forward = (file_rows[1] == file_rows[0] + 1u);
    if (forward != first_forward) return false;
  }
  uint32_t min_row = file_rows[0];
  uint32_t max_row = file_rows[0];
  for (int i = 1; i < n; i++) {
    if (file_rows[i] < min_row) min_row = file_rows[i];
    if (file_rows[i] > max_row) max_row = file_rows[i];
  }
  if (max_row - min_row + 1u != (uint32_t)n) return false;

  if (source_height < 0) source_height = 0;
  if (source_height > (int)info->width) source_height = (int)info->width;
  if (source_height > 0 && (size_t)source_height * 4u > out_buf_size) return false;

  const int tail = ((int)info->width - source_height) * (int)info->bpp;
  if (tail < 0) return false;

  LOCK_SD(true);
  StripColumnTgaSeekRow(f, info, min_row);
  for (uint32_t row = min_row; row <= max_row; row++) {
    int which = -1;
    for (int i = 0; i < n; i++) {
      if (file_rows[i] == row) {
        which = i;
        break;
      }
    }
    if (which < 0 ||
        !StripColumnTgaDecodePixels(f, info->bpp, source_height, out_bufs[which]) ||
        !StripColumnTgaSkipBytes(f, tail)) {
      LOCK_SD(false);
      return false;
    }
  }
  LOCK_SD(false);
  Looper::DoHFLoop();
  return true;
}

#endif  // STYLES_STRIP_COLUMN_TGA_H
