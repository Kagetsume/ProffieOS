#ifndef STYLES_STRIP_COLUMN_POOL_H
#define STYLES_STRIP_COLUMN_POOL_H

// Event-image frame rings. One ring per picture that is actually up.
// Lockup, drag, melt, and lightning block share this pool with blast, clash,
// and swing. A hold keeps its ring until the hold ends. The ring is not freed
// on the way out. It is freed only after it has had no user for 2 seconds.
// Base strip_column, masks, and other non-event layers do not use this pool.

#include "strip_column_image.h"
#include "../../common/stdout.h"

#ifndef STRIP_COLUMN_FRAME_RING_SIZE
#define STRIP_COLUMN_FRAME_RING_SIZE 8
#endif
#ifndef STRIP_COLUMN_PIXEL_BYTES
#define STRIP_COLUMN_PIXEL_BYTES 4
#endif
#ifndef STRIP_COLUMN_RECORD_SIZE
#define STRIP_COLUMN_RECORD_SIZE (STRIP_COLUMN_BLADE_PIXEL_CAP * STRIP_COLUMN_PIXEL_BYTES)
#endif
#ifndef STRIP_COLUMN_MAX_SOURCE_HEIGHT
#define STRIP_COLUMN_MAX_SOURCE_HEIGHT STRIP_COLUMN_BLADE_PIXEL_CAP
#endif

// One hold (those four holds never overlap) plus blast, clash, and swing.
#ifndef STRIP_COLUMN_EVENT_POOL_SIZE
#define STRIP_COLUMN_EVENT_POOL_SIZE 4
#endif
#ifndef STRIP_COLUMN_EVENT_POOL_IDLE_MS
#define STRIP_COLUMN_EVENT_POOL_IDLE_MS 2000
#endif

struct StripColumnFrameSlot {
  uint32_t frame;
  uint8_t data[STRIP_COLUMN_RECORD_SIZE];
};

struct StripColumnEventPoolEntry {
  StripColumnFrameSlot* frames;
  uint8_t holders;
  uint32_t idle_since_ms;
  uint32_t epoch;
};

inline StripColumnEventPoolEntry* StripColumnEventPoolTable() {
  static StripColumnEventPoolEntry table[STRIP_COLUMN_EVENT_POOL_SIZE];
  return table;
}

inline uint32_t& StripColumnEventPoolEpochCounter() {
  static uint32_t next_epoch = 1;
  return next_epoch;
}

// Null the pool slot, then delete. A holder count above zero means another
// event still owns the ring, so it is left alone. frames may already be null.
inline void StripColumnEventPoolFreeEntry(StripColumnEventPoolEntry& e) {
  if (e.holders != 0 || !e.frames) return;
  StripColumnFrameSlot* dying = e.frames;
  e.frames = nullptr;
  e.epoch = 0;
  delete[] dying;
}

inline void StripColumnEventPoolSweep() {
  uint32_t now = millis();
  StripColumnEventPoolEntry* table = StripColumnEventPoolTable();
  for (int i = 0; i < STRIP_COLUMN_EVENT_POOL_SIZE; i++) {
    StripColumnEventPoolEntry& e = table[i];
    if (e.holders != 0 || !e.frames) continue;
    if ((int32_t)(now - e.idle_since_ms) >= (int32_t)STRIP_COLUMN_EVENT_POOL_IDLE_MS)
      StripColumnEventPoolFreeEntry(e);
  }
}

// Same rule as Sweep. Teardown does not delete a ring early, and it does not
// delete a ring another event still holds. The next style tick frees it once
// it has been idle for 2 seconds.
inline void StripColumnEventPoolReclaimIdle() {
  StripColumnEventPoolSweep();
}

// epoch_out receives the checkout id. Release ignores a stale id.
// A failed new[] leaves the slot unused and returns null.
inline StripColumnFrameSlot* StripColumnEventPoolAcquire(uint32_t* epoch_out) {
  if (epoch_out) *epoch_out = 0;
  StripColumnEventPoolEntry* table = StripColumnEventPoolTable();
  int idle = -1;
  int empty = -1;
  for (int i = 0; i < STRIP_COLUMN_EVENT_POOL_SIZE; i++) {
    if (table[i].holders != 0) continue;
    if (table[i].frames) {
      if (idle < 0) idle = i;
    } else if (empty < 0) {
      empty = i;
    }
  }
  int slot = idle >= 0 ? idle : empty;
  if (slot < 0) {
    static bool logged = false;
    if (!logged) {
      logged = true;
      STDOUT << "strip_column: event image pool full ("
             << STRIP_COLUMN_EVENT_POOL_SIZE << ")\n";
    }
    return nullptr;
  }
  if (!table[slot].frames) {
    StripColumnFrameSlot* born = new StripColumnFrameSlot[STRIP_COLUMN_FRAME_RING_SIZE];
    if (!born) return nullptr;
    table[slot].frames = born;
  }
  if (!table[slot].frames || table[slot].holders != 0) return nullptr;
  uint32_t epoch = StripColumnEventPoolEpochCounter()++;
  if (epoch == 0) epoch = StripColumnEventPoolEpochCounter()++;
  table[slot].holders = 1;
  table[slot].epoch = epoch;
  if (epoch_out) *epoch_out = epoch;
  return table[slot].frames;
}

// Drops one checkout. Does not delete. A second release, or a release whose
// epoch is not the live checkout, does not change a ring someone else holds.
inline void StripColumnEventPoolRelease(StripColumnFrameSlot* frames, uint32_t epoch) {
  if (!frames || epoch == 0) return;
  StripColumnEventPoolEntry* table = StripColumnEventPoolTable();
  uint32_t now = millis();
  for (int i = 0; i < STRIP_COLUMN_EVENT_POOL_SIZE; i++) {
    StripColumnEventPoolEntry& e = table[i];
    if (e.frames != frames) continue;
    if (e.holders == 0 || e.epoch != epoch) return;
    e.holders--;
    if (e.holders == 0) e.idle_since_ms = now;
    return;
  }
}

#endif  // STYLES_STRIP_COLUMN_POOL_H
