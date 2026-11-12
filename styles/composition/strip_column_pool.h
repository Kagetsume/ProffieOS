#ifndef STYLES_STRIP_COLUMN_POOL_H
#define STYLES_STRIP_COLUMN_POOL_H

// Event-image frame rings. One ring per picture that is actually up.
// Lockup, drag, melt, and lightning block share this pool with blast, clash,
// and swing. The pool is not a fixed size: a new picture reuses a ring nobody
// is holding, and if every ring is in use the pool adds one. A hold keeps its
// ring until the hold ends. The ring is not freed on the way out. It is freed
// only after it has had no holder for 2 seconds.
// Base strip_column, masks, and other non-event layers do not use this pool.

#include "strip_column_image.h"

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
  StripColumnEventPoolEntry* next;
};

inline StripColumnEventPoolEntry*& StripColumnEventPoolHead() {
  static StripColumnEventPoolEntry* head = nullptr;
  return head;
}

inline uint32_t& StripColumnEventPoolEpochCounter() {
  static uint32_t next_epoch = 1;
  return next_epoch;
}

inline uint32_t StripColumnEventPoolNextEpoch() {
  uint32_t epoch = StripColumnEventPoolEpochCounter()++;
  if (epoch == 0) epoch = StripColumnEventPoolEpochCounter()++;
  return epoch;
}

// Unlink, null the ring pointer, then delete. holders > 0 means another
// event still owns the ring, so it is left alone.
inline void StripColumnEventPoolFreeEntry(StripColumnEventPoolEntry** link) {
  if (!link || !*link) return;
  StripColumnEventPoolEntry* e = *link;
  if (e->holders != 0 || !e->frames) return;
  StripColumnFrameSlot* dying = e->frames;
  e->frames = nullptr;
  e->epoch = 0;
  *link = e->next;
  e->next = nullptr;
  delete[] dying;
  delete e;
}

inline void StripColumnEventPoolSweep() {
  uint32_t now = millis();
  StripColumnEventPoolEntry** link = &StripColumnEventPoolHead();
  while (*link) {
    StripColumnEventPoolEntry* e = *link;
    if (e->holders != 0 || !e->frames) {
      link = &e->next;
      continue;
    }
    if ((int32_t)(now - e->idle_since_ms) >= (int32_t)STRIP_COLUMN_EVENT_POOL_IDLE_MS)
      StripColumnEventPoolFreeEntry(link);
    else
      link = &e->next;
  }
}

// Same rule as Sweep. Teardown does not delete a ring early, and it does not
// delete a ring another event still holds. The next style tick frees it once
// it has been idle for 2 seconds.
inline void StripColumnEventPoolReclaimIdle() {
  StripColumnEventPoolSweep();
}

// epoch_out receives the checkout id. Release ignores a stale id.
// A free ring is reused. If none is free, one ring is added.
// A failed new leaves the list unchanged and returns null.
inline StripColumnFrameSlot* StripColumnEventPoolAcquire(uint32_t* epoch_out) {
  if (epoch_out) *epoch_out = 0;
  for (StripColumnEventPoolEntry* e = StripColumnEventPoolHead(); e; e = e->next) {
    if (e->holders != 0 || !e->frames) continue;
    uint32_t epoch = StripColumnEventPoolNextEpoch();
    e->holders = 1;
    e->epoch = epoch;
    if (epoch_out) *epoch_out = epoch;
    return e->frames;
  }

  StripColumnFrameSlot* born = new StripColumnFrameSlot[STRIP_COLUMN_FRAME_RING_SIZE];
  if (!born) return nullptr;
  StripColumnEventPoolEntry* node = new StripColumnEventPoolEntry;
  if (!node) {
    delete[] born;
    return nullptr;
  }
  uint32_t epoch = StripColumnEventPoolNextEpoch();
  node->frames = born;
  node->holders = 1;
  node->idle_since_ms = 0;
  node->epoch = epoch;
  node->next = StripColumnEventPoolHead();
  StripColumnEventPoolHead() = node;
  if (epoch_out) *epoch_out = epoch;
  return born;
}

// Drops one checkout. Does not delete. A second release, or a release whose
// epoch is not the live checkout, does not change a ring someone else holds.
inline void StripColumnEventPoolRelease(StripColumnFrameSlot* frames, uint32_t epoch) {
  if (!frames || epoch == 0) return;
  uint32_t now = millis();
  for (StripColumnEventPoolEntry* e = StripColumnEventPoolHead(); e; e = e->next) {
    if (e->frames != frames) continue;
    if (e->holders == 0 || e->epoch != epoch) return;
    e->holders--;
    if (e->holders == 0) e->idle_since_ms = now;
    return;
  }
}

#endif  // STYLES_STRIP_COLUMN_POOL_H
