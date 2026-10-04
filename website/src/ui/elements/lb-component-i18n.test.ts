/**
 * Loads every component i18n client and keys module.
 *
 * Component tests (e.g. lb-blade-card) only import the components under test, so sibling
 * `lb-*.i18n.ts` / `lb-*.keys.ts` files stay out of coverage until imported explicitly.
 * This file mirrors `ui/elements/index.ts` i18n surface area for coverage and regression checks.
 */
import { describe, expect, it, afterEach } from 'vitest';
import type { I18nClient } from '../../i18n/client.js';
import { switchAppLocale } from '../../i18n/index.js';
import { appShellI18n } from './lb-app-shell.i18n.js';
import { appShellKeys } from './lb-app-shell.keys.js';
import { bladeCardI18n } from './lb-blade-card.i18n.js';
import { bladeCardKeys } from './lb-blade-card.keys.js';
import { bladePreviewI18n } from './lb-blade-preview.i18n.js';
import { bladePreviewKeys } from './lb-blade-preview.keys.js';
import { bmpInputI18n } from './lb-bmp-input.i18n.js';
import { bmpInputKeys } from './lb-bmp-input.keys.js';
import { boardPageI18n } from './lb-board-page.i18n.js';
import { boardPageKeys } from './lb-board-page.keys.js';
import { colorInputI18n } from './lb-color-input.i18n.js';
import { colorInputKeys } from './lb-color-input.keys.js';
import { configStubPageI18n } from './lb-config-stub-page.i18n.js';
import { configStubPageKeys } from './lb-config-stub-page.keys.js';
import { copyPanelI18n } from './lb-copy-panel.i18n.js';
import { copyPanelKeys } from './lb-copy-panel.keys.js';
import { exportPageI18n } from './lb-export-page.i18n.js';
import { exportPageKeys } from './lb-export-page.keys.js';
import { importPageI18n } from './lb-import-page.i18n.js';
import { importPageKeys } from './lb-import-page.keys.js';
import { featuresPageI18n } from './lb-features-page.i18n.js';
import { featuresPageKeys } from './lb-features-page.keys.js';
import { homePageI18n } from './lb-home-page.i18n.js';
import { homePageKeys } from './lb-home-page.keys.js';
import { pinPickerI18n } from './lb-pin-picker.i18n.js';
import { pinPickerKeys } from './lb-pin-picker.keys.js';
import { powerPinEditorI18n } from './lb-power-pin-editor.i18n.js';
import { powerPinEditorKeys } from './lb-power-pin-editor.keys.js';
import { presetStyleRowI18n } from './lb-preset-style-row.i18n.js';
import { presetStyleRowKeys } from './lb-preset-style-row.keys.js';
import { presetsPageI18n } from './lb-presets-page.i18n.js';
import { presetsPageKeys } from './lb-presets-page.keys.js';
import { sidebarNavI18n } from './lb-sidebar-nav.i18n.js';
import { sidebarNavKeys } from './lb-sidebar-nav.keys.js';
import { styleLayerStackI18n } from './lb-style-layer-stack.i18n.js';
import { styleLayerStackKeys } from './lb-style-layer-stack.keys.js';
import { stylesPageI18n } from './lb-styles-page.i18n.js';
import { stylesPageKeys } from './lb-styles-page.keys.js';
import { subBladeEditorI18n } from './lb-sub-blade-editor.i18n.js';
import { subBladeEditorKeys } from './lb-sub-blade-editor.keys.js';
import { wiringPageI18n } from './lb-wiring-page.i18n.js';
import { wiringPageKeys } from './lb-wiring-page.keys.js';

type ComponentI18nCase = {
  id: string;
  i18n: I18nClient;
  keys: Record<string, unknown>;
};

const COMPONENT_I18N: ComponentI18nCase[] = [
  { id: 'lb-app-shell', i18n: appShellI18n, keys: appShellKeys },
  { id: 'lb-blade-card', i18n: bladeCardI18n, keys: bladeCardKeys },
  { id: 'lb-blade-preview', i18n: bladePreviewI18n, keys: bladePreviewKeys },
  { id: 'lb-bmp-input', i18n: bmpInputI18n, keys: bmpInputKeys },
  { id: 'lb-board-page', i18n: boardPageI18n, keys: boardPageKeys },
  { id: 'lb-color-input', i18n: colorInputI18n, keys: colorInputKeys },
  { id: 'lb-config-stub-page', i18n: configStubPageI18n, keys: configStubPageKeys },
  { id: 'lb-copy-panel', i18n: copyPanelI18n, keys: copyPanelKeys },
  { id: 'lb-import-page', i18n: importPageI18n, keys: importPageKeys },
  { id: 'lb-export-page', i18n: exportPageI18n, keys: exportPageKeys },
  { id: 'lb-features-page', i18n: featuresPageI18n, keys: featuresPageKeys },
  { id: 'lb-home-page', i18n: homePageI18n, keys: homePageKeys },
  { id: 'lb-pin-picker', i18n: pinPickerI18n, keys: pinPickerKeys },
  { id: 'lb-power-pin-editor', i18n: powerPinEditorI18n, keys: powerPinEditorKeys },
  { id: 'lb-preset-style-row', i18n: presetStyleRowI18n, keys: presetStyleRowKeys },
  { id: 'lb-presets-page', i18n: presetsPageI18n, keys: presetsPageKeys },
  { id: 'lb-sidebar-nav', i18n: sidebarNavI18n, keys: sidebarNavKeys },
  { id: 'lb-style-layer-stack', i18n: styleLayerStackI18n, keys: styleLayerStackKeys },
  { id: 'lb-styles-page', i18n: stylesPageI18n, keys: stylesPageKeys },
  { id: 'lb-sub-blade-editor', i18n: subBladeEditorI18n, keys: subBladeEditorKeys },
  { id: 'lb-wiring-page', i18n: wiringPageI18n, keys: wiringPageKeys },
];

function firstMessageKey(keys: Record<string, unknown>): string {
  for (const value of Object.values(keys)) {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object') {
      return firstMessageKey(value as Record<string, unknown>);
    }
  }
  throw new Error('No string message key found');
}

describe('component i18n bundles', () => {
  afterEach(() => {
    switchAppLocale('en');
  });

  it.each(COMPONENT_I18N)('$id follows switchAppLocale for bundle lookup', ({ i18n, keys }) => {
    const messageKey = firstMessageKey(keys);
    switchAppLocale('en');
    const enText = i18n.translate(messageKey);
    switchAppLocale('fr');
    const frText = i18n.translate(messageKey);
    if (enText !== frText) {
      expect(frText).not.toBe(enText);
    }
    expect(frText.length).toBeGreaterThan(0);
    expect(frText).not.toBe(messageKey);
  });

  it.each(COMPONENT_I18N)('$id loads keys and resolves at least one message', ({ i18n, keys }) => {
    const messageKey = firstMessageKey(keys);
    const text = i18n.translate(messageKey);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toBe(messageKey);
  });
});
