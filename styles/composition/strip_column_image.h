#ifndef STYLES_STRIP_COLUMN_IMAGE_H
#define STYLES_STRIP_COLUMN_IMAGE_H

// Header detect for strip_column / strip_column_mask. The filename is not consulted.
// After a row is read, both formats are RGBA8 and the renderer does not branch.

#include "strip_column_bmp.h"
#include "strip_column_tga.h"

enum StripColumnImageKind : uint8_t {
  STRIP_COLUMN_IMAGE_NONE = 0,
  STRIP_COLUMN_IMAGE_BMP = 1,
  STRIP_COLUMN_IMAGE_TGA = 2,
};

enum StripColumnImageStatus : uint8_t {
  STRIP_COLUMN_IMAGE_OK = 0,
  STRIP_COLUMN_IMAGE_BAD = 1,
  STRIP_COLUMN_IMAGE_TOO_LONG = 2,
};

struct StripColumnImageInfo {
  uint8_t kind;
  uint32_t width;
  uint32_t height;
  bool top_down;
  uint32_t row_stride;
  uint32_t pixel_offset;
  uint8_t file_bpp;
};

inline uint32_t StripColumnImageNumFrames(const StripColumnImageInfo* info) {
  return info ? info->height : 0;
}

inline uint32_t StripColumnImageBladePixels(const StripColumnImageInfo* info) {
  return info ? info->width : 0;
}

inline StripColumnBmpInfo StripColumnBmpInfoFromImage(const StripColumnImageInfo* info) {
  StripColumnBmpInfo bmp;
  memset(&bmp, 0, sizeof(bmp));
  if (!info) return bmp;
  bmp.width = info->width;
  bmp.height = info->height;
  bmp.top_down = info->top_down;
  bmp.row_stride = info->row_stride;
  bmp.pixel_offset = info->pixel_offset;
  return bmp;
}

inline StripColumnTgaInfo StripColumnTgaInfoFromImage(const StripColumnImageInfo* info) {
  StripColumnTgaInfo tga;
  memset(&tga, 0, sizeof(tga));
  if (!info) return tga;
  tga.width = info->width;
  tga.height = info->height;
  tga.top_down = info->top_down;
  tga.row_stride = info->row_stride;
  tga.pixel_offset = info->pixel_offset;
  tga.bpp = info->file_bpp;
  return tga;
}

// 'BM' is a BMP and is not retried as TGA. Anything else must be uncompressed TGA.
inline StripColumnImageStatus StripColumnReadImageHeader(FileReader* f,
                                                        StripColumnImageInfo* info) {
  if (!f || !info) return STRIP_COLUMN_IMAGE_BAD;
  memset(info, 0, sizeof(*info));
  f->Seek(0);
  int c0 = f->Read();
  int c1 = f->Read();
  f->Seek(0);
  if (c0 == 'B' && c1 == 'M') {
    StripColumnBmpInfo bmp;
    if (!StripColumnBmpParseHeader(f, &bmp)) return STRIP_COLUMN_IMAGE_BAD;
    info->kind = STRIP_COLUMN_IMAGE_BMP;
    info->width = bmp.width;
    info->height = bmp.height;
    info->top_down = bmp.top_down;
    info->row_stride = bmp.row_stride;
    info->pixel_offset = bmp.pixel_offset;
    info->file_bpp = 3;
  } else {
    StripColumnTgaInfo tga;
    if (!StripColumnTgaParseHeader(f, &tga)) return STRIP_COLUMN_IMAGE_BAD;
    info->kind = STRIP_COLUMN_IMAGE_TGA;
    info->width = tga.width;
    info->height = tga.height;
    info->top_down = tga.top_down;
    info->row_stride = tga.row_stride;
    info->pixel_offset = tga.pixel_offset;
    info->file_bpp = tga.bpp;
  }
  if (info->width == 0 || info->height == 0) return STRIP_COLUMN_IMAGE_BAD;
  if (info->width > (uint32_t)STRIP_COLUMN_BLADE_PIXEL_CAP) return STRIP_COLUMN_IMAGE_TOO_LONG;
  return STRIP_COLUMN_IMAGE_OK;
}

inline bool StripColumnLoadFrameRow(FileReader* f, const StripColumnImageInfo* info,
                                   uint32_t frame_index, int source_height,
                                   uint8_t* out, size_t out_size) {
  if (!info) return false;
  if (info->kind == STRIP_COLUMN_IMAGE_BMP) {
    StripColumnBmpInfo bmp = StripColumnBmpInfoFromImage(info);
    return StripColumnBmpLoadFrameAlongY(f, &bmp, frame_index, source_height, out, out_size);
  }
  if (info->kind == STRIP_COLUMN_IMAGE_TGA) {
    StripColumnTgaInfo tga = StripColumnTgaInfoFromImage(info);
    return StripColumnTgaLoadFrameAlongY(f, &tga, frame_index, source_height, out, out_size);
  }
  return false;
}

inline bool StripColumnLoadFrameRows(FileReader* f, const StripColumnImageInfo* info,
                                    const uint32_t* frame_indices, int n,
                                    int source_height,
                                    uint8_t* const* out_bufs, size_t out_size) {
  if (!info) return false;
  if (info->kind == STRIP_COLUMN_IMAGE_BMP) {
    StripColumnBmpInfo bmp = StripColumnBmpInfoFromImage(info);
    return StripColumnBmpLoadFramesAlongYBulk(f, &bmp, frame_indices, n, source_height,
                                              out_bufs, out_size);
  }
  if (info->kind == STRIP_COLUMN_IMAGE_TGA) {
    StripColumnTgaInfo tga = StripColumnTgaInfoFromImage(info);
    return StripColumnTgaLoadFramesAlongYBulk(f, &tga, frame_indices, n, source_height,
                                              out_bufs, out_size);
  }
  return false;
}

#endif  // STYLES_STRIP_COLUMN_IMAGE_H
