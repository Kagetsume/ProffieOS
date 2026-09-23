/**
 * Loads every component i18n client and keys module.
 *
 * Component tests (e.g. po-blade-card) only import the components under test, so sibling
 * `po-*.i18n.ts` / `po-*.keys.ts` files stay out of coverage until imported explicitly.
 * This file mirrors `ui/elements/index.ts` i18n surface area for coverage and regression checks.
 */
import { describe, expect, it } from 'vitest';
import type { I18nClient } from '../../i18n/client.js';
import { appShellI18n } from './po-app-shell.i18n.js';
import { appShellKeys } from './po-app-shell.keys.js';
import { bladeCardI18n } from './po-blade-card.i18n.js';
import { bladeCardKeys } from './po-blade-card.keys.js';
import { bladePreviewI18n } from './po-blade-preview.i18n.js';
import { bladePreviewKeys } from './po-blade-preview.keys.js';
import { boardPageI18n } from './po-board-page.i18n.js';
import { boardPageKeys } from './po-board-page.keys.js';
import { colorInputI18n } from './po-color-input.i18n.js';
import { colorInputKeys } from './po-color-input.keys.js';
import { configStubPageI18n } from './po-config-stub-page.i18n.js';
import { configStubPageKeys } from './po-config-stub-page.keys.js';
import { copyPanelI18n } from './po-copy-panel.i18n.js';
import { copyPanelKeys } from './po-copy-panel.keys.js';
import { exportPageI18n } from './po-export-page.i18n.js';
import { exportPageKeys } from './po-export-page.keys.js';
import { featuresPageI18n } from './po-features-page.i18n.js';
import { featuresPageKeys } from './po-features-page.keys.js';
import { homePageI18n } from './po-home-page.i18n.js';
import { homePageKeys } from './po-home-page.keys.js';
import { pinPickerI18n } from './po-pin-picker.i18n.js';
import { pinPickerKeys } from './po-pin-picker.keys.js';
import { powerPinEditorI18n } from './po-power-pin-editor.i18n.js';
import { powerPinEditorKeys } from './po-power-pin-editor.keys.js';
import { presetStyleRowI18n } from './po-preset-style-row.i18n.js';
import { presetStyleRowKeys } from './po-preset-style-row.keys.js';
import { presetsPageI18n } from './po-presets-page.i18n.js';
import { presetsPageKeys } from './po-presets-page.keys.js';
import { sidebarNavI18n } from './po-sidebar-nav.i18n.js';
import { sidebarNavKeys } from './po-sidebar-nav.keys.js';
import { styleLayerStackI18n } from './po-style-layer-stack.i18n.js';
import { styleLayerStackKeys } from './po-style-layer-stack.keys.js';
import { stylesPageI18n } from './po-styles-page.i18n.js';
import { stylesPageKeys } from './po-styles-page.keys.js';
import { subBladeEditorI18n } from './po-sub-blade-editor.i18n.js';
import { subBladeEditorKeys } from './po-sub-blade-editor.keys.js';
import { wiringPageI18n } from './po-wiring-page.i18n.js';
import { wiringPageKeys } from './po-wiring-page.keys.js';

type ComponentI18nCase = {
  id: string;
  i18n: I18nClient;
  keys: Record<string, unknown>;
};

const COMPONENT_I18N: ComponentI18nCase[] = [
  { id: 'po-app-shell', i18n: appShellI18n, keys: appShellKeys },
  { id: 'po-blade-card', i18n: bladeCardI18n, keys: bladeCardKeys },
  { id: 'po-blade-preview', i18n: bladePreviewI18n, keys: bladePreviewKeys },
  { id: 'po-board-page', i18n: boardPageI18n, keys: boardPageKeys },
  { id: 'po-color-input', i18n: colorInputI18n, keys: colorInputKeys },
  { id: 'po-config-stub-page', i18n: configStubPageI18n, keys: configStubPageKeys },
  { id: 'po-copy-panel', i18n: copyPanelI18n, keys: copyPanelKeys },
  { id: 'po-export-page', i18n: exportPageI18n, keys: exportPageKeys },
  { id: 'po-features-page', i18n: featuresPageI18n, keys: featuresPageKeys },
  { id: 'po-home-page', i18n: homePageI18n, keys: homePageKeys },
  { id: 'po-pin-picker', i18n: pinPickerI18n, keys: pinPickerKeys },
  { id: 'po-power-pin-editor', i18n: powerPinEditorI18n, keys: powerPinEditorKeys },
  { id: 'po-preset-style-row', i18n: presetStyleRowI18n, keys: presetStyleRowKeys },
  { id: 'po-presets-page', i18n: presetsPageI18n, keys: presetsPageKeys },
  { id: 'po-sidebar-nav', i18n: sidebarNavI18n, keys: sidebarNavKeys },
  { id: 'po-style-layer-stack', i18n: styleLayerStackI18n, keys: styleLayerStackKeys },
  { id: 'po-styles-page', i18n: stylesPageI18n, keys: stylesPageKeys },
  { id: 'po-sub-blade-editor', i18n: subBladeEditorI18n, keys: subBladeEditorKeys },
  { id: 'po-wiring-page', i18n: wiringPageI18n, keys: wiringPageKeys },
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
  it.each(COMPONENT_I18N)('$id loads keys and resolves at least one message', ({ i18n, keys }) => {
    const messageKey = firstMessageKey(keys);
    const text = i18n.translate(messageKey);
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toBe(messageKey);
  });
});
