// Included inside ConfigExtensionMask. Column-file wipe on the linear clock.
  static void CopyBmpPath(char* dest, const char* src) {
    dest[0] = 0;
    if (!src || !src[0]) return;
    strncpy(dest, src, 95);
    dest[95] = 0;
  }

  void RunBmp(BladeBase* blade) {
    bool blade_on = blade->is_on();
    uint8_t curve = blade_on ? in_curve_ : out_curve_;
    if (curve != CONFIG_INOUT_BMP || !bmp_ || (!blade_on && extension_ <= 0.0f)) {
      if (bmp_) bmp_->Release();
      return;
    }
    const char* path = blade_on ? in_bmp_path_ : out_bmp_path_;
    int height = blade_on ? in_bmp_height_ : out_bmp_height_;
    bmp_->Scrub(blade, path, height, ext_value_);
  }

  uint16_t BmpCover(int led) const {
    if (!bmp_ || !bmp_->ready()) return on_ ? 0 : 32768;
    return bmp_->Cover(led);
  }
