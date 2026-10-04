import { describe, expect, it, beforeEach } from 'vitest';
import { DEFAULT_BOARD_FEATURES } from '../model/board';
import { serializeBladesIni } from '../serialize/bladesIni';
import { serializeBladeStylesIni } from '../serialize/bladeStylesIni';
import { serializeBoardIni } from '../serialize/boardIni';
import { serializeFeaturesIni } from '../serialize/featuresIni';
import { serializePresetsIni } from '../serialize/presetsIni';
import { createDefaultPresets } from '../model/presets';
import type { StyleSection } from '../model/style-sections';
import type { SaberStorage } from '../platform/storage';
import { setSaberStorage } from '../platform/storage';
import { $boardFeatures } from '../stores/boardFeatures';
import { $presets } from '../stores/presets';
import { $styleSections } from '../stores/styleSections';
import { $wiring } from '../stores/wiring';
import {
  applySaberImportResult,
  importAndApplySaberConfig,
  parseSaberConfigTexts,
} from './saber-config';

class MockSaberStorage implements SaberStorage {
  readonly isDesktop = true;

  constructor(
    private root: string | null,
    private files: Record<string, string>,
  ) {}

  async getRoot(): Promise<string | null> {
    return this.root;
  }

  async setRoot(path: string): Promise<void> {
    this.root = path;
  }

  async pickFolder(): Promise<string | null> {
    return this.root;
  }

  async readText(relativePath: string): Promise<string> {
    const content = this.files[relativePath];
    if (content == null) {
      throw new Error(`ENOENT ${relativePath}`);
    }
    return content;
  }

  async writeText(relativePath: string, content: string): Promise<void> {
    this.files[relativePath] = content;
  }
}

describe('parseSaberConfigTexts', () => {
  it('parses all five config files when present', () => {
    const presets = createDefaultPresets(4).slice(0, 1);
    const styles: StyleSection[] = $styleSections.getState().sections.slice(0, 1);
    const wiring = $wiring.getState();
    const result = parseSaberConfigTexts({
      blades: serializeBladesIni(wiring),
      bladeStyles: serializeBladeStylesIni(styles),
      presets: serializePresetsIni(presets),
      board: serializeBoardIni(DEFAULT_BOARD_FEATURES),
      features: serializeFeaturesIni({ ...DEFAULT_BOARD_FEATURES, twistOff: false }),
    });
    expect(result.applied).toEqual(['blades', 'bladeStyles', 'presets', 'board', 'features']);
    expect(result.payload.wiring?.length).toBeGreaterThan(0);
    expect(result.payload.styleSections?.length).toBe(1);
    expect(result.payload.presets?.length).toBe(1);
    expect(result.payload.boardFeatures?.twistOff).toBe(false);
  });

  it('marks missing files without failing', () => {
    const result = parseSaberConfigTexts({});
    expect(result.applied).toEqual([]);
    expect(result.files.every((file) => file.status === 'missing')).toBe(true);
  });
});

describe('importAndApplySaberConfig', () => {
  beforeEach(() => {
    const presets = createDefaultPresets(4).slice(0, 1);
    const styles = $styleSections.getState().sections.slice(0, 1);
    const wiring = $wiring.getState();
    setSaberStorage(
      new MockSaberStorage('C:/saber', {
        'config/blades.ini': serializeBladesIni(wiring),
        'config/blade_styles.ini': serializeBladeStylesIni(styles),
        'config/presets.ini': serializePresetsIni(presets),
        'config/board.ini': serializeBoardIni(DEFAULT_BOARD_FEATURES),
      }),
    );
  });

  it('hydrates stores from saber storage', async () => {
    const storage = new MockSaberStorage('C:/saber', {
      'config/blades.ini': serializeBladesIni($wiring.getState()),
      'config/blade_styles.ini': serializeBladeStylesIni(
        $styleSections.getState().sections.slice(0, 1),
      ),
      'config/presets.ini': serializePresetsIni(createDefaultPresets(4).slice(0, 1)),
      'config/board.ini': serializeBoardIni({ ...DEFAULT_BOARD_FEATURES, buttons: 3 }),
    });
    setSaberStorage(storage);

    const result = await importAndApplySaberConfig(storage);
    expect(result.applied).toContain('blades');
    expect($boardFeatures.getState().buttons).toBe(3);
    expect($presets.getState().presets.length).toBeGreaterThan(0);
  });
});

describe('applySaberImportResult', () => {
  it('applies wiring before normalizing preset slot counts', () => {
    const wiring = $wiring.getState();
    const ini = serializeBladesIni(wiring);
    const result = parseSaberConfigTexts({
      blades: ini,
      presets: serializePresetsIni(createDefaultPresets(4).slice(0, 1)),
    });
    applySaberImportResult(result);
    expect($wiring.getState().length).toBe(wiring.length);
    expect($presets.getState().presets[0]!.styles.length).toBeGreaterThan(0);
  });
});
