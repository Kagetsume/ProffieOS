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
});

describe('serializeFeaturesIni', () => {
  it('writes gesture and twist toggles only', () => {
    const ini = serializeFeaturesIni({ ...DEFAULT_BOARD_FEATURES, twistOff: false });
    expect(ini).toContain('gesture = on');
    expect(ini).toContain('twist_off = off');
    expect(ini).not.toContain('buttons =');
  });
});
