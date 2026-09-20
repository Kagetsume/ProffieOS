/**
 * Preview simulation events (Effector) — power + combat triggers for blade preview.
 *
 * @module stores/previewEvents
 */
import { createEvent, createStore } from 'effector';
import type { StyleSection } from '../model/style-sections';
import {
  advancePreviewSim,
  createInitialPreviewSim,
  previewPowerOff,
  previewPowerOn,
  previewSetBladeAngle,
  previewSetDrag,
  previewSetLb,
  previewSetLockup,
  previewSetMelt,
  previewTriggerEvent,
  sectionHasIgnitionFlash,
  sectionHasPostoff,
  sectionHasPreon,
  sectionInOutTimes,
  type PreviewSimState,
  type PreviewTriggerEvent,
} from '../preview/simulation';

export const previewSimTick = createEvent<number>();
export const previewPowerOnClicked = createEvent<StyleSection | null>();
export const previewPowerOffClicked = createEvent<StyleSection | null>();
export const previewEventTriggered = createEvent<{
  event: PreviewTriggerEvent;
  section: StyleSection | null;
}>();
export const previewLockupChanged = createEvent<boolean>();
export const previewDragChanged = createEvent<boolean>();
export const previewMeltChanged = createEvent<boolean>();
export const previewLbChanged = createEvent<boolean>();
export const previewBladeAngleChanged = createEvent<number>();

function layerNames(section: StyleSection | null): string[] {
  return section?.layers.map((layer) => layer.styleName) ?? [];
}

export const $previewSim = createStore<PreviewSimState>(createInitialPreviewSim())
  .on(previewSimTick, (state, now) => advancePreviewSim(state, now))
  .on(previewPowerOnClicked, (state, section) => {
    const names = layerNames(section);
    const timing = section ? sectionInOutTimes(section) : { extendMs: 300, retractMs: 800 };
    const now = performance.now();
    return previewPowerOn(
      state,
      now,
      timing,
      sectionHasPreon(names),
      sectionHasIgnitionFlash(names),
    );
  })
  .on(previewPowerOffClicked, (state, section) => {
    const timing = section ? sectionInOutTimes(section) : { extendMs: 300, retractMs: 800 };
    return previewPowerOff(state, performance.now(), timing, sectionHasPostoff(layerNames(section)));
  })
  .on(previewEventTriggered, (state, { event, section }) => {
    if (!section) {
      return state;
    }
    return previewTriggerEvent(state, event, performance.now());
  })
  .on(previewLockupChanged, (state, active) => previewSetLockup(state, active))
  .on(previewDragChanged, (state, active) => previewSetDrag(state, active))
  .on(previewMeltChanged, (state, active) => previewSetMelt(state, active))
  .on(previewLbChanged, (state, active) => previewSetLb(state, active))
  .on(previewBladeAngleChanged, (state, angle) => previewSetBladeAngle(state, angle));

/** Keep simulation clock aligned with the animation frame timestamp. */
export function syncPreviewClock(now: number): void {
  previewSimTick(now);
}
