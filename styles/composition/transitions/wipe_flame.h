// Included inside ConfigExtensionMask.
  // Bend base from the hilt. The lip is jagged. Motes are streaks that always
  // run toward the tip: a hot head and a dim tail back toward the flame.
  // Extend: a streak dies when the base catches its head. Retract: streaks
  // tear off the shrinking edge and fade in the dark on their way to the tip.

  struct FlameMoteSlot {
    int head = -1;
    int tail = 0;
    int life = 0;
  };
  FlameMoteSlot flame_motes_[7];

  // Called from the mask clock. stepped is false when run() bails before the clock.
  void SyncWipeFrame(bool stepped) {
    if (!stepped) {
      ClearFlameMotes();
      return;
    }
    UpdateFlameMotes();
  }

  bool FlameEdge(uint32_t* edge) const {
    if (!edge) return false;
    if (on_) {
      if (!out_active_) return false;
      *edge = out_fade_;
      return true;
    }
    if (!in_active_) return false;
    *edge = in_fade_start_;
    return true;
  }

  void ClearFlameMotes() {
    for (int i = 0; i < 7; i++) flame_motes_[i].head = -1;
  }

  void UpdateFlameMotes() {
    ClearFlameMotes();
    if (PhaseCurve() != CONFIG_INOUT_FLAME) return;
    uint32_t edge = 0;
    if (!FlameEdge(&edge) || num_leds_ <= 0 || nleds_256_ == 0) return;
    uint32_t elapsed = millis() - (on_ ? out_start_ : in_start_);
    uint32_t len = on_ ? out_len_ : in_len_;
    if (len < 1) len = 1;
    int cur_edge = (int)edge;
    int blade_end = (int)nleds_256_;
    for (int i = 0; i < 7; i++) {
      uint32_t h = SputterHash(i + 17);
      int flight = 180 + (int)(h % 160u);
      int stagger = 36 + (int)((h >> 8) % 70u);
      uint32_t period = (uint32_t)flight + 24u;
      uint32_t age_u = (elapsed + (uint32_t)i * (uint32_t)stagger) % period;
      if ((int)age_u >= flight) continue;
      int age = (int)age_u;
      float u = (float)age / (float)flight;
      float travel_u = 1.0f - (1.0f - u) * (1.0f - u);
      uint32_t birth = elapsed > (uint32_t)age ? elapsed - (uint32_t)age : 0;
      if (birth > len) birth = len;
      float birth_p = birth == 0 ? 0.0f : BendPow(birth, len, on_);
      int birth_edge = on_ ? (int)(birth_p * (float)nleds_256_ + 0.5f)
                           : (int)((1.0f - birth_p) * (float)nleds_256_ + 0.5f);
      int lead_cap = num_leds_ / 3;
      if (lead_cap < 8) lead_cap = 8;
      int lead_leds = 8 + (int)((h >> 16) % (uint32_t)(lead_cap + 1));
      int travel = (int)(travel_u * (float)(lead_leds << 8));
      int head = birth_edge + travel;
      if (on_ && head <= cur_edge + 48) continue;
      if (head > blade_end) head = blade_end;
      int trail_leds = 6 + (int)((h >> 4) % 9u);
      int tail = head - (trail_leds << 8);
      if (on_ && tail < cur_edge) tail = cur_edge;
      if (tail >= head) continue;
      int life = 256;
      if (u > 0.7f) life = (int)((1.0f - u) / 0.3f * 256.0f);
      if (!on_) life = (int)((1.0f - u) * 256.0f);
      if (life < 1) continue;
      flame_motes_[i].head = head;
      flame_motes_[i].tail = tail;
      flame_motes_[i].life = life;
    }
  }

  // light 0..256, mix 0 = spark through 255 = blade color, notch = extra black.
  void FlameAccumulate(int led, int* light, int* mix, int* notch) const {
    if (light) *light = 0;
    if (mix) *mix = 256;
    if (notch) *notch = 0;
    uint32_t edge = 0;
    if (!FlameEdge(&edge) || num_leds_ <= 0) return;
    int led_c = (led << 8) + 128;
    int ahead = led_c - (int)edge;
    int best = 0;
    int best_mix = 256;
    uint32_t tick = millis() >> 5;
    int reach_leds = (int)(SputterHash(led * 5 + (int)tick) % 9u) - 2;
    int tongue_cap = num_leds_ / 10;
    if (tongue_cap < 3) tongue_cap = 3;
    if (tongue_cap > 8) tongue_cap = 8;
    if (reach_leds > tongue_cap) reach_leds = tongue_cap;
    int reach = reach_leds << 8;
    if (reach > 0 && ahead > -128 && ahead < reach) {
      int span = reach + 128;
      int fade = span - (ahead + 128);
      if (fade < 0) fade = 0;
      best = 240 * fade / span;
      best_mix = 36 + (240 - best) / 2;
    } else if (notch && reach < 0 && ahead < 0 && ahead > reach) {
      int depth = -reach;
      if (depth < 256) depth = 256;
      int bite = (-ahead) * 14000 / depth;
      if (bite > 14000) bite = 14000;
      *notch = bite;
    }
    for (int i = 0; i < 7; i++) {
      int head = flame_motes_[i].head;
      if (head < 0) continue;
      int tail = flame_motes_[i].tail;
      int life = flame_motes_[i].life;
      if (led_c < tail - 80 || led_c > head + 160) continue;
      int span = head - tail;
      if (span < 256) span = 256;
      int along = led_c - tail;
      if (along < 0) along = 0;
      if (along > span) along = span;
      int bright = life * along / span;
      if (led_c > head - 256 && bright < life) bright = life;
      if (bright <= best) continue;
      best = bright;
      best_mix = (span - along) * 200 / span;
      if (best_mix < 0) best_mix = 0;
    }
    if (best > 256) best = 256;
    if (light) *light = best;
    if (mix && best > 0) *mix = best_mix;
  }

  int FlameSparkMix(int led) const {
    int light = 0;
    int mix = 256;
    FlameAccumulate(led, &light, &mix, nullptr);
    return light > 0 ? mix : 256;
  }

  uint16_t FlameCover(int led) const {
    uint16_t base = BendCover(led);
    int light = 0;
    int notch = 0;
    FlameAccumulate(led, &light, nullptr, &notch);
    if (notch > 0) {
      uint32_t darker = (uint32_t)base + (uint32_t)notch;
      if (darker > 32768u) darker = 32768u;
      base = (uint16_t)darker;
    }
    if (light <= 0) return base;
    uint16_t mote = (uint16_t)((256 - light) * 128);
    return mote < base ? mote : base;
  }
