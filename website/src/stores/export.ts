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
import { serializePresetsIni } from '../serialize/presetsIni';
import { $boardFeatures } from './boardFeatures';
import { $presets } from './presets';
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
    presets: $presets,
    board: $boardFeatures,
  },
  ({ wiring, styles, presets, board }) => ({
    bladesIni: serializeBladesIni(wiring),
    bladeStylesIni: serializeBladeStylesIni(styles.sections),
    presetsIni: serializePresetsIni(presets.presets),
    boardIni: serializeBoardIni(board),
    featuresIni: serializeFeaturesIni(board),
  }),
);
