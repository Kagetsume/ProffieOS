/**
 * Firmware-aligned limits for blade and power pin counts.
 *
 * Keep in sync with ProffieOS SD parser / blade config caps.
 *
 * @module validation/limits
 */

/** Maximum blades in `config/blades.ini` (SD parser limit). */
export const MAX_BLADES = 16;

/** Maximum FET power pins per NeoPixel blade (`power_pin` … `power_pin6`). */
export const MAX_POWER_PINS = 6;

/** Maximum LED ranges per NeoPixel blade (`sub_blade = first, last`). */
export const MAX_SUB_BLADES = 8;

/** Maximum presets in `config/presets.ini` (SD parser limit). */
export const MAX_PRESETS = 64;
