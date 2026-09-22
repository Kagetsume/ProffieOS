#ifndef STYLES_BEND_INOUT_H
#define STYLES_BEND_INOUT_H

// OS7 BendTimePow ignition/retraction curves (Fett263 default IGNITION_OPTION2 / RETRACTION_OPTION2).
// Extend: TrWipeX + BendTimePowInv (fast start, slow finish).
// Retract: TrWipeInX + BendTimePow (slow start, fast finish).
//
// Use InOutTrBend<> instead of InOutHelperX<..., InOutFuncX<...>> on full-blade named styles,
// or use the "standard_bend" named style / stack "ignition_flash" on any base.

#include "audio_flicker.h"
#include "blast.h"
#include "inout_helper.h"
#include "lockup.h"
#include "clash.h"
#include "style_ptr.h"
#include "../functions/inout_ms.h"
#include "../functions/int.h"
#include "../functions/mult.h"
#include "../transitions/base.h"
#include "../transitions/wipe.h"

// OS7 default bend exponent (~x^0.335): Mult<10992, 98304>.
using BendInOutPower = Mult<Int<10992>, Int<98304>>;

template<class EXTEND_MS, class RETRACT_MS, class BEND = BendInOutPower>
using InOutBendExtendTr = TrWipeX<BendTimePowInvX<EXTEND_MS, BEND>>;

template<class EXTEND_MS, class RETRACT_MS, class BEND = BendInOutPower>
using InOutBendRetractTr = TrWipeInX<BendTimePowX<RETRACT_MS, BEND>>;

// Full blade wrapper: BASE + bend extend/retract (replaces InOutHelperX + InOutFuncX).
template<class ON, class EXTEND_MS, class RETRACT_MS, class OFF = Rgb<0, 0, 0>>
using InOutTrBend = InOutTr<
  ON,
  InOutBendExtendTr<EXTEND_MS, RETRACT_MS>,
  InOutBendRetractTr<EXTEND_MS, RETRACT_MS>,
  OFF>;

// InOutTrBend with -1 extend/retract args resolved from ignition/retraction sound length.
template<class ON, class EXTEND_MS, class RETRACT_MS, class OFF = Rgb<0, 0, 0>>
using InOutTrBendAuto = InOutTrBend<
  ON,
  InOutMsOrWavLen<EXTEND_MS, EFFECT_IGNITION>,
  InOutMsOrWavLen<RETRACT_MS, EFFECT_RETRACTION>,
  OFF>;

// Fett263 OS7 full blade: idle BASE + SimpleClash/Lockup/Blast + BendTimePow in/out.
template<class BASE,
         class CLASH_COLOR,
         class EXTEND_MS,
         class RETRACT_MS,
         class LOCKUP_COLOR = White>
using Os7BladeWithBendInOut = InOutTrBendAuto<
  SimpleClash<
    Lockup<
      Blast<BASE, CLASH_COLOR>,
      AudioFlicker<BASE, LOCKUP_COLOR>
    >,
    CLASH_COLOR
  >,
  EXTEND_MS,
  RETRACT_MS
>;

// Same args as StyleNormalPtrX but with BendTimePow wipes.
template<class base_color,
         class clash_color,
         class out_millis,
         class in_millis,
         class lockup_flicker_color = WHITE,
         class blast_color = WHITE>
StyleAllocator StyleNormalBendPtrX() {
  typedef AudioFlicker<base_color, lockup_flicker_color> AddFlicker;
  typedef Blast<base_color, blast_color> AddBlast;
  typedef Lockup<AddBlast, AddFlicker> AddLockup;
  typedef SimpleClash<AddLockup, clash_color> AddClash;
  return StylePtr<InOutTrBendAuto<AddClash, out_millis, in_millis>>();
}

// Solid blade base with OS7 BendTimePow in/out — no built-in clash/lockup/blast.
template<class base_color,
         class out_millis,
         class in_millis>
StyleAllocator StyleSolidBendPtrX() {
  return StylePtr<InOutTrBendAuto<base_color, out_millis, in_millis>>();
}

#endif  // STYLES_BEND_INOUT_H
