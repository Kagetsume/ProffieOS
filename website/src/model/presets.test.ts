import { describe, expect, it } from 'vitest';
import {
  clonePreset,
  createDefaultPresets,
  createEmptyPreset,
  createPresetId,
} from './presets';

describe('presets model', () => {
  it('creates unique preset ids', () => {
    const a = createPresetId();
    const b = createPresetId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^preset_/);
  });

  it('materializes default catalog with normalized slot count', () => {
    const presets = createDefaultPresets(3);
    expect(presets.length).toBeGreaterThan(0);
    expect(presets[0]?.styles).toHaveLength(3);
    expect(presets[0]?.id).toBeTruthy();
  });

  it('clones a preset with a new id and copy suffix', () => {
    const [source] = createDefaultPresets(2);
    expect(source).toBeDefined();
    const clone = clonePreset(source!, 2);
    expect(clone.id).not.toBe(source!.id);
    expect(clone.name).toContain('copy');
    expect(clone.styles).toHaveLength(2);
  });

  it('creates an empty preset with accent-aware defaults', () => {
    const preset = createEmptyPreset(5);
    expect(preset.name).toBe('New preset');
    expect(preset.styles).toHaveLength(5);
    expect(preset.styles[2]?.ref).toBe('accent_pulse');
  });
});
