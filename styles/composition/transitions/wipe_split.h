// Included inside ConfigExtensionMask. Split and explode share the center band.
  // Lit length of the moving shape. 0 = off, scale = fully on.
  // Extend grows out_fade_. Retract shrinks in_fade_start_.
  uint32_t ActiveSpan() const {
    uint32_t scale = nleds_256_;
    uint32_t w = on_ ? (out_active_ ? out_fade_ : scale)
                     : (in_active_ ? in_fade_start_ : 0);
    if (w > scale) w = scale;
    return w;
  }

  // Lit pixels are the center band [lo, hi). Edges sit on that band.
  uint16_t CenterLitCover(int led, uint32_t width) const {
    uint32_t scale = nleds_256_;
    uint32_t lo = (scale - width) / 2;
    uint32_t hi = lo + width;
    int black8 = 256 - RangeMix(lo, hi, led);
    if (black8 < 0) black8 = 0;
    return (uint16_t)(black8 * 128);
  }

  // Sparks on the lit side of both center-band edges.
  int CenterLitSpark(int led, uint32_t width) const {
    uint32_t scale = nleds_256_;
    uint32_t lo = (scale - width) / 2;
    uint32_t hi = lo + width;
    int led_s = led << 8;
    return StrongerSpark(BandMix((int)lo, led_s, false), BandMix((int)hi, led_s, true));
  }

  // Extend: the center band grows out to hilt and tip.
  // Retract: a dark gap opens at the middle and those edges run out to both ends.
  uint16_t SplitCover(int led) const {
    if (nleds_256_ == 0) return on_ ? 0 : 32768;
    uint32_t width = ActiveSpan();
    if (on_) return CenterLitCover(led, width);
    uint32_t lo = width / 2;
    uint32_t hi = nleds_256_ - lo;
    return (uint16_t)(RangeMix(lo, hi, led) * 128);
  }

  int SplitSparkMix(int led) const {
    if (!out_active_ && !in_active_) return 256;
    uint32_t width = ActiveSpan();
    if (on_) return CenterLitSpark(led, width);
    uint32_t lo = width / 2;
    uint32_t hi = nleds_256_ - lo;
    int led_s = led << 8;
    return StrongerSpark(BandMix((int)lo, led_s, true), BandMix((int)hi, led_s, false));
  }

  // Extend: center band grows out to hilt and tip.
  // Retract: the same band shrinks. Edges start at hilt and tip and meet at the center.
  uint16_t ExplodeCover(int led) const {
    if (nleds_256_ == 0) return on_ ? 0 : 32768;
    return CenterLitCover(led, ActiveSpan());
  }

  int ExplodeSparkMix(int led) const {
    if (!out_active_ && !in_active_) return 256;
    return CenterLitSpark(led, ActiveSpan());
  }
