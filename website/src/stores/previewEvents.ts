/**
 * Preview simulation events (Effector) — power + combat triggers for blade preview.
 *
 * @module stores/previewEvents
 */
import { createEvent, createStore } from 'effector';
import type { StyleSection } from '../model/style-sections';
import { contextLogger } from '../logger';
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
  .on(previewEventTriggered, (state, { event }) =>
    previewTriggerEvent(state, event, performance.now()),
  )
  .on(previewLockupChanged, (state, active) => previewSetLockup(state, active))
  .on(previewDragChanged, (state, active) => previewSetDrag(state, active))
  .on(previewMeltChanged, (state, active) => previewSetMelt(state, active))
  .on(previewLbChanged, (state, active) => previewSetLb(state, active))
  .on(previewBladeAngleChanged, (state, angle) => previewSetBladeAngle(state, angle));

/** Keep simulation clock aligned with the animation frame timestamp. */
export function syncPreviewClock(now: number): void {
  previewSimTick(now);
}

previewPowerOnClicked.watch((section) => {
  contextLogger('previewEvents', 'previewPowerOnClicked').debug('dispatched', {
    sectionId: section?.id ?? null,
  });
});
previewPowerOffClicked.watch((section) => {
  contextLogger('previewEvents', 'previewPowerOffClicked').debug('dispatched', {
    sectionId: section?.id ?? null,
  });
});
previewEventTriggered.watch((event) => {
  contextLogger('previewEvents', 'previewEventTriggered').debug('dispatched', { event });
});
previewLockupChanged.watch((active) => {
  contextLogger('previewEvents', 'previewLockupChanged').debug('dispatched', { active });
});
previewDragChanged.watch((active) => {
  contextLogger('previewEvents', 'previewDragChanged').debug('dispatched', { active });
});
previewMeltChanged.watch((active) => {
  contextLogger('previewEvents', 'previewMeltChanged').debug('dispatched', { active });
});
previewLbChanged.watch((active) => {
  contextLogger('previewEvents', 'previewLbChanged').debug('dispatched', { active });
});
previewBladeAngleChanged.watch((angle) => {
  contextLogger('previewEvents', 'previewBladeAngleChanged').debug('dispatched', { angle });
});
