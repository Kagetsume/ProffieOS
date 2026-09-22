/**
 * Mount smoke tests for every registered `<po-*>` Lit element.
 *
 * Uses `data-testid` hooks — see `elements/README.md` ("Test IDs").
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { PresetStyle } from '../../model/preset-styles';
import type { StyleSection } from '../../model/style-sections';
import { getAllByTestId, getAllByTestIdPrefix, getByTestId, mount } from '../../test/lit-host-utils.js';

/** Import every element once — avoids per-test dynamic import races under parallel vitest. */
beforeAll(async () => {
  await Promise.all([
    import('./po-home-page.js'),
    import('./po-sidebar-nav.js'),
    import('./po-board-page.js'),
    import('./po-features-page.js'),
    import('./po-config-stub-page.js'),
    import('./po-copy-panel.js'),
    import('./po-export-page.js'),
    import('./po-pin-picker.js'),
    import('./po-blade-card.js'),
    import('./po-wiring-page.js'),
    import('./po-color-input.js'),
    import('./po-sub-blade-editor.js'),
    import('./po-blade-preview.js'),
    import('./po-style-layer-stack.js'),
    import('./po-styles-page.js'),
    import('./po-preset-style-row.js'),
    import('./po-presets-page.js'),
  ]);
});

describe.sequential('po-* components mount in jsdom', () => {
  it('po-home-page renders overview content', async () => {
    const { el, unmount } = await mount(document.createElement('po-home-page'));
    expect(getByTestId(el, 'home-page-title').textContent?.length).toBeGreaterThan(0);
    expect(getByTestId(el, 'home-page-config-table').querySelectorAll('tbody tr').length).toBe(5);
    unmount();
  });

  it('po-sidebar-nav renders route links', async () => {
    const { el, unmount } = await mount(document.createElement('po-sidebar-nav'));
    expect(getByTestId(el, 'sidebar-nav')).toBeTruthy();
    expect(getAllByTestIdPrefix(el, 'sidebar-nav-link-').length).toBeGreaterThan(0);
    unmount();
  });

  it('po-board-page renders board form', async () => {
    const { el, unmount } = await mount(document.createElement('po-board-page'));
    expect(getByTestId(el, 'board-page-button-count')).toBeTruthy();
    unmount();
  });

  it('po-features-page renders feature toggles', async () => {
    const { el, unmount } = await mount(document.createElement('po-features-page'));
    expect(getAllByTestId(el, 'features-switch-gesture').length).toBe(1);
    expect(getByTestId(el, 'features-switch-twistOn')).toBeTruthy();
    expect(getByTestId(el, 'features-switch-twistOff')).toBeTruthy();
    unmount();
  });

  it('po-config-stub-page shows title and SD path', async () => {
    const el = document.createElement('po-config-stub-page');
    el.setAttribute('title', 'Test section');
    el.setAttribute('sd-path', 'config/test.ini');
    el.description = 'Stub description';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'config-stub-page-title').textContent).toBe('Test section');
    expect(getByTestId(el, 'config-stub-page-sd-path').textContent).toBe('config/test.ini');
    unmount();
  });

  it('po-copy-panel renders content and copy button', async () => {
    const el = document.createElement('po-copy-panel') as HTMLElement & {
      title: string;
      filename: string;
      content: string;
    };
    el.title = 'blades.ini';
    el.filename = 'blades.ini';
    el.content = 'pixels = 144\n';
    const { unmount } = await mount(el);
    expect((getByTestId(el, 'copy-panel-content') as HTMLTextAreaElement).value).toContain('pixels');
    expect(getByTestId(el, 'copy-panel-copy-button')).toBeTruthy();
    unmount();
  });

  it('po-export-page renders copy panels for each INI file', async () => {
    const { el, unmount } = await mount(document.createElement('po-export-page'));
    expect(getAllByTestIdPrefix(el, 'export-panel-').length).toBe(5);
    unmount();
  });

  it('po-wiring-page renders blade cards from store', async () => {
    const { el, unmount } = await mount(document.createElement('po-wiring-page'));
    expect(getByTestId(el, 'wiring-page-blade-list').querySelectorAll('po-blade-card').length).toBeGreaterThan(
      0,
    );
    unmount();
  });

  it('po-pin-picker renders preset options in power mode', async () => {
    const el = document.createElement('po-pin-picker') as HTMLElement & {
      mode: string;
      value: string;
    };
    el.mode = 'power';
    el.value = 'bladePowerPin1';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'pin-picker-select')).toBeTruthy();
    expect(el.querySelectorAll('wa-option').length).toBeGreaterThan(0);
    unmount();
  });

  it('po-color-input renders grouped color options', async () => {
    const el = document.createElement('po-color-input') as HTMLElement & { value: string };
    el.value = 'red';
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'color-input-select')).toBeTruthy();
    expect(el.querySelectorAll('wa-option').length).toBeGreaterThan(0);
    unmount();
  });

  it('po-sub-blade-editor renders add control when no ranges', async () => {
    const el = document.createElement('po-sub-blade-editor') as HTMLElement & {
      subBlades: unknown[];
      pixels: number;
    };
    el.subBlades = [];
    el.pixels = 144;
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'sub-blade-editor-add')).toBeTruthy();
    unmount();
  });

  it('po-blade-preview renders canvas and preview controls', async () => {
    const { el, unmount } = await mount(document.createElement('po-blade-preview'));
    expect(getByTestId(el, 'blade-preview-canvas')).toBeTruthy();
    expect(getByTestId(el, 'blade-preview-clash')).toBeTruthy();
    unmount();
  });

  it('po-style-layer-stack renders layer controls', async () => {
    const { el, unmount } = await mount(document.createElement('po-style-layer-stack'));
    expect(getByTestId(el, 'style-layer-stack')).toBeTruthy();
    unmount();
  });

  it('po-styles-page renders layer stack and preview', async () => {
    const { el, unmount } = await mount(document.createElement('po-styles-page'));
    expect(getByTestId(el, 'styles-page-layer-stack')).toBeTruthy();
    expect(getByTestId(el, 'styles-page-blade-preview')).toBeTruthy();
    unmount();
  });

  it('po-preset-style-row renders style picker for a slot', async () => {
    const el = document.createElement('po-preset-style-row') as HTMLElement & {
      slotIndex: number;
      slotCount: number;
      presetStyle: PresetStyle;
      styleSections: StyleSection[];
    };
    el.slotIndex = 0;
    el.slotCount = 1;
    el.presetStyle = { kind: 'named', ref: 'standard', args: [], overrides: {}, customLine: '' };
    el.styleSections = [];
    const { unmount } = await mount(el);
    expect(getByTestId(el, 'preset-style-row-style-select')).toBeTruthy();
    unmount();
  });

  it('po-presets-page renders preset list', async () => {
    const { el, unmount } = await mount(document.createElement('po-presets-page'));
    expect(getByTestId(el, 'presets-page-preset-select')).toBeTruthy();
    unmount();
  });
});
