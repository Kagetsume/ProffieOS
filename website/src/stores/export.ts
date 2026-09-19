/**
 * Derived export strings from wiring state (Effector).
 *
 * Phase 1: only `bladesIni`. Phase 2+ will combine presets, styles, board, features here.
 *
 * @module stores/export
 */
import { combine } from 'effector';
import { serializeBladesIni } from '../serialize/bladesIni';
import { $wiring } from './wiring';

/**
 * Live generated file contents. Recomputes whenever `$wiring` changes.
 * Export page subscribes to refresh the copy panel.
 */
export const $export = combine($wiring, (wiring) => ({
  bladesIni: serializeBladesIni(wiring),
}));
