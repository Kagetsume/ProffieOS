/**
 * Load and apply ProffieOS saber `config/*.ini` files into editor stores.
 *
 * @module import/saber-config
 */
import type { BoardFeaturesState } from '../model/board';
import { DEFAULT_BOARD_FEATURES } from '../model/board';
import type { BladeDefinition } from '../model/blades';
import type { PresetDefinition } from '../model/presets';
import { normalizePresetStyles } from '../model/preset-styles';
import type { StyleSection } from '../model/style-sections';
import { totalLogicalBladeSlots } from '../model/sub-blades';
import { parseBladeStylesIni } from '../parse/bladeStylesIni';
import { parseBladesIni } from '../parse/bladesIni';
import { parseBoardIni } from '../parse/boardIni';
import { parseFeaturesIni } from '../parse/featuresIni';
import { parsePresetsIni } from '../parse/presetsIni';
import { SABER_CONFIG_FILES, type SaberConfigFileId } from '../platform/saber-paths.js';
import type { SaberStorage } from '../platform/storage.js';
import { boardFeaturesChanged } from '../stores/boardFeatures';
import { presetsImported } from '../stores/presets';
import { styleSectionsImported } from '../stores/styleSections';
import { $wiring, wiringImported } from '../stores/wiring';

export type SaberImportFileStatus = {
  id: SaberConfigFileId;
  relativePath: string;
  status: 'imported' | 'missing' | 'empty' | 'error';
  detail?: string;
};

export type SaberImportPayload = {
  wiring?: BladeDefinition[];
  styleSections?: StyleSection[];
  presets?: PresetDefinition[];
  boardFeatures?: BoardFeaturesState;
};

export type SaberImportResult = {
  files: SaberImportFileStatus[];
  payload: SaberImportPayload;
  applied: SaberConfigFileId[];
};

function fileLabel(relativePath: string): string {
  const parts = relativePath.split('/');
  return parts[parts.length - 1] ?? relativePath;
}

/** Parse known INI texts into editor models (no store updates). */
export function parseSaberConfigTexts(
  texts: Partial<Record<SaberConfigFileId, string>>,
): SaberImportResult {
  const files: SaberImportFileStatus[] = [];
  const applied: SaberConfigFileId[] = [];
  const payload: SaberImportPayload = {};

  let boardBase: BoardFeaturesState | undefined;
  let featuresPatch: ReturnType<typeof parseFeaturesIni> | undefined;

  for (const spec of SABER_CONFIG_FILES) {
    const text = texts[spec.id];
    if (text == null) {
      files.push({
        id: spec.id,
        relativePath: spec.relativePath,
        status: 'missing',
      });
      continue;
    }
    if (!text.trim()) {
      files.push({
        id: spec.id,
        relativePath: spec.relativePath,
        status: 'empty',
      });
      continue;
    }

    try {
      switch (spec.id) {
        case 'blades': {
          const wiring = parseBladesIni(text);
          if (wiring.length === 0) {
            files.push({
              id: spec.id,
              relativePath: spec.relativePath,
              status: 'empty',
              detail: 'No blade blocks found',
            });
            break;
          }
          payload.wiring = wiring;
          applied.push(spec.id);
          files.push({ id: spec.id, relativePath: spec.relativePath, status: 'imported' });
          break;
        }
        case 'bladeStyles': {
          const sections = parseBladeStylesIni(text);
          if (sections.length === 0) {
            files.push({
              id: spec.id,
              relativePath: spec.relativePath,
              status: 'empty',
              detail: 'No [sections] found',
            });
            break;
          }
          payload.styleSections = sections;
          applied.push(spec.id);
          files.push({ id: spec.id, relativePath: spec.relativePath, status: 'imported' });
          break;
        }
        case 'presets': {
          const presets = parsePresetsIni(text);
          if (presets.length === 0) {
            files.push({
              id: spec.id,
              relativePath: spec.relativePath,
              status: 'empty',
              detail: 'No preset blocks found',
            });
            break;
          }
          payload.presets = presets;
          applied.push(spec.id);
          files.push({ id: spec.id, relativePath: spec.relativePath, status: 'imported' });
          break;
        }
        case 'board': {
          boardBase = parseBoardIni(text);
          applied.push(spec.id);
          files.push({ id: spec.id, relativePath: spec.relativePath, status: 'imported' });
          break;
        }
        case 'features': {
          featuresPatch = parseFeaturesIni(text);
          if (Object.keys(featuresPatch).length === 0) {
            files.push({
              id: spec.id,
              relativePath: spec.relativePath,
              status: 'empty',
              detail: 'No gesture/twist keys',
            });
            break;
          }
          applied.push(spec.id);
          files.push({ id: spec.id, relativePath: spec.relativePath, status: 'imported' });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      files.push({
        id: spec.id,
        relativePath: spec.relativePath,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (boardBase || featuresPatch) {
    payload.boardFeatures = {
      ...DEFAULT_BOARD_FEATURES,
      ...(boardBase ?? {}),
      ...(featuresPatch ?? {}),
    };
  }

  return { files, payload, applied };
}

/** Read all known config paths from saber storage (missing files are skipped). */
export async function readSaberConfigTexts(
  storage: SaberStorage,
): Promise<Partial<Record<SaberConfigFileId, string>>> {
  const texts: Partial<Record<SaberConfigFileId, string>> = {};
  for (const spec of SABER_CONFIG_FILES) {
    try {
      texts[spec.id] = await storage.readText(spec.relativePath);
    } catch {
      /* file missing or unreadable */
    }
  }
  return texts;
}

/** Load and parse config from the active saber root. */
export async function importSaberConfigFromStorage(
  storage: SaberStorage,
): Promise<SaberImportResult> {
  const texts = await readSaberConfigTexts(storage);
  return parseSaberConfigTexts(texts);
}

/** Dispatch store events to hydrate the editor from a parse result. */
export function applySaberImportResult(result: SaberImportResult): void {
  const { payload } = result;
  if (payload.wiring && payload.wiring.length > 0) {
    wiringImported(payload.wiring);
  }

  if (payload.styleSections && payload.styleSections.length > 0) {
    styleSectionsImported(payload.styleSections);
  }

  const slotCount = Math.max(
    1,
    totalLogicalBladeSlots(payload.wiring ?? $wiring.getState()),
  );

  if (payload.presets && payload.presets.length > 0) {
    const presets = payload.presets.map((preset) => ({
      ...preset,
      styles: normalizePresetStyles(preset.styles, slotCount),
    }));
    presetsImported(presets);
  }

  if (payload.boardFeatures) {
    boardFeaturesChanged(payload.boardFeatures);
  }
}

/** Read saber config and hydrate stores; returns status for UI. */
export async function importAndApplySaberConfig(
  storage: SaberStorage,
): Promise<SaberImportResult> {
  const result = await importSaberConfigFromStorage(storage);
  applySaberImportResult(result);
  return result;
}

/** Human-readable one-line summary for the export page status line. */
export function formatSaberImportSummary(result: SaberImportResult): string {
  const imported = result.files.filter((file) => file.status === 'imported');
  if (imported.length === 0) {
    const missing = result.files.filter((file) => file.status === 'missing');
    if (missing.length === result.files.length) {
      return 'No config files found under config/ — using editor defaults';
    }
    return 'Import finished — no usable config sections (see details)';
  }
  const names = imported.map((file) => fileLabel(file.relativePath)).join(', ');
  const warnings = result.files.filter(
    (file) => file.status === 'missing' || file.status === 'empty' || file.status === 'error',
  );
  const warnText =
    warnings.length > 0
      ? ` (${warnings.length} skipped: ${warnings.map((w) => fileLabel(w.relativePath)).join(', ')})`
      : '';
  return `Imported ${imported.length} file(s): ${names}${warnText}`;
}
