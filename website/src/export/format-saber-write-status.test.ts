import { describe, expect, it } from 'vitest';
import { formatSaberWriteStatus } from './format-saber-write-status.js';

const messages = {
  wroteAll: ({ count, names }: { count: string; names: string }) =>
    `Wrote ${count} file(s): ${names}`,
  wroteFile: ({ path, bytes }: { path: string; bytes: string }) =>
    `Wrote ${path} (${bytes} bytes)`,
  writeErrors: ({ details }: { details: string }) => `Errors: ${details}`,
};

describe('formatSaberWriteStatus', () => {
  it('formats a single successful write', () => {
    const text = formatSaberWriteStatus(
      [
        {
          relativePath: 'config/blades.ini',
          label: 'blades.ini',
          status: 'ok',
          byteLength: 10,
        },
      ],
      messages,
    );
    expect(text).toBe('Wrote config/blades.ini (10 bytes)');
  });

  it('combines success and failure summaries', () => {
    const text = formatSaberWriteStatus(
      [
        {
          relativePath: 'config/blades.ini',
          label: 'blades.ini',
          status: 'ok',
          byteLength: 1,
        },
        {
          relativePath: 'config/board.ini',
          label: 'board.ini',
          status: 'error',
          detail: 'disk full',
        },
      ],
      messages,
    );
    expect(text).toBe('Wrote 1 file(s): blades.ini — Errors: board.ini: disk full');
  });
});
