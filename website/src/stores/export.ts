/**
 * Derived export strings from app stores (Effector).
 *
 * @module stores/export
 */
import { combine } from 'effector';
import { serializeBladesIni } from '../serialize/bladesIni';
import { serializeBladeStylesIni } from '../serialize/bladeStylesIni';
import { serializeBoardIni } from '../serialize/boardIni';
import { serializeFeaturesIni } from '../serialize/featuresIni';
import { $boardFeatures } from './boardFeatures';
import { $styleSections } from './styleSections';
import { $wiring } from './wiring';

/**
 * Live generated file contents. Recomputes when any source store changes.
 * Export page subscribes to refresh copy panels.
 */
export const $export = combine(
  {
    wiring: $wiring,
    styles: $styleSections,
    board: $boardFeatures,
  },
  ({ wiring, styles, board }) => ({
    bladesIni: serializeBladesIni(wiring),
    bladeStylesIni: serializeBladeStylesIni(styles.sections),
    boardIni: serializeBoardIni(board),
    featuresIni: serializeFeaturesIni(board),
  }),
);
