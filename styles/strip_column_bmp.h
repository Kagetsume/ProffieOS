#ifndef STYLES_STRIP_COLUMN_BMP_H
#define STYLES_STRIP_COLUMN_BMP_H

// 24-bit uncompressed BMP loader for strip_column (SD, Proffie 3.9+).
//
// Supported BMP (strict):
//   - 'BM' magic, BITMAPINFOHEADER (biSize >= 40)
//   - biPlanes == 1, biBitCount == 24, biCompression == 0 (BI_RGB, no RLE)
//   - No 8-bit palette / indexed color
// Image layout for strip_column:
//   - biWidth  = animation frame count (column index 0 .. width-1)
//   - |biHeight| = source column height in pixels (row 0 = hilt)
//   - biHeight > 0: classic bottom-up DIB (flip rows so row 0 = top/hilt)
//   - biHeight < 0: top-down DIB (row 0 in file = hilt)
// Each frame reads one vertical column via Seek+Read (no full bitmap in RAM).

#include "../common/file_reader.h"
#include "../common/stdout.h"
#include <stdint.h>
#include <string.h>

struct StripColumnBmpInfo {
  uint32_t width;
  uint32_t height;
  bool top_down;
  uint32_t row_stride;
  uint32_t pixel_offset;
};

inline bool StripColumnBmpParseHeader(FileReader* f, StripColumnBmpInfo* info) {
  if (!f || !info) return false;
  memset(info, 0, sizeof(*info));
  f->Seek(0);
  if (f->Read() != 'B' || f->Read() != 'M') return false;

  f->Skip(8);
  uint32_t pixel_offset = f->ReadType<uint32_t>();
  uint32_t dib_size = f->ReadType<uint32_t>();
  if (dib_size < 40) {
    STDERR << "strip_column BMP: DIB header too small\n";
    return false;
  }

  int32_t width = (int32_t)f->ReadType<uint32_t>();
  int32_t height = (int32_t)f->ReadType<uint32_t>();
  uint16_t planes = f->ReadType<uint16_t>();
  uint16_t bit_count = f->ReadType<uint16_t>();
  uint32_t compression = f->ReadType<uint32_t>();

  if (width <= 0) {
    STDERR << "strip_column BMP: invalid width\n";
    return false;
  }
  if (planes != 1) {
    STDERR << "strip_column BMP: biPlanes must be 1\n";
    return false;
  }
  if (bit_count != 24) {
    STDERR << "strip_column BMP: need 24-bit color (no 8-bit/palette)\n";
    return false;
  }
  if (compression != 0) {
    STDERR << "strip_column BMP: need BI_RGB uncompressed (no RLE)\n";
    return false;
  }

  bool top_down = height < 0;
  uint32_t abs_height = (uint32_t)(height < 0 ? -height : height);
  if (abs_height == 0) {
    STDERR << "strip_column BMP: invalid height\n";
    return false;
  }

  info->width = (uint32_t)width;
  info->height = abs_height;
  info->top_down = top_down;
  info->row_stride = ((info->width * 3u + 3u) / 4u) * 4u;
  info->pixel_offset = pixel_offset;
  return true;
}

// Fills out_buf (typically 512 bytes): RGB8 row-major, row 0 = hilt; zero-padded.
inline bool StripColumnBmpLoadColumn(FileReader* f, const StripColumnBmpInfo* info,
                                     uint32_t column_index, int source_height,
                                     uint8_t* out_buf, size_t out_buf_size) {
  if (!f || !info || !out_buf || out_buf_size == 0) return false;
  memset(out_buf, 0, out_buf_size);
  if (column_index >= info->width) return false;

  int rows = source_height;
  if (rows > (int)info->height) rows = (int)info->height;
  if (rows < 0) rows = 0;

  for (int logical_row = 0; logical_row < rows; logical_row++) {
    uint32_t file_row = info->top_down
        ? (uint32_t)logical_row
        : (info->height - 1u - (uint32_t)logical_row);
    uint32_t pos = info->pixel_offset + file_row * info->row_stride + column_index * 3u;
    f->Seek(pos);
    if (f->Read(out_buf + logical_row * 3, 3) != 3) return false;
  }
  return true;
}

#endif  // STYLES_STRIP_COLUMN_BMP_H
