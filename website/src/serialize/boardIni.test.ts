/**
 * Tests for {@link serializeBoardIni} and {@link serializeFeaturesIni}.
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_FEATURES } from '../model/board';
import { serializeBoardIni } from './boardIni';
import { serializeFeaturesIni } from './featuresIni';

describe('serializeBoardIni', () => {
  it('writes hardware and optional gesture keys', () => {
    const ini = serializeBoardIni(DEFAULT_BOARD_FEATURES);
    expect(ini).toContain('buttons = 2');
    expect(ini).toContain('oled = on');
    expect(ini).toContain('bluetooth = on');
    expect(ini).toContain('twist_off = on');
  });

  it('writes off toggles when features are disabled', () => {
    const ini = serializeBoardIni({
      ...DEFAULT_BOARD_FEATURES,
      oled: false,
      bluetooth: false,
      gesture: false,
      twistOn: false,
      twistOff: false,
    });
    expect(ini).toContain('oled = off');
    expect(ini).toContain('bluetooth = off');
    expect(ini).toContain('gesture = off');
    expect(ini).toContain('twist_on = off');
    expect(ini).toContain('twist_off = off');
  });
});

describe('serializeFeaturesIni', () => {
  it('writes gesture and twist toggles only', () => {
    const ini = serializeFeaturesIni({ ...DEFAULT_BOARD_FEATURES, twistOff: false });
    expect(ini).toContain('gesture = on');
    expect(ini).toContain('twist_off = off');
    expect(ini).not.toContain('buttons =');
  });
});
