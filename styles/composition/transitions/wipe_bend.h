// Included inside ConfigExtensionMask. Bend clock and bend wipe.
  static float BendPow(uint32_t t, uint32_t len, bool inverse) {
    float x = (float)t / (float)len;
    if (x < 0.0f) x = 0.0f;
    if (x > 1.0f) x = 1.0f;
    const float exp = 32976.0f / 32768.0f;
    if (inverse) return 1.0f - powf(1.0f - x, exp);
    return powf(x, exp);
  }

  void StepBend(bool* active, bool* restart, uint32_t* start, uint32_t* len,
                int ms, uint32_t scale, bool inverse, uint32_t* fade_end) {
    if (!*active) return;
    if (*restart) {
      *start = millis();
      *len = ms > 0 ? (uint32_t)ms : 0;
      *restart = false;
    }
    float p = 1.0f;
    if (*len != 0) {
      uint32_t t = millis() - *start;
      if (t > *len) {
        *len = 0;
      } else {
        p = BendPow(t, *len, inverse);
      }
    }
    *fade_end = (uint32_t)(p * (float)scale + 0.5f);
    if (*len == 0) *active = false;
  }

  // InOutTrL + TrWipeX<BendTimePowInv> extend, TrWipeInX<BendTimePow> retract.
  void RunBend(BladeBase* blade, int out_ms, int in_ms) {
    if (on_ != blade->is_on()) {
      on_ = blade->is_on();
      if (on_) {
        out_restart_ = true;
        out_active_ = true;
      } else {
        in_restart_ = true;
        in_active_ = true;
      }
    }
    num_leds_ = blade->num_leds();
    uint32_t scale = 256u * (uint32_t)num_leds_;
    nleds_256_ = scale;
    StepBend(&out_active_, &out_restart_, &out_start_, &out_len_, out_ms, scale, true, &out_fade_);
    uint32_t in_end = 0;
    StepBend(&in_active_, &in_restart_, &in_start_, &in_len_, in_ms, scale, false, &in_end);
    if (in_end > scale) in_end = scale;
    in_fade_start_ = scale - in_end;
  }

  static int RangeMix(uint32_t range_start, uint32_t range_end, int led) {
    uint32_t led_s = (uint32_t)led << 8;
    uint32_t led_e = led_s + 256u;
    uint32_t s = range_start > led_s ? range_start : led_s;
    uint32_t e = range_end < led_e ? range_end : led_e;
    if (s >= e) return 0;
    uint32_t sz = e - s;
    if (sz > 256u) sz = 256u;
    return (int)sz;
  }

  uint16_t BendCover(int led) const {
    if (!out_active_ && !in_active_) return on_ ? 0 : 32768;
    int black8;
    if (on_) {
      int inner = 256;
      if (NestBend() && in_active_) inner = RangeMix(in_fade_start_, nleds_256_, led);
      if (out_active_) {
        int mix = RangeMix(0, out_fade_, led);
        black8 = (inner * (256 - mix)) / 256;
      } else {
        black8 = 0;
      }
    } else {
      int inner = 0;
      if (NestBend() && out_active_) {
        int mix = RangeMix(0, out_fade_, led);
        inner = 256 - mix;
      }
      if (in_active_) {
        int mix = RangeMix(in_fade_start_, nleds_256_, led);
        black8 = (inner * (256 - mix) + 256 * mix) / 256;
      } else {
        black8 = 256;
      }
    }
    if (black8 < 0) black8 = 0;
    if (black8 > 256) black8 = 256;
    return (uint16_t)(black8 * 128);
  }
