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
    setupFiles: ['src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/i18n/types.ts',
        'src/main.ts',
        'src/router.ts',
        'src/route-config.ts',
        'src/model/blades.ts',
        'src/ui/elements/index.ts',
        'src/ui/pages/**',
        'src/ui/elements/po-*-page.ts',
        'src/ui/elements/po-copy-panel.ts',
        'src/ui/elements/po-style-layer-stack.ts',
        'src/ui/elements/po-blade-preview.ts',
        'src/ui/elements/po-blade-card.ts',
        'src/ui/elements/po-pin-picker.ts',
        'src/ui/elements/po-sub-blade-editor.ts',
        'src/ui/elements/po-preset-style-row.ts',
        'src/ui/elements/po-config-stub-page.ts',
        'src/ui/elements/po-sidebar-nav.ts',
        'src/ui/elements/po-home-page.ts',
        'src/ui/elements/po-color-input.ts',
        'src/ui/elements/po-element.ts',
        'src/ui/elements/po-shared-styles.ts',
        'src/preview/hilt-asset.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
