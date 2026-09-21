/**
 * i18n keys for {@link PoBladeCard}.
 *
 * @module ui/elements/po-blade-card.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const bladeCardKeys = {
  header: 'header',
  remove: commonKeys.actions.remove,
  labelType: 'label.type',
  optionWs2811: 'option.ws2811',
  optionSimple: 'option.simple',
  labelDataPin: 'label.dataPin',
  labelBoardPin: 'label.boardPin',
  placeholderDataPin: 'placeholder.dataPin',
  labelComment: 'label.comment',
  placeholderComment: 'placeholder.comment',
  labelLed: 'label.led',
  labelActiveState: 'label.activeState',
  optionHigh: 'option.high',
  optionLow: 'option.low',
  labelPixels: 'label.pixels',
} as const;
