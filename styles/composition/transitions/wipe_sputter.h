// Included inside ConfigExtensionMask.
  // Each LED has a fixed random time. The linear clock reveals it over a
  // flare window, then hides it again as that clock runs backward.
  static uint32_t SputterHash(int led) {
    uint32_t x = (uint32_t)led * 0x9E3779B1u;
    x ^= x >> 16;
    x *= 0x7FEB352Du;
    x ^= x >> 15;
    return x;
  }

  uint16_t SputterCover(int led) const {
    int p = ext_value_;
    if (p < 0) p = 0;
    if (p > 32768) p = 32768;
    const int flare = 12288;
    const int span = 32768 - flare;
    int h = (int)(((SputterHash(led) & 0xFFFFu) * (uint32_t)span) >> 16);
    int delta = p - h;
    if (delta <= 0) return 32768;
    if (delta >= flare) return 0;
    return (uint16_t)(((uint32_t)(flare - delta) * 32768u) / (uint32_t)flare);
  }
