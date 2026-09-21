import { describe, expect, it } from 'vitest';
import { $export } from './export';

describe('export store', () => {
  it('derives INI file contents from app stores', () => {
    const files = $export.getState();
    expect(files.bladesIni).toContain('bladePin');
    expect(files.bladeStylesIni).toContain('[');
    expect(files.presetsIni).toContain('new_preset');
    expect(files.boardIni.length).toBeGreaterThan(0);
    expect(files.featuresIni.length).toBeGreaterThan(0);
  });
});
