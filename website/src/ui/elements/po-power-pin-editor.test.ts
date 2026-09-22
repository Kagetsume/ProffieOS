/**
 * Lit custom element tests for power pin editor — add/remove and cross-blade disables.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../../model/blades';
import { usedPresetsForPicker } from '../../model/power-pins';
import { MAX_POWER_PINS } from '../../validation/limits';
import { getAllByTestId, getByTestId, mount } from '../../test/lit-host-utils.js';
import './po-pin-picker.js';
import './po-power-pin-editor.js';

describe('po-power-pin-editor', () => {
  it('add power pin appends an empty row', async () => {
    const editor = document.createElement('po-power-pin-editor') as HTMLElement & {
      bladeIndex: number;
      pins: string[];
      blades: BladeDefinition[];
    };
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1', 'bladePowerPin2'];
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: editor.pins }];
    const { unmount } = await mount(editor);

    let changed: string[] | undefined;
    editor.addEventListener('pins-change', (event) => {
      changed = (event as CustomEvent<{ pins: string[] }>).detail.pins;
    });
    getByTestId(editor, 'power-pin-editor-add').click();
    await editor.updateComplete;

    expect(changed).toEqual(['bladePowerPin1', 'bladePowerPin2', '']);
    expect(getAllByTestId(editor, 'power-pin-editor-row')).toHaveLength(3);
    unmount();
  });

  it('disables pins assigned on other blades', async () => {
    const blades: BladeDefinition[] = [
      { index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: ['bladePowerPin1'] },
      { index: 1, type: 'ws2811', dataPin: 'blade2Pin', powerPins: ['bladePowerPin2'] },
    ];
    const editor = document.createElement('po-power-pin-editor') as HTMLElement & {
      bladeIndex: number;
      pins: string[];
      blades: BladeDefinition[];
    };
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1'];
    editor.blades = blades;
    const { unmount } = await mount(editor);

    const picker = getByTestId(editor, 'power-pin-editor-picker');
    const used = usedPresetsForPicker(blades, 0, editor.pins, 0);
    expect(used.has('bladePowerPin2')).toBe(true);

    const select = getByTestId(picker, 'pin-picker-select');
    const pin2 = Array.from(select.querySelectorAll('wa-option')).find(
      (o) => (o as HTMLElement & { value: string }).value === 'bladePowerPin2',
    ) as (HTMLElement & { disabled: boolean }) | undefined;
    expect(pin2?.disabled).toBe(true);
    unmount();
  });

  it('remove power pin drops the row at the given index', async () => {
    const editor = document.createElement('po-power-pin-editor') as HTMLElement & {
      bladeIndex: number;
      pins: string[];
      blades: BladeDefinition[];
    };
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1', 'bladePowerPin2', 'bladePowerPin3'];
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: editor.pins }];
    const { unmount } = await mount(editor);

    let changed: string[] | undefined;
    editor.addEventListener('pins-change', (event) => {
      changed = (event as CustomEvent<{ pins: string[] }>).detail.pins;
    });

    const removeButtons = getAllByTestId(editor, 'power-pin-editor-remove');
    removeButtons[2]!.click();
    await editor.updateComplete;

    expect(changed).toEqual(['bladePowerPin1', 'bladePowerPin2']);
    expect(getAllByTestId(editor, 'power-pin-editor-row')).toHaveLength(2);
    unmount();
  });

  it('does not add beyond MAX_POWER_PINS', async () => {
    const pins = Array.from({ length: MAX_POWER_PINS }, (_, i) => `bladePowerPin${i + 1}`);
    const editor = document.createElement('po-power-pin-editor') as HTMLElement & {
      bladeIndex: number;
      pins: string[];
      blades: BladeDefinition[];
    };
    editor.bladeIndex = 0;
    editor.pins = pins;
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: pins }];
    const { unmount } = await mount(editor);

    getByTestId(editor, 'power-pin-editor-add').click();
    await editor.updateComplete;

    expect(getAllByTestId(editor, 'power-pin-editor-row')).toHaveLength(MAX_POWER_PINS);
    unmount();
  });

  it('does not remove the last remaining row', async () => {
    const editor = document.createElement('po-power-pin-editor') as HTMLElement & {
      bladeIndex: number;
      pins: string[];
      blades: BladeDefinition[];
    };
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1'];
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: editor.pins }];
    const { unmount } = await mount(editor);

    let changed: string[] | undefined;
    editor.addEventListener('pins-change', (event) => {
      changed = (event as CustomEvent<{ pins: string[] }>).detail.pins;
    });

    getByTestId(editor, 'power-pin-editor-remove').click();
    await editor.updateComplete;

    expect(changed).toBeUndefined();
    expect(getAllByTestId(editor, 'power-pin-editor-row')).toHaveLength(1);
    unmount();
  });
});
