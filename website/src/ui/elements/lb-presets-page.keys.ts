/**
 * i18n keys for {@link LbPresetsPage}.
 *
 * @module ui/elements/lb-presets-page.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const presetsPageKeys = {
  title: 'title',
  lead: 'lead',
  helpSummary: 'help.summary',
  helpBladeCount: 'help.bladeCount',
  helpConfigRecipe: 'help.configRecipe',
  helpOverrides: 'help.overrides',
  helpAccents: 'help.accents',
  labelPreset: 'label.preset',
  addPreset: 'addPreset',
  duplicate: commonKeys.actions.duplicate,
  remove: commonKeys.actions.remove,
  reset: commonKeys.actions.reset,
  labelFont: 'label.font',
  labelFontOverlay: 'label.fontOverlay',
  labelTrack: 'label.track',
  labelPresetName: 'label.presetName',
  labelVariation: 'label.variation',
  labelComment: 'label.comment',
  headingStyleLines: 'heading.styleLines',
  hintFooter: 'hint.footer',
} as const;
