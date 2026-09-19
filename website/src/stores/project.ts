/**
 * Board profile selection (Effector).
 *
 * Profiles come from `catalog/board-profiles.json`. Changing profile id does not
 * automatically rewire blades — user clicks “Reset to profile defaults” (`applyProfileDefaults`).
 *
 * @module stores/project
 */
import { createEvent, createStore } from 'effector';
import boardProfiles from '../catalog/board-profiles.json';
import type { BladeDefinition } from '../model/blades';

const defaultProfile = boardProfiles.profiles[0]!;

/** User selected a different board profile from the wiring toolbar. */
export const boardProfileChanged = createEvent<string>();

/** Explicit blade count override (reserved for Phase 2 preset sync). */
export const numBladesChanged = createEvent<number>();

/** Active profile id (e.g. `proffie_v3`). */
export const $boardProfileId = createStore(defaultProfile.id).on(
  boardProfileChanged,
  (_, id) => id,
);

/** Target blade count — defaults to profile blade list length. */
export const $numBlades = createStore(defaultProfile.defaultBlades.length).on(
  numBladesChanged,
  (_, n) => n,
);

/**
 * Clone default blades for a profile id.
 * Falls back to the first profile if id is unknown.
 */
export function getProfileBlades(profileId: string): BladeDefinition[] {
  const profile = boardProfiles.profiles.find((p) => p.id === profileId);
  return profile?.defaultBlades ?? defaultProfile.defaultBlades;
}

/** Human-readable profile name for page headings. */
export function getProfileName(profileId: string): string {
  const profile = boardProfiles.profiles.find((p) => p.id === profileId);
  return profile?.name ?? profileId;
}
