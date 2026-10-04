/**
 * Human-readable status lines after writing config files to saber storage.
 *
 * @module export/format-saber-write-status
 */
import type { SaberConfigWriteResult } from './write-saber-config.js';

export type SaberWriteStatusMessages = {
  wroteAll: (params: { count: string; names: string }) => string;
  wroteFile: (params: { path: string; bytes: string }) => string;
  writeErrors: (params: { details: string }) => string;
};

/** Builds a one-line summary for UI status text. */
export function formatSaberWriteStatus(
  results: SaberConfigWriteResult[],
  messages: SaberWriteStatusMessages,
): string {
  const ok = results.filter((result) => result.status === 'ok');
  const failed = results.filter((result) => result.status === 'error');

  if (results.length === 1 && ok.length === 1) {
    const [single] = ok;
    return messages.wroteFile({
      path: single.relativePath,
      bytes: String(single.byteLength ?? 0),
    });
  }

  const parts: string[] = [];
  if (ok.length > 0) {
    parts.push(
      messages.wroteAll({
        count: String(ok.length),
        names: ok.map((result) => result.label).join(', '),
      }),
    );
  }
  if (failed.length > 0) {
    const details = failed
      .map((result) => `${result.label}: ${result.detail ?? 'failed'}`)
      .join('; ');
    parts.push(messages.writeErrors({ details }));
  }
  return parts.join(' — ') || messages.writeErrors({ details: 'No files written' });
}
