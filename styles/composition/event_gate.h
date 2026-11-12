#ifndef STYLES_EVENT_GATE_H
#define STYLES_EVENT_GATE_H

// Shows a config layer only while an event is active.
// event_blast -1 normal opacity 40% strip_column animations/overlay.bmp 144 30
// event_clash 400 multiply opacity 67% sine_waves 2400 0 12.5% 100% -2000
//
// Duration: < 1 (usually -1) uses the effect's wav length for one-shots, and
// "while held" for lockup, drag, melt, and lightning block. A positive number
// is milliseconds from the trigger. A held event also ends when the hold ends.

#include <stdlib.h>
#include <string.h>
#include "../../common/arg_parser.h"
#include "../../common/saber_base.h"
#include "../blade_style.h"
#include "config_play_cue.h"
#include "strip_column_pool.h"

enum class ConfigEventKind : uint8_t {
  BLAST = 0,
  CLASH,
  SWING,
  FORCE,
  PREON,
  POSTOFF,
  IGNITION,
  LOCKUP,
  DRAG,
  MELT,
  LB,
};

inline bool ConfigEventIsHold(ConfigEventKind kind) {
  return kind == ConfigEventKind::LOCKUP || kind == ConfigEventKind::DRAG ||
         kind == ConfigEventKind::MELT || kind == ConfigEventKind::LB;
}

inline EffectType ConfigEventEffect(ConfigEventKind kind) {
  switch (kind) {
    case ConfigEventKind::BLAST: return EFFECT_BLAST;
    case ConfigEventKind::CLASH: return EFFECT_CLASH;
    case ConfigEventKind::SWING: return EFFECT_ACCENT_SWING;
    case ConfigEventKind::FORCE: return EFFECT_FORCE;
    case ConfigEventKind::PREON: return EFFECT_PREON;
    case ConfigEventKind::POSTOFF: return EFFECT_POSTOFF;
    case ConfigEventKind::IGNITION: return EFFECT_IGNITION;
    case ConfigEventKind::LOCKUP: return EFFECT_LOCKUP_BEGIN;
    case ConfigEventKind::DRAG: return EFFECT_DRAG_BEGIN;
    case ConfigEventKind::MELT: return EFFECT_LOCKUP_BEGIN;
    case ConfigEventKind::LB: return EFFECT_LOCKUP_BEGIN;
  }
  return EFFECT_BLAST;
}

inline SaberBase::LockupType ConfigEventLockup(ConfigEventKind kind) {
  switch (kind) {
    case ConfigEventKind::DRAG: return SaberBase::LOCKUP_DRAG;
    case ConfigEventKind::MELT: return SaberBase::LOCKUP_MELT;
    case ConfigEventKind::LB: return SaberBase::LOCKUP_LIGHTNING_BLOCK;
    default: return SaberBase::LOCKUP_NORMAL;
  }
}

// True when s begins with "event_" as its first word.
inline bool ConfigLayerWordIsEvent(const char* s) {
  if (!s) return false;
  while (*s == ' ' || *s == '\t') s++;
  return strncmp(s, "event_", 6) == 0;
}

// On success, *io advances past "event_<name> <duration>".
inline bool ConfigParseEventPrefix(const char** io, ConfigEventKind* kind, int* duration_ms) {
  if (!io || !*io || !kind || !duration_ms) return false;
  const char* s = *io;
  struct Item { const char* name; ConfigEventKind kind; };
  static const Item kItems[] = {
    { "event_blast", ConfigEventKind::BLAST },
    { "event_clash", ConfigEventKind::CLASH },
    { "event_swing", ConfigEventKind::SWING },
    { "event_force", ConfigEventKind::FORCE },
    { "event_preon", ConfigEventKind::PREON },
    { "event_postoff", ConfigEventKind::POSTOFF },
    { "event_ignition", ConfigEventKind::IGNITION },
    { "event_lockup", ConfigEventKind::LOCKUP },
    { "event_drag", ConfigEventKind::DRAG },
    { "event_melt", ConfigEventKind::MELT },
    { "event_lb", ConfigEventKind::LB },
  };
  const Item* found = nullptr;
  for (size_t i = 0; i < sizeof(kItems) / sizeof(kItems[0]); i++) {
    if (FirstWord(s, kItems[i].name)) {
      found = &kItems[i];
      break;
    }
  }
  if (!found) return false;
  s = SkipWord(s);
  if (!s || !s[0]) return false;
  char* end = nullptr;
  long v = strtol(s, &end, 10);
  if (end == s) return false;
  *kind = found->kind;
  *duration_ms = (int)v;
  *io = SkipWord(s);
  return true;
}

class EventGateStyle : public BladeStyle {
 public:
  EventGateStyle(BladeStyle* child, ConfigEventKind kind, int duration_ms)
      : child_(child), kind_(kind), duration_ms_(duration_ms), active_(false),
        end_ms_(0), last_effect_micros_(0xffffffffu), hold_latched_(false) {}

  ~EventGateStyle() override {
    delete child_;
    child_ = nullptr;
    StripColumnEventPoolReclaimIdle();
  }

  void runUpdate(BladeBase* blade) override {
    // Idle event rings are freed 2 seconds after their last user. A hold's
    // ring stays checked out, so this does not allocate or free it.
    StripColumnEventPoolSweep();
    if (!child_ || !blade) return;
    if (ConfigEventIsHold(kind_)) {
      UpdateHold(blade);
    } else {
      UpdateOneshot(blade);
    }
  }

  void run(BladeBase* blade) override { runUpdate(blade); }

  bool IsHandled(HandledFeature feature) override {
    return child_ && child_->IsHandled(feature);
  }

  RGBA_um getLayerColor(int led) override {
    if (!active_ || !child_) return RGBA_um::Transparent();
    return child_->getLayerColor(led);
  }

  bool active() const { return active_; }

 private:
  void Begin(BladeBase* blade, int window_ms) {
    active_ = true;
    ConfigPlayCue::ArmRestart(window_ms);
    child_->runUpdate(blade);
    ConfigPlayCue::Clear();
  }

  void End(BladeBase* blade) {
    if (!active_) return;
    active_ = false;
    ConfigPlayCue::ArmRelease();
    child_->runUpdate(blade);
    ConfigPlayCue::Clear();
  }

  bool HoldOn(BladeBase* blade) const {
    return SaberBase::LockupForBlade(blade->GetBladeNumber()) == ConfigEventLockup(kind_);
  }

  void UpdateHold(BladeBase* blade) {
    bool held = HoldOn(blade);
    if (duration_ms_ < 1) {
      if (held && !active_) Begin(blade, 0);
      else if (!held && active_) End(blade);
      else if (active_) child_->runUpdate(blade);
      return;
    }
    if (held && !hold_latched_) {
      hold_latched_ = true;
      end_ms_ = millis() + (uint32_t)duration_ms_;
      Begin(blade, duration_ms_);
      return;
    }
    if (!held) hold_latched_ = false;
    if (active_ && (!held || (int32_t)(millis() - end_ms_) >= 0)) {
      End(blade);
      return;
    }
    if (active_) child_->runUpdate(blade);
  }

  BladeEffect* NewestEffect(BladeBase* blade) {
    BladeEffect* effects = nullptr;
    size_t n = SaberBase::GetEffects(&effects);
    if (!effects || n == 0) return nullptr;
    EffectType want = ConfigEventEffect(kind_);
    int blade_number = blade->GetBladeNumber();
    for (size_t i = 0; i < n; i++) {
      bool match = effects[i].type == want;
      if (!match && want == EFFECT_CLASH && effects[i].type == EFFECT_STAB) match = true;
      if (!match) continue;
      if (!effects[i].location.on_blade(blade_number)) continue;
      if (effects[i].start_micros == last_effect_micros_) return nullptr;
      last_effect_micros_ = effects[i].start_micros;
      return effects + i;
    }
    return nullptr;
  }

  void UpdateOneshot(BladeBase* blade) {
    if (BladeEffect* e = NewestEffect(blade)) {
      int ms = duration_ms_;
      if (ms < 1) {
        ms = (e->sound_length > 0.0f) ? (int)(e->sound_length * 1000.0f) : 0;
      }
      if (ms > 0) {
        end_ms_ = millis() + (uint32_t)ms;
        Begin(blade, ms);
        return;
      }
    }
    if (active_ && (int32_t)(millis() - end_ms_) >= 0) {
      End(blade);
      return;
    }
    if (active_) child_->runUpdate(blade);
  }

  BladeStyle* child_;
  ConfigEventKind kind_;
  int duration_ms_;
  bool active_;
  uint32_t end_ms_;
  uint32_t last_effect_micros_;
  bool hold_latched_;
};

#endif  // STYLES_EVENT_GATE_H
