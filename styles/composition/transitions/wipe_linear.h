// Included inside ConfigExtensionMask. Linear clock, linear wipe, spark edge.
  // InOutFuncSVFBase. ms <= 0 snaps, matching a zero-length bend wipe.
  void RunLinear(BladeBase* blade, int out_ms, int in_ms) {
    uint32_t now = micros();
    uint32_t delta = now - last_micros_;
    last_micros_ = now;
    if (blade->is_on()) {
      if (out_ms <= 0) {
        extension_ = 1.0f;
      } else if (extension_ == 0.0f) {
        extension_ = 0.00001f;
      } else {
        extension_ += delta / (out_ms * 1000.0f);
        if (extension_ > 1.0f) extension_ = 1.0f;
      }
    } else {
      if (in_ms <= 0) {
        extension_ = 0.0f;
      } else {
        extension_ -= delta / (in_ms * 1000.0f);
        if (extension_ < 0.0f) extension_ = 0.0f;
      }
    }
    ext_value_ = (int)(extension_ * 32768.0f);
  }

  // InOutHelperF: high = unlit (black layer opaque).
  uint16_t LinearCover(int led) const {
    if (num_leds_ <= 0) return 0;
    int thres = ext_value_ * num_leds_ - 32768;
    int alpha = led * 32768 - thres;
    if (alpha < 0) return 0;
    if (alpha > 32768) return 32768;
    return (uint16_t)alpha;
  }

  // InOutSparkTipX black_mix: 255 = lit, 0 = off color.
  uint16_t SparkCover(int led) const {
    if (num_leds_ <= 0) return 0;
    int thres = SparkEdge();
    int black_mix = thres - led * 256;
    if (black_mix < 0) black_mix = 0;
    if (black_mix > 255) black_mix = 255;
    return (uint16_t)((255 - black_mix) * 32768 / 255);
  }

  // led is already mapped. Spark sits on the lit side of the moving edge.
  int LinearSparkMix(int led) const {
    if (num_leds_ <= 0) return 256;
    if (extension_ <= 0.0f || extension_ >= 1.0f) return 256;
    return BandMix(SparkEdge(), led << 8, true);
  }

  int SparkEdge() const {
    return (ext_value_ * (num_leds_ + 4)) >> 7;
  }
