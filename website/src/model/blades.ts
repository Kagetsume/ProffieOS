/**
 * Core blade wiring types for `config/blades.ini`.
 *
 * These mirror the SD file structure documented in `doc/blade_config.md`.
 * User guide with examples: `website/BLADES.md`.
 *
 * - **NeoPixel** (`ws2811`): `pixels`, `powerPins`, optional `subBlades` ranges
 * - **Simple PWM** (`type = simple`): `led`, `activeState` on a single data pin
 * - **comment**: optional user note exported as `#` line (board silkscreen label is derived from `dataPin`)
 *
 * @module model/blades
 */

/** Blade driver type as written in INI (`type = simple` or omitted for NeoPixel). */
export type BladeType = 'ws2811' | 'simple';

/** GPIO active level for simple blades (`active_state = high|low`). */
export type ActiveState = 'high' | 'low';

/** Inclusive LED index range for one logical sub-blade on a NeoPixel strip. */
export type SubBladeRange = {
  /** First pixel index (0-based). */
  first: number;
  /** Last pixel index (inclusive). */
  last: number;
};

/**
 * One blade entry in the wiring editor / `blades.ini`.
 *
 * Index must match preset `style =` line order and firmware `NUM_BLADES`.
 */
export type BladeDefinition = {
  /** Blade index (0 … MAX_BLADES-1). */
  index: number;
  type: BladeType;
  /** Data pin name or number (e.g. `bladePin`, `blade5Pin`). */
  dataPin: string;
  /** NeoPixel pixel count (ws2811 only). */
  pixels?: number;
  /** FET power pin names, up to six (ws2811 only). May include empty strings while editing. */
  powerPins?: string[];
  /**
   * NeoPixel strip segments (ws2811 only). Each range becomes one `sub_blade = first, last`
   * line and one logical blade for preset `style =` entries. Omit for a single full-strip blade.
   */
  subBlades?: SubBladeRange[];
  /** SimpleBlade LED type name (simple only). */
  led?: string;
  /** GPIO polarity for simple accents (simple only). */
  activeState?: ActiveState;
  /** Optional user note exported as a `#` comment in `blades.ini`. */
  comment?: string;
};

/**
 * Board preset from `catalog/board-profiles.json`.
 * Supplies default blade wiring when user picks or resets a profile.
 */
export type BoardProfile = {
  id: string;
  name: string;
  description: string;
  defaultBlades: BladeDefinition[];
};
