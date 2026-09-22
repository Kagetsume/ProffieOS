/**
 * Preview event simulation — power states, in/out, and combat overlays.
 *
 * @module preview/simulation
 */
import { getNamedStyle } from '../model/style-catalog';
import type { StyleSection } from '../model/style-sections';
import { resolveLayerArgs } from '../model/style-sections';
import { contextLogger } from '../logger';

export type PreviewTransition = 'none' | 'preon' | 'extending' | 'retracting' | 'postoff';

export type InOutTiming = {
  extendMs: number;
  retractMs: number;
};

export type PreviewSimState = {
  /** Blade is fully ignited (idle on). */
  powered: boolean;
  transition: PreviewTransition;
  transitionUntil: number;
  transitionStartedAt: number;
  extendMs: number;
  retractMs: number;
  /** Run ignition_flash overlay during the extend phase. */
  igniteOnExtend: boolean;
  /** After retract completes, run postoff transition. */
  postoffAfterRetract: boolean;
  blastUntil: number;
  clashUntil: number;
  swingUntil: number;
  /** Held normal lockup / lb overlays until toggled off. */
  lockupActive: boolean;
  /** Held drag overlay until toggled off. */
  dragActive: boolean;
  /** Held melt overlay until toggled off. */
  meltActive: boolean;
  /** Manual blade tilt for responsive lockup preview (0 = hilt-down, 1 = tip-forward). */
  bladeAngleNorm: number;
  /** Held lightning-block overlay until toggled off. */
  lbActive: boolean;
  ignitionUntil: number;
  forceUntil: number;
};

export const PREVIEW_DURATIONS = {
  blast: 400,
  clash: 280,
  swing: 900,
  force: 800,
  preon: 750,
  postoff: 750,
  ignition: 500,
} as const;

/** Minimum on-screen in/out times (firmware ms are often 300/800 — too fast to read). */
const PREVIEW_IN_OUT_FLOOR = {
  extend: 900,
  retract: 1100,
} as const;

const PREVIEW_IN_OUT_SCALE = 2.5;

/** Scale firmware extend/retract ms for readable preview animation. */
export function previewAnimationMs(ms: number, kind: 'extend' | 'retract'): number {
  const floor = kind === 'extend' ? PREVIEW_IN_OUT_FLOOR.extend : PREVIEW_IN_OUT_FLOOR.retract;
  return Math.max(floor, Math.round(ms * PREVIEW_IN_OUT_SCALE));
}

const DEFAULT_IN_OUT: InOutTiming = { extendMs: 300, retractMs: 800 };

/** Firmware sentinel: extend/retract ms from ignition/retraction soundfont (WavLen). */
export const AUTO_IN_OUT_MS = -1;

/** Preview stand-in when soundfont duration is unavailable in the browser. */
const PREVIEW_AUTO_IN_OUT_FALLBACK: InOutTiming = { extendMs: 800, retractMs: 1000 };

function parseInOutMs(
  value: string | undefined,
  fallback: number,
  kind: 'extend' | 'retract',
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isFinite(parsed) && parsed < 1) {
    return kind === 'extend'
      ? PREVIEW_AUTO_IN_OUT_FALLBACK.extendMs
      : PREVIEW_AUTO_IN_OUT_FALLBACK.retractMs;
  }
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function inOutFromLayerArgs(styleName: string, args: string[]): InOutTiming | null {
  const def = getNamedStyle(styleName);
  if (!def) {
    return null;
  }
  const extIdx = def.args.findIndex((arg) => arg.slot === 'ext' || arg.slot === 'extend_ms');
  const retIdx = def.args.findIndex((arg) => arg.slot === 'ret' || arg.slot === 'retract_ms');
  if (extIdx < 0 || retIdx < 0) {
    return null;
  }
  return {
    extendMs: parseInOutMs(args[extIdx], DEFAULT_IN_OUT.extendMs, 'extend'),
    retractMs: parseInOutMs(args[retIdx], DEFAULT_IN_OUT.retractMs, 'retract'),
  };
}

/** Read extend/retract ms from section vars or the first base layer. */
export function sectionInOutTimes(section: StyleSection): InOutTiming {
  const fromVars = section.vars.ext ?? section.vars.extend_ms;
  const toVars = section.vars.ret ?? section.vars.retract_ms;
  if (fromVars || toVars) {
    return {
      extendMs: parseInOutMs(fromVars, DEFAULT_IN_OUT.extendMs, 'extend'),
      retractMs: parseInOutMs(toVars, DEFAULT_IN_OUT.retractMs, 'retract'),
    };
  }

  for (const layer of section.layers) {
    const args = resolveLayerArgs(layer, section.vars);
    const timing = inOutFromLayerArgs(layer.styleName, args);
    if (timing) {
      return timing;
    }
  }

  return { ...DEFAULT_IN_OUT };
}

export function createInitialPreviewSim(): PreviewSimState {
  return {
    powered: true,
    transition: 'none',
    transitionUntil: 0,
    transitionStartedAt: 0,
    ...DEFAULT_IN_OUT,
    igniteOnExtend: false,
    postoffAfterRetract: false,
    blastUntil: 0,
    clashUntil: 0,
    swingUntil: 0,
    lockupActive: false,
    dragActive: false,
    meltActive: false,
    bladeAngleNorm: 0.5,
    lbActive: false,
    ignitionUntil: 0,
    forceUntil: 0,
  };
}

export function isSimEventActive(until: number, now: number): boolean {
  return until > now;
}

function easeOutCubic(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return 1 - (1 - u) ** 3;
}

function easeInCubic(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u ** 3;
}

function inOutElapsed(state: PreviewSimState, now: number): number {
  if (state.transitionStartedAt <= 0) {
    return 0;
  }
  if (state.transition !== 'extending' && state.transition !== 'retracting') {
    return 0;
  }
  const duration = state.transitionUntil - state.transitionStartedAt;
  if (duration <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, (now - state.transitionStartedAt) / duration));
}

/** 0 = hilt only, 1 = full blade length (hilt → tip). */
export function bladeLengthFraction(state: PreviewSimState, now: number): number {
  switch (state.transition) {
    case 'extending':
      return easeOutCubic(inOutElapsed(state, now));
    case 'retracting':
      return 1 - easeInCubic(inOutElapsed(state, now));
    case 'preon':
    case 'postoff':
      return 0;
    case 'none':
      return state.powered ? 1 : 0;
    default:
      return state.powered ? 1 : 0;
  }
}

/** True when opaque base layers should render (may be partial length). */
export function isBaseBladeVisible(state: PreviewSimState, _now: number): boolean {
  if (state.transition === 'preon' || state.transition === 'postoff') {
    return false;
  }
  if (state.transition === 'extending' || state.transition === 'retracting') {
    return true;
  }
  return state.powered;
}

export function isPreonActive(state: PreviewSimState, now: number): boolean {
  return state.transition === 'preon' && state.transitionUntil > now;
}

export function isPostoffActive(state: PreviewSimState, now: number): boolean {
  return state.transition === 'postoff' && state.transitionUntil > now;
}

export function isIgnitionActive(state: PreviewSimState, now: number): boolean {
  return isSimEventActive(state.ignitionUntil, now);
}

export function transitionProgress(state: PreviewSimState, now: number): number {
  if (state.transition === 'none' || state.transitionUntil <= now) {
    return 1;
  }
  const duration =
    state.transition === 'preon'
      ? PREVIEW_DURATIONS.preon
      : state.transition === 'postoff'
        ? PREVIEW_DURATIONS.postoff
        : state.transitionUntil - state.transitionStartedAt;
  if (duration <= 0) {
    return 1;
  }
  const remaining = state.transitionUntil - now;
  return Math.max(0, Math.min(1, 1 - remaining / duration));
}

export function eventIntensity(until: number, now: number, duration: number): number {
  if (until <= now) {
    return 0;
  }
  const remaining = until - now;
  return Math.max(0, Math.min(1, remaining / duration));
}

function startExtending(state: PreviewSimState, now: number): PreviewSimState {
  const duration = previewAnimationMs(state.extendMs, 'extend');
  const next: PreviewSimState = {
    ...state,
    transition: 'extending',
    transitionStartedAt: now,
    transitionUntil: now + duration,
    powered: false,
  };
  if (next.igniteOnExtend) {
    next.ignitionUntil = now + PREVIEW_DURATIONS.ignition;
    next.igniteOnExtend = false;
  }
  return next;
}

function startRetracting(state: PreviewSimState, now: number): PreviewSimState {
  const duration = previewAnimationMs(state.retractMs, 'retract');
  return {
    ...state,
    transition: 'retracting',
    transitionStartedAt: now,
    transitionUntil: now + duration,
    blastUntil: 0,
    clashUntil: 0,
    swingUntil: 0,
    lockupActive: false,
    dragActive: false,
    meltActive: false,
    lbActive: false,
    ignitionUntil: 0,
    forceUntil: 0,
  };
}

export function advancePreviewSim(state: PreviewSimState, now: number): PreviewSimState {
  if (state.transition === 'preon' && state.transitionUntil <= now) {
    return startExtending(state, now);
  }

  if (state.transition === 'extending' && state.transitionUntil <= now) {
    return {
      ...state,
      transition: 'none',
      transitionUntil: 0,
      transitionStartedAt: 0,
      powered: true,
    };
  }

  if (state.transition === 'retracting' && state.transitionUntil <= now) {
    if (state.postoffAfterRetract) {
      return {
        ...state,
        transition: 'postoff',
        transitionStartedAt: now,
        transitionUntil: now + PREVIEW_DURATIONS.postoff,
        postoffAfterRetract: false,
        powered: false,
      };
    }
    return {
      ...state,
      transition: 'none',
      transitionUntil: 0,
      transitionStartedAt: 0,
      powered: false,
    };
  }

  if (state.transition === 'postoff' && state.transitionUntil <= now) {
    return {
      ...state,
      transition: 'none',
      transitionUntil: 0,
      transitionStartedAt: 0,
      powered: false,
    };
  }

  return state;
}

export function previewPowerOn(
  state: PreviewSimState,
  now: number,
  timing: InOutTiming,
  hasPreon: boolean,
  hasIgnition: boolean,
): PreviewSimState {
  if (state.powered && state.transition === 'none') {
    contextLogger('preview', 'previewPowerOn').debug('skipped', { reason: 'already on' });
    return state;
  }

  const next: PreviewSimState = {
    ...state,
    ...timing,
    powered: false,
    transition: 'none',
    transitionUntil: 0,
    transitionStartedAt: 0,
    postoffAfterRetract: false,
    igniteOnExtend: hasIgnition,
  };

  if (hasPreon) {
    next.transition = 'preon';
    next.transitionStartedAt = now;
    next.transitionUntil = now + PREVIEW_DURATIONS.preon;
    contextLogger('preview', 'previewPowerOn').debug('transition', { transition: 'preon', hasIgnition });
    return next;
  }

  const extending = startExtending(next, now);
  contextLogger('preview', 'previewPowerOn').debug('transition', {
    transition: extending.transition,
    hasIgnition,
  });
  return extending;
}

export function previewPowerOff(
  state: PreviewSimState,
  now: number,
  timing: InOutTiming,
  hasPostoff: boolean,
): PreviewSimState {
  if (!state.powered && state.transition === 'none') {
    contextLogger('preview', 'previewPowerOff').debug('skipped', { reason: 'already off' });
    return state;
  }

  if (state.transition === 'preon') {
    contextLogger('preview', 'previewPowerOff').debug('cancelled', {
      transition: 'none',
      cancelled: 'preon',
    });
    return {
      ...state,
      powered: false,
      transition: 'none',
      transitionUntil: 0,
      transitionStartedAt: 0,
      postoffAfterRetract: false,
      igniteOnExtend: false,
    };
  }

  if (state.transition === 'extending') {
    contextLogger('preview', 'previewPowerOff').debug('cancelled', {
      transition: 'none',
      cancelled: 'extending',
    });
    return {
      ...createInitialPreviewSim(),
      ...timing,
      powered: false,
    };
  }

  const next = startRetracting(
    {
      ...state,
      ...timing,
      postoffAfterRetract: hasPostoff,
    },
    now,
  );
  contextLogger('preview', 'previewPowerOff').debug('transition', {
    transition: next.transition,
    hasPostoff,
  });
  return next;
}

export type PreviewTriggerEvent = 'blast' | 'clash' | 'swing' | 'force';

function canSimulateCombat(state: PreviewSimState): boolean {
  return state.powered && state.transition === 'none';
}

/** Set held lockup on/off while the blade is ignited and idle. */
export function previewSetLockup(state: PreviewSimState, active: boolean): PreviewSimState {
  if (!canSimulateCombat(state)) {
    return state.lockupActive ? { ...state, lockupActive: false } : state;
  }
  return state.lockupActive === active ? state : { ...state, lockupActive: active };
}

/** Set held drag on/off while the blade is ignited and idle. */
export function previewSetDrag(state: PreviewSimState, active: boolean): PreviewSimState {
  if (!canSimulateCombat(state)) {
    return state.dragActive ? { ...state, dragActive: false } : state;
  }
  return state.dragActive === active ? state : { ...state, dragActive: active };
}

/** Set held melt on/off while the blade is ignited and idle. */
export function previewSetMelt(state: PreviewSimState, active: boolean): PreviewSimState {
  if (!canSimulateCombat(state)) {
    return state.meltActive ? { ...state, meltActive: false } : state;
  }
  return state.meltActive === active ? state : { ...state, meltActive: active };
}

/** Set manual blade angle for responsive lockup / LB preview (0…1). */
export function previewSetBladeAngle(state: PreviewSimState, angleNorm: number): PreviewSimState {
  const bladeAngleNorm = Math.max(0, Math.min(1, angleNorm));
  return state.bladeAngleNorm === bladeAngleNorm ? state : { ...state, bladeAngleNorm };
}

/** Set held lightning block on/off while the blade is ignited and idle. */
export function previewSetLb(state: PreviewSimState, active: boolean): PreviewSimState {
  if (!canSimulateCombat(state)) {
    return state.lbActive ? { ...state, lbActive: false } : state;
  }
  return state.lbActive === active ? state : { ...state, lbActive: active };
}

export function previewTriggerEvent(
  state: PreviewSimState,
  event: PreviewTriggerEvent,
  now: number,
): PreviewSimState {
  if (!state.powered || state.transition !== 'none') {
    contextLogger('preview', 'previewTriggerEvent').debug('ignored', { event, applied: false });
    return state;
  }

  const next = { ...state };
  switch (event) {
    case 'blast':
      next.blastUntil = now + PREVIEW_DURATIONS.blast;
      break;
    case 'clash':
      next.clashUntil = now + PREVIEW_DURATIONS.clash;
      break;
    case 'swing':
      next.swingUntil = now + PREVIEW_DURATIONS.swing;
      break;
    case 'force':
      next.forceUntil = now + PREVIEW_DURATIONS.force;
      break;
    default:
      break;
  }
  contextLogger('preview', 'previewTriggerEvent').debug('applied', { event, applied: true });
  return next;
}

export type OverlayPhase =
  | 'blast'
  | 'clash'
  | 'swing'
  | 'lockup'
  | 'drag'
  | 'lb'
  | 'melt'
  | 'preon'
  | 'postoff'
  | 'ignition'
  | 'force'
  | 'idle_on';

const OVERLAY_PHASE: Record<string, OverlayPhase> = {
  blast: 'blast',
  blast_wave_random: 'blast',
  responsive_blast: 'blast',
  clash: 'clash',
  localized_clash: 'clash',
  responsive_clash: 'clash',
  real_clash: 'clash',
  swing: 'swing',
  lockup: 'lockup',
  responsive_lockup: 'lockup',
  drag: 'drag',
  lb: 'lb',
  melt: 'melt',
  sparkle: 'idle_on',
  preon_glow: 'preon',
  preon_wipe: 'preon',
  preon_sputter: 'preon',
  postoff_glow: 'postoff',
  postoff_wipe: 'postoff',
  postoff_sputter: 'postoff',
  force_glow: 'force',
  ignition_flash: 'ignition',
};

export function overlayPhaseForStyle(styleName: string): OverlayPhase | undefined {
  return OVERLAY_PHASE[styleName];
}

export function isOverlayPhaseActive(
  phase: OverlayPhase,
  state: PreviewSimState,
  now: number,
): boolean {
  switch (phase) {
    case 'blast':
      return isSimEventActive(state.blastUntil, now);
    case 'clash':
      return isSimEventActive(state.clashUntil, now);
    case 'swing':
      return isSimEventActive(state.swingUntil, now);
    case 'lockup':
      return state.lockupActive;
    case 'drag':
      return state.dragActive;
    case 'lb':
      return state.lbActive;
    case 'melt':
      return state.meltActive;
    case 'preon':
      return isPreonActive(state, now);
    case 'postoff':
      return isPostoffActive(state, now);
    case 'ignition':
      return isIgnitionActive(state, now) || state.transition === 'extending';
    case 'force':
      return isSimEventActive(state.forceUntil, now);
    case 'idle_on':
      return state.powered && state.transition === 'none';
    default:
      return false;
  }
}

export function sectionHasPreon(sectionLayers: string[]): boolean {
  return sectionLayers.some((name) => name.startsWith('preon_'));
}

export function sectionHasPostoff(sectionLayers: string[]): boolean {
  return sectionLayers.some((name) => name.startsWith('postoff_'));
}

export function sectionHasIgnitionFlash(sectionLayers: string[]): boolean {
  return sectionLayers.includes('ignition_flash');
}
