/**
 * Which preview combat controls are meaningful for a style section's layer stack.
 *
 * @module preview/preview-capabilities
 */
import type { StyleLayer, StyleSection } from '../model/style-sections';
import { sectionHasDedicatedLockupLayer } from '../model/style-sections';
import { overlayPhaseForStyle, type OverlayPhase } from './simulation';

export type PreviewCombatControl =
  | 'blast'
  | 'clash'
  | 'swing'
  | 'force'
  | 'lockup'
  | 'drag'
  | 'melt'
  | 'lb';

export type PreviewSectionCapabilities = Record<PreviewCombatControl, boolean>;

const PHASE_TO_CONTROL: Partial<Record<OverlayPhase, PreviewCombatControl>> = {
  blast: 'blast',
  clash: 'clash',
  swing: 'swing',
  force: 'force',
  lockup: 'lockup',
  drag: 'drag',
  melt: 'melt',
  lb: 'lb',
};

/** Styles whose preview renderer reacts to sim state without a matching overlay layer. */
const STYLE_EXTRA_CONTROLS: Partial<Record<string, PreviewCombatControl[]>> = {
  swing_layer: ['swing'],
  standard: ['lockup'],
  standard_bend: ['lockup'],
  kinetic_charge_layer: ['clash', 'lockup', 'swing'],
  kinetic_charge: ['clash', 'lockup', 'swing'],
  static_electricity_layer: ['swing'],
  static_electricity: ['swing'],
  water_flow_layer: ['swing'],
  water_flow: ['swing'],
  darksaber_layer: ['swing'],
  darksaber: ['swing'],
  shimmer_blade_layer: ['swing'],
  shimmer_blade: ['swing'],
  rotoscope_layer: ['swing'],
  rotoscope: ['swing'],
  trickle_blade_layer: ['swing'],
  trickle_blade: ['swing'],
};

function markControl(caps: PreviewSectionCapabilities, control: PreviewCombatControl): void {
  caps[control] = true;
}

function applyStyleCapabilities(
  caps: PreviewSectionCapabilities,
  styleName: string,
  hasDedicatedLockup: boolean,
): void {
  const phase = overlayPhaseForStyle(styleName);
  if (phase) {
    const control = PHASE_TO_CONTROL[phase];
    if (control) {
      markControl(caps, control);
    }
  }

  for (const control of STYLE_EXTRA_CONTROLS[styleName] ?? []) {
    if (control === 'lockup' && hasDedicatedLockup) {
      continue;
    }
    markControl(caps, control);
  }
}

function collectLayerStyleNames(
  layers: StyleLayer[],
  sectionsById: Map<string, StyleSection>,
  visitedSectionIds: Set<string>,
): string[] {
  const names: string[] = [];
  for (const layer of layers) {
    if (layer.styleName === 'config' && layer.configSection) {
      const nested = sectionsById.get(layer.configSection);
      if (nested && !visitedSectionIds.has(nested.id)) {
        visitedSectionIds.add(nested.id);
        names.push(...collectLayerStyleNames(nested.layers, sectionsById, visitedSectionIds));
      }
      continue;
    }
    names.push(layer.styleName);
  }
  return names;
}

/** Derive which preview buttons/toggles apply to this section (includes nested `config` layers). */
export function sectionPreviewCapabilities(
  section: StyleSection | null | undefined,
  allSections: StyleSection[] = [],
): PreviewSectionCapabilities {
  const caps: PreviewSectionCapabilities = {
    blast: false,
    clash: false,
    swing: false,
    force: false,
    lockup: false,
    drag: false,
    melt: false,
    lb: false,
  };
  if (!section) {
    return caps;
  }

  const sectionsById = new Map(allSections.map((entry) => [entry.id, entry]));
  sectionsById.set(section.id, section);

  const styleNames = collectLayerStyleNames(section.layers, sectionsById, new Set([section.id]));
  const hasDedicatedLockup = sectionHasDedicatedLockupLayer(section);

  for (const name of styleNames) {
    applyStyleCapabilities(caps, name, hasDedicatedLockup);
  }

  return caps;
}

/** True when the control should be interactive (blade on + section supports the effect). */
export function previewCombatControlEnabled(
  caps: PreviewSectionCapabilities,
  combatReady: boolean,
  control: PreviewCombatControl,
): boolean {
  return combatReady && caps[control];
}
