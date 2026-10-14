#ifndef STYLES_MARK_LAYERS_H
#define STYLES_MARK_LAYERS_H

// Lockup heat, clash scar, and unstable tip. Each is its own config layer.
//
// lockup_heat: stack with warm blend. Red channel is the current hue cap
// (same units as hue: 16384 = 180 degrees). The warm blend moves the blade
// toward orange by at most that amount.
// clash_scar: stack with screen or add. A patch at the clash point fades out.
// unstable_tip: stack with normal blend. The tip edge creeps, tints hot, and
// the pixels past the edge go dark.

#include "../rgb_arg.h"
#include "../../functions/int_arg.h"
#include "../../blades/blade_base.h"
#include "../../common/saber_base.h"

inline int MarkTriangle(uint32_t now, int period_ms) {
  if (period_ms < 1) period_ms = 1;
  uint32_t p = (uint32_t)period_ms;
  uint32_t t = now % (p * 2);
  if (t > p) t = p * 2 - t;
  return (int)((t * 32768u) / p);
}

template<class MAX_SHIFT, class RAMP_MS>
class LockupHeatLayer {
public:
  void run(BladeBase* blade) {
    max_.run(blade);
    ramp_.run(blade);
    int cap = max_.getInteger(0);
    if (cap < 0) cap = 0;
    if (cap > 32767) cap = 32767;
    int ramp = ramp_.getInteger(0);
    if (ramp < 1) ramp = 1;
    bool held = blade &&
        SaberBase::LockupForBlade(blade->GetBladeNumber()) == SaberBase::LOCKUP_NORMAL;
    uint32_t now = millis();
    if (held) {
      if (!holding_) {
        holding_ = true;
        cooling_ = false;
        if (shift_ <= 0 || cap == 0) hold_start_ = now;
        else if (shift_ >= cap) hold_start_ = now - (uint32_t)ramp;
        else hold_start_ = now - (uint32_t)shift_ * (uint32_t)ramp / (uint32_t)cap;
      }
      uint32_t elapsed = now - hold_start_;
      if (elapsed >= (uint32_t)ramp) shift_ = cap;
      else shift_ = (int)((uint32_t)cap * elapsed / (uint32_t)ramp);
      peak_ = shift_;
    } else if (peak_ > 0) {
      if (!cooling_) {
        cooling_ = true;
        holding_ = false;
        cool_start_ = now;
        cool_from_ = peak_;
      }
      uint32_t elapsed = now - cool_start_;
      if (elapsed >= (uint32_t)ramp) {
        shift_ = 0;
        peak_ = 0;
        cooling_ = false;
      } else {
        shift_ = (int)((uint32_t)cool_from_ * ((uint32_t)ramp - elapsed) / (uint32_t)ramp);
        peak_ = shift_;
      }
    } else {
      shift_ = 0;
      holding_ = false;
      cooling_ = false;
    }
  }

  RGBA_um_nod getColor(int led) {
    (void)led;
    if (shift_ <= 0) return RGBA_um_nod::Transparent();
    return RGBA_um_nod(Color16((uint16_t)shift_, 0, 0), 32768);
  }

private:
  PONUA MAX_SHIFT max_;
  PONUA RAMP_MS ramp_;
  int shift_ = 0;
  int peak_ = 0;
  int cool_from_ = 0;
  bool holding_ = false;
  bool cooling_ = false;
  uint32_t hold_start_ = 0;
  uint32_t cool_start_ = 0;
};

template<class COLOR, class FADE_MS, class WIDTH>
class ClashScarLayer {
public:
  void run(BladeBase* blade) {
    color_.run(blade);
    fade_.run(blade);
    width_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    if (blade) {
      if (BladeEffect* e = effect_.Detect(blade)) {
        active_ = true;
        start_ms_ = millis();
        int pos = (int)((float)e->location * 32768.0f);
        if (pos < 0) pos = 0;
        if (pos > 32768) pos = 32768;
        loc_ = pos;
      }
    }
    int fade = fade_.getInteger(0);
    if (fade < 1) fade = 1;
    if (active_ && (int)(millis() - start_ms_) >= fade) active_ = false;
  }

  RGBA_um_nod getColor(int led) {
    if (!active_ || num_leds_ <= 0) return RGBA_um_nod::Transparent();
    int fade = fade_.getInteger(0);
    if (fade < 1) fade = 1;
    int age = (int)(millis() - start_ms_);
    if (age < 0) age = 0;
    if (age >= fade) return RGBA_um_nod::Transparent();
    int remain = (int)((uint32_t)(fade - age) * 32768u / (uint32_t)fade);
    int pos = num_leds_ <= 1 ? 0 : led * 32768 / (num_leds_ - 1);
    int width = width_.getInteger(0);
    if (width < 256) width = 256;
    int half = width / 2;
    int dist = pos - loc_;
    if (dist < 0) dist = -dist;
    if (dist >= half) return RGBA_um_nod::Transparent();
    int bump = (half - dist) * 32768 / half;
    int alpha = bump * remain >> 15;
    if (alpha <= 0) return RGBA_um_nod::Transparent();
    return color_.getColor(led) * (uint16_t)alpha;
  }

private:
  PONUA COLOR color_;
  PONUA FADE_MS fade_;
  PONUA WIDTH width_;
  OneshotEffectDetector<EFFECT_CLASH> effect_;
  bool active_ = false;
  uint32_t start_ms_ = 0;
  int loc_ = 0;
  int num_leds_ = 0;
};

template<class COLOR, class DEPTH, class CYCLE_MS>
class UnstableTipLayer {
public:
  void run(BladeBase* blade) {
    color_.run(blade);
    depth_.run(blade);
    cycle_.run(blade);
    num_leds_ = blade ? blade->num_leds() : 0;
    uint32_t now = millis();
    int depth = depth_.getInteger(0);
    if (depth < 512) depth = 512;
    if (depth > 32768) depth = 32768;
    int cycle = cycle_.getInteger(0);
    if (cycle < 80) cycle = 80;
    int slow = MarkTriangle(now, cycle);
    int fast = MarkTriangle(now, cycle / 3);
    int low = depth / 5;
    if (low < 256) low = 256;
    int edge = low + (int)((uint32_t)(depth - low) * (uint32_t)slow / 32768u);
    int wobble = (fast - 16384) * (depth / 6) / 16384;
    edge += wobble;
    if (edge < low) edge = low;
    if (edge > depth) edge = depth;
    depth_run_ = depth;
    edge_run_ = edge;
    now_ = now;
  }

  RGBA_um_nod getColor(int led) {
    if (num_leds_ <= 0) return RGBA_um_nod::Transparent();
    int pos = num_leds_ <= 1 ? 32768 : led * 32768 / (num_leds_ - 1);
    int dist = 32768 - pos;
    int jag = (int)(((uint32_t)led * 131u + (now_ >> 5)) & 2047u);
    dist += jag - 1024;
    if (dist > depth_run_ + 1500) return RGBA_um_nod::Transparent();
    if (dist < edge_run_) {
      int edge = edge_run_ > 1 ? edge_run_ : 1;
      int a = (edge - dist) * 32768 / edge;
      if (a < 0) a = 0;
      if (a > 32768) a = 32768;
      return SimpleColor(Color16(0, 0, 0)) * (uint16_t)a;
    }
    int band = depth_run_ / 3;
    if (band < 800) band = 800;
    if (dist < edge_run_ + band && dist <= depth_run_ + 512) {
      int into = dist - edge_run_;
      int a = 22000 - into * 22000 / band;
      if (a < 0) a = 0;
      if (a > 32768) a = 32768;
      return color_.getColor(led) * (uint16_t)a;
    }
    return RGBA_um_nod::Transparent();
  }

private:
  PONUA COLOR color_;
  PONUA DEPTH depth_;
  PONUA CYCLE_MS cycle_;
  int num_leds_ = 0;
  int depth_run_ = 0;
  int edge_run_ = 0;
  uint32_t now_ = 0;
};

#endif
