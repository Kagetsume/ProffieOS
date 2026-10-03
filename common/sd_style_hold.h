#ifndef COMMON_SD_STYLE_HOLD_H
#define COMMON_SD_STYLE_HOLD_H

// Refcount: style layers (strip_column, etc.) keep the SD card mounted while a media file stays open.
inline int& SdStyleHoldCount() {
  static int hold_count = 0;
  return hold_count;
}

inline void SdStyleHoldAcquire() { SdStyleHoldCount()++; }

inline void SdStyleHoldRelease() {
  if (SdStyleHoldCount() > 0) SdStyleHoldCount()--;
}

inline bool SdStyleHoldActive() { return SdStyleHoldCount() > 0; }

#endif  // COMMON_SD_STYLE_HOLD_H
