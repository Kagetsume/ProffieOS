/// <reference types="vitest/config" />
/**
 * Vite build config + Vitest test runner settings.
 *
 * - `base: './'` — relative asset paths for static hosting / subpaths
 * - `test.environment: 'jsdom'` — DOM tests for power-pin editor wiring
 *
 * @see https://vite.dev/config/
 * @see https://vitest.dev/config/
 */
import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
});
