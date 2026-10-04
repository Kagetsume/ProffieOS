import { describe, expect, it } from 'vitest';
import type { SaberStorage } from '../platform/storage.js';
import { writeSaberConfigFiles } from './write-saber-config.js';

class MockSaberStorage implements SaberStorage {
  readonly isDesktop = true;

  files: Record<string, string> = {};

  async getRoot(): Promise<string | null> {
    return 'C:/saber';
  }

  async setRoot(): Promise<void> {}

  async pickFolder(): Promise<string | null> {
    return null;
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

describe('writeSaberConfigFiles', () => {
  it('writes all specs and reports ok with byte lengths', async () => {
    const storage = new MockSaberStorage();
    const results = await writeSaberConfigFiles(storage, [
      { relativePath: 'config/blades.ini', label: 'blades.ini', content: 'a=1\n' },
      { relativePath: 'config/board.ini', label: 'board.ini', content: 'b=2\n' },
    ]);
    expect(results).toEqual([
      {
        relativePath: 'config/blades.ini',
        label: 'blades.ini',
        status: 'ok',
        byteLength: 4,
      },
      {
        relativePath: 'config/board.ini',
        label: 'board.ini',
        status: 'ok',
        byteLength: 4,
      },
    ]);
    expect(storage.files['config/blades.ini']).toBe('a=1\n');
  });

  it('reports error when read-back length differs', async () => {
    const storage = new MockSaberStorage();
    storage.readText = async () => 'short';
    const results = await writeSaberConfigFiles(storage, [
      { relativePath: 'config/features.ini', label: 'features.ini', content: 'longer\n' },
    ]);
    expect(results[0]?.status).toBe('error');
    expect(results[0]?.detail).toBe('read-back length mismatch');
  });
});
