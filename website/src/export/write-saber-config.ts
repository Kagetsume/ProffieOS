/**
 * Write generated config INI texts to saber storage (desktop SD folder).
 *
 * @module export/write-saber-config
 */
import type { SaberStorage } from '../platform/storage.js';

export type SaberConfigWriteSpec = {
  relativePath: string;
  label: string;
  content: string;
};

export type SaberConfigWriteResult = {
  relativePath: string;
  label: string;
  status: 'ok' | 'error';
  byteLength?: number;
  detail?: string;
};

/**
 * Writes each config file and optionally verifies read-back byte length.
 */
export async function writeSaberConfigFiles(
  storage: SaberStorage,
  specs: SaberConfigWriteSpec[],
): Promise<SaberConfigWriteResult[]> {
  const results: SaberConfigWriteResult[] = [];
  for (const spec of specs) {
    try {
      await storage.writeText(spec.relativePath, spec.content);
      const readBack = await storage.readText(spec.relativePath);
      if (readBack.length !== spec.content.length) {
        results.push({
          relativePath: spec.relativePath,
          label: spec.label,
          status: 'error',
          detail: 'read-back length mismatch',
        });
        continue;
      }
      results.push({
        relativePath: spec.relativePath,
        label: spec.label,
        status: 'ok',
        byteLength: spec.content.length,
      });
    } catch (error) {
      results.push({
        relativePath: spec.relativePath,
        label: spec.label,
        status: 'error',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}
