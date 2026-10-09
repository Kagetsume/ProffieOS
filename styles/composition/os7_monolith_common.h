#ifndef STYLES_OS7_MONOLITH_COMMON_H
#define STYLES_OS7_MONOLITH_COMMON_H

// Shared OS7 full-blade monolith helpers (Fett263 BendTimePow in/out + clash/lockup/blast).
//
// Phase 2: monolith uses DelegatingOs7IdleBase inside ONE shared Os7MonolithBladeStyle tree.
// Idle BASE is a separate Style<BASE> (same as *_layer). Flash wins when all monoliths share
// Os7MonolithBladeStyle<DelegatingOs7IdleBase> instead of per-BASE Os7MonolithBladeStyle<BASE>.

#include "../../common/color.h"
#include "bend_inout.h"
#include "delegating_idle_base.h"
#include "../style_ptr.h"
#include "../../functions/int_arg.h"

// Default monolith overlay / timing args (match style_parser.h OS7 entries).
using Os7MonolithClashColor = RgbArg<2, White>;
using Os7MonolithExtendMs = IntArg<3, 300>;
using Os7MonolithRetractMs = IntArg<4, 800>;

template<class BASE>
using Os7MonolithBladeStyle = Os7BladeWithBendInOut<
  BASE,
  Os7MonolithClashColor,
  Os7MonolithExtendMs,
  Os7MonolithRetractMs>;

using DelegatingOs7IdleBase = DelegatingIdleBase;

using Os7MonolithSharedTree = Os7MonolithBladeStyle<DelegatingOs7IdleBase>;

inline StyleAllocator Os7MonolithSharedStyleAllocator() {
  return StylePtr<Os7MonolithSharedTree>();
}

// kinetic_charge: clash/extend/retract are args 3–5 (args 1–2 are base + kinetic on idle BASE).
using Os7MonolithKineticSharedTree = Os7BladeWithBendInOut<
  DelegatingOs7IdleBase,
  RgbArg<3, White>,
  IntArg<4, 300>,
  IntArg<5, 800>>;

inline StyleAllocator Os7MonolithKineticSharedStyleAllocator() {
  return StylePtr<Os7MonolithKineticSharedTree>();
}

template<class BASE>
inline StyleAllocator Os7IdleBaseStyleAllocator() {
  return StylePtr<BASE>();
}

template<class BASE>
class Os7IdleBaseStyleFactory : public StyleFactory {
public:
  BladeStyle* make() override { return Os7IdleBaseStyleAllocator<BASE>()->make(); }
};

template<class BASE, StyleAllocator (*MonolithAllocator)()>
class Os7MonolithFromBaseStyleFactoryImpl : public StyleFactory {
public:
  BladeStyle* make() override {
    BladeStyle* idle = Os7IdleBaseStyleFactory<BASE>().make();
    if (!idle) return nullptr;
    DelegatingIdleBase::SetNextIdle(idle);
    BladeStyle* monolith = MonolithAllocator()->make();
    if (DelegatingIdleBase::PeekNextIdle()) {
      delete idle;
      DelegatingIdleBase::ClearNextIdle();
      delete monolith;
      return nullptr;
    }
    return monolith;
  }
};

// Monolith: idle Style<BASE> + shared OS7 wrapper (single Os7MonolithSharedTree in flash).
template<class BASE>
class Os7MonolithFromBaseStyleFactory
    : public Os7MonolithFromBaseStyleFactoryImpl<BASE, Os7MonolithSharedStyleAllocator> {};

template<class BASE>
class Os7MonolithFromBaseKineticFactory
    : public Os7MonolithFromBaseStyleFactoryImpl<BASE, Os7MonolithKineticSharedStyleAllocator> {};

// Legacy direct monolith (duplicates BASE + OS7 tree). Use until migrated to FromBase.
template<class BASE>
class Os7MonolithStyleFactory : public StyleFactory {
public:
  BladeStyle* make() override { return StylePtr<Os7MonolithBladeStyle<BASE>>()->make(); }
};

#endif  // STYLES_OS7_MONOLITH_COMMON_H
