/**
 * Lit custom element tests for power pin editor — add/remove and cross-blade disables.
 */
import { describe, expect, it } from 'vitest';
import type { BladeDefinition } from '../../model/blades';
import { usedPresetsForPicker } from '../../model/power-pins';
import './po-pin-picker.js';
import './po-power-pin-editor.js';
import { PoPowerPinEditor } from './po-power-pin-editor.js';

async function updateComplete(el: HTMLElement & { updateComplete?: Promise<boolean> }): Promise<void> {
  await el.updateComplete;
}

describe('po-power-pin-editor', () => {
  it('add power pin appends an empty row', async () => {
    const editor = document.createElement('po-power-pin-editor') as PoPowerPinEditor;
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1', 'bladePowerPin2'];
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: editor.pins }];
    document.body.appendChild(editor);
    await updateComplete(editor);

    const addBtn = editor.querySelector('[data-action="add-pin"]') as HTMLElement;
    let changed: string[] | undefined;
    editor.addEventListener('pins-change', (event) => {
      changed = (event as CustomEvent<{ pins: string[] }>).detail.pins;
    });
    addBtn.click();
    await updateComplete(editor);

    expect(changed).toEqual(['bladePowerPin1', 'bladePowerPin2', '']);
    expect(editor.querySelectorAll('.power-pin-row')).toHaveLength(3);
    editor.remove();
  });

  it('disables pins assigned on other blades', async () => {
    const blades: BladeDefinition[] = [
      { index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: ['bladePowerPin1'] },
      { index: 1, type: 'ws2811', dataPin: 'blade2Pin', powerPins: [''] },
    ];

    const editor = document.createElement('po-power-pin-editor') as PoPowerPinEditor;
    editor.bladeIndex = 1;
    editor.pins = [''];
    editor.blades = blades;
    document.body.appendChild(editor);
    await updateComplete(editor);

    const picker = editor.querySelector('po-pin-picker')!;
    await updateComplete(picker as HTMLElement & { updateComplete?: Promise<boolean> });

    const used = usedPresetsForPicker(blades, 1, [''], 0);
    expect(used.has('bladePowerPin1')).toBe(true);

    const select = picker.querySelector('wa-select')!;
    const opt = (value: string) =>
      Array.from(select.querySelectorAll('wa-option')).find(
        (o) => (o as HTMLElement & { value: string }).value === value,
      ) as (HTMLElement & { disabled: boolean }) | undefined;

    expect(opt('bladePowerPin1')?.disabled).toBe(true);
    expect(opt('bladePowerPin2')?.disabled).toBe(false);
    editor.remove();
  });

  it('remove power pin keeps remaining selections', async () => {
    const editor = document.createElement('po-power-pin-editor') as PoPowerPinEditor;
    editor.bladeIndex = 0;
    editor.pins = ['bladePowerPin1', 'bladePowerPin2', ''];
    editor.blades = [{ index: 0, type: 'ws2811', dataPin: 'bladePin', powerPins: editor.pins }];
    document.body.appendChild(editor);
    await updateComplete(editor);

    let changed: string[] | undefined;
    editor.addEventListener('pins-change', (event) => {
      changed = (event as CustomEvent<{ pins: string[] }>).detail.pins;
    });

    const removeBtn = editor.querySelector(
      '[data-action="remove-pin"][data-pin-index="2"]',
    ) as HTMLElement;
    removeBtn.click();
    await updateComplete(editor);

    expect(changed).toEqual(['bladePowerPin1', 'bladePowerPin2']);
    editor.remove();
  });
});
