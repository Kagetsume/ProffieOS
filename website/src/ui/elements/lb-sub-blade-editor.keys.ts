/**
 * i18n keys for {@link LbSubBladeEditor}.
 *
 * @module ui/elements/lb-sub-blade-editor.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const subBladeEditorKeys = {
  heading: 'heading',
  hint: 'hint',
  empty: 'empty',
  slotLabel: 'slotLabel',
  labelFirst: 'label.first',
  labelLast: 'label.last',
  metaLedCount: 'meta.ledCount',
  metaInvalid: 'meta.invalid',
  remove: commonKeys.actions.remove,
  addRange: 'addRange',
} as const;
