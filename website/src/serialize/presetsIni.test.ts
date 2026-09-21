import { describe, expect, it } from 'vitest';
import { createDefaultPresets } from '../model/presets';
import { serializePresetsIni } from './presetsIni';

describe('serializePresetsIni', () => {
  it('writes preset blocks with style lines and end', () => {
    const presets = createDefaultPresets(5).slice(0, 1);
    const ini = serializePresetsIni(presets);
    expect(ini).toContain('new_preset');
    expect(ini).toContain('font = LiquidStatic');
    expect(ini).toContain('style = config smoke_laser');
    expect(ini).toContain('style = accent_pulse 1500');
    expect(ini).toContain('name = Smoke Laser');
    expect(ini).toContain('end');
  });

  it('exports config style with overrides', () => {
    const presets = createDefaultPresets(5);
    const magenta = presets.find((preset) => preset.name === 'Magenta vars');
    expect(magenta).toBeDefined();
    const ini = serializePresetsIni([magenta!]);
    expect(ini).toContain('style = config with_vars base=magenta');
  });
});
