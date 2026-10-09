#ifndef STYLES_DELEGATING_IDLE_BASE_H
#define STYLES_DELEGATING_IDLE_BASE_H

// Forwards run/getColor to a BladeStyle built separately (OS7 monolith, classic EasyBlade, solid base, …).

#include "../blade_style.h"
#include "../../common/color.h"

class DelegatingIdleBase {
public:
  DelegatingIdleBase() : idle_(next_idle_) { next_idle_ = nullptr; }

  ~DelegatingIdleBase() {
    delete idle_;
    idle_ = nullptr;
  }

  DelegatingIdleBase(const DelegatingIdleBase&) = delete;
  DelegatingIdleBase& operator=(const DelegatingIdleBase&) = delete;

  static void SetNextIdle(BladeStyle* idle) { next_idle_ = idle; }
  static BladeStyle* PeekNextIdle() { return next_idle_; }
  static void ClearNextIdle() { next_idle_ = nullptr; }

  void run(BladeBase* blade) {
    if (idle_) idle_->runUpdate(blade);
  }

  SimpleColor getColor(int led) {
    if (!idle_) return SimpleColor(Color16(0, 0, 0));
    OverDriveColor o = idle_->getColor(led);
    SimpleColor ret;
    ret.c = o.c;
    return ret;
  }

private:
  static BladeStyle* next_idle_;
  BladeStyle* idle_;
};

inline BladeStyle* DelegatingIdleBase::next_idle_ = nullptr;

#endif  // STYLES_DELEGATING_IDLE_BASE_H
