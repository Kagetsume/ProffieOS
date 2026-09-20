/**
 * Tests for {@link serializeBladesIni} — power_pin vs power_pinN formatting.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../model/blades';
import { serializeBladesIni } from './bladesIni';

describe('serializeBladesIni power pins', () => {
  const neoBlade = (powerPins: string[]): BladeDefinition => ({
    index: 0,
    type: 'ws2811',
    dataPin: 'bladePin',
    pixels: 144,
    powerPins,
  });

  it('writes a single power_pin field', () => {
    const ini = serializeBladesIni([neoBlade(['bladePowerPin1'])]);
    expect(ini).toContain('power_pin = bladePowerPin1');
    expect(ini).not.toContain('power_pin1');
  });

  it('writes numbered power_pin fields for multiple pins', () => {
    const ini = serializeBladesIni([neoBlade(['bladePowerPin1', 'bladePowerPin2'])]);
    expect(ini).toContain('power_pin1 = bladePowerPin1');
    expect(ini).toContain('power_pin2 = bladePowerPin2');
  });

  it('omits blank slots from export', () => {
    const ini = serializeBladesIni([neoBlade(['bladePowerPin1', ''])]);
    expect(ini).toContain('power_pin = bladePowerPin1');
    expect(ini).not.toContain('power_pin2');
  });

  it('exports board pin header and optional user comment', () => {
    const ini = serializeBladesIni([
      {
        ...neoBlade(['bladePowerPin1']),
        comment: 'Crystal chamber accent',
      },
    ]);
    expect(ini).toContain('# ---- Main blade data (bladePin) ----');
    expect(ini).toContain('# Crystal chamber accent');
  });

  it('omits user comment when empty', () => {
    const ini = serializeBladesIni([neoBlade(['bladePowerPin1'])]);
    expect(ini).toContain('# ---- Main blade data (bladePin) ----');
    expect(ini).not.toMatch(/# Crystal/);
  });
});
