import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../model/blades';
import { serializeBladesIni } from '../serialize/bladesIni';
import { parseBladesIni } from './bladesIni';

describe('parseBladesIni', () => {
  const sample: BladeDefinition[] = [
    {
      index: 0,
      type: 'ws2811',
      dataPin: 'bladePin',
      pixels: 144,
      powerPins: ['bladePowerPin1', 'bladePowerPin2'],
      comment: 'Main strip',
    },
    {
      index: 1,
      type: 'simple',
      dataPin: 'blade5Pin',
      led: 'CreeXPE2White',
      activeState: 'high',
    },
  ];

  it('round-trips export → parse for wiring fields', () => {
    const ini = serializeBladesIni(sample);
    const parsed = parseBladesIni(ini);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      index: 0,
      dataPin: 'bladePin',
      pixels: 144,
      powerPins: ['bladePowerPin1', 'bladePowerPin2'],
      comment: 'Main strip',
    });
    expect(parsed[1]).toMatchObject({
      index: 1,
      type: 'simple',
      led: 'CreeXPE2White',
      activeState: 'high',
    });
  });
});
