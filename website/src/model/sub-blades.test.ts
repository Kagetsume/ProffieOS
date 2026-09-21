import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from './blades';
import {
  addSubBladeRow,
  exportableSubBlades,
  isValidSubBladeRange,
  logicalBladeSlots,
  removeSubBladeRow,
  subBladeLedCount,
  totalLogicalBladeSlots,
  updateSubBladeRow,
} from './sub-blades';

describe('sub-blades', () => {
  it('counts LEDs in an inclusive range', () => {
    expect(subBladeLedCount({ first: 0, last: 99 })).toBe(100);
    expect(subBladeLedCount({ first: 100, last: 143 })).toBe(44);
  });

  it('validates ranges against pixel count', () => {
    expect(isValidSubBladeRange({ first: 0, last: 143 }, 144)).toBe(true);
    expect(isValidSubBladeRange({ first: 0, last: 144 }, 144)).toBe(false);
    expect(isValidSubBladeRange({ first: 10, last: 5 }, 144)).toBe(false);
    expect(isValidSubBladeRange({ first: 0, last: 10 }, 0)).toBe(false);
    expect(subBladeLedCount({ first: 10, last: 5 })).toBe(0);
  });

  it('exports only valid ranges', () => {
    expect(
      exportableSubBlades(
        [
          { first: 0, last: 99 },
          { first: 100, last: 200 },
        ],
        144,
      ),
    ).toEqual([{ first: 0, last: 99 }]);
  });

  it('adds, updates, and removes sub-blade rows', () => {
    expect(addSubBladeRow(undefined)).toEqual([{ first: 0, last: 0 }]);
    const rows = addSubBladeRow([{ first: 0, last: 99 }]);
    expect(rows[1]).toEqual({ first: 100, last: 100 });
    expect(updateSubBladeRow(rows, 1, { last: 143 })[1]).toEqual({ first: 100, last: 143 });
    expect(removeSubBladeRow(rows, 0)).toHaveLength(1);
  });

  it('counts logical blade slots', () => {
    const fullStrip: BladeDefinition = {
      index: 0,
      type: 'ws2811',
      dataPin: 'bladePin',
      pixels: 144,
    };
    const split: BladeDefinition = {
      ...fullStrip,
      subBlades: [
        { first: 0, last: 99 },
        { first: 100, last: 143 },
      ],
    };
    expect(logicalBladeSlots(fullStrip)).toBe(1);
    expect(logicalBladeSlots(split)).toBe(2);
    expect(totalLogicalBladeSlots([fullStrip, split])).toBe(3);
  });
});
