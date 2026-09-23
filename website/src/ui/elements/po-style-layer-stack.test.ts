/**
 * Style layer stack — ordered layer list with expand, reorder, remove.
 */
import { describe, expect, it } from 'vitest';
import { getByTestId, mount } from '../../test/lit-host-utils.js';
import { $styleSections, activeLayerChanged, activeSectionChanged } from '../../stores/styleSections.js';
import './po-color-input.js';
import './po-style-layer-stack.js';

describe('po-style-layer-stack', () => {
  it('renders layer controls', async () => {
    const { el, unmount } = await mount(document.createElement('po-style-layer-stack'));
    expect(getByTestId(el, 'style-layer-stack')).toBeTruthy();
    unmount();
  });

  it('shows roll speed beside the other smoke flow fields', async () => {
    const previous = $styleSections.getState();
    const section = previous.sections.find((row) =>
      row.layers.some((layer) => layer.styleName === 'smoke_flow'),
    );
    expect(section).toBeTruthy();
    const smoke = section!.layers.find((layer) => layer.styleName === 'smoke_flow')!;
    activeSectionChanged(section!.id);
    activeLayerChanged(smoke.id);
    const { el, unmount } = await mount(document.createElement('po-style-layer-stack'));
    const speed = getByTestId(el, 'style-layer-arg-speed');
    const extend = getByTestId(el, 'style-layer-arg-extend');
    expect(speed.textContent).toContain('Roll speed');
    expect(extend.textContent).toContain('Extend ms');
    expect(speed.querySelector('wa-input')).toBeTruthy();
    unmount();
    activeSectionChanged(previous.activeSectionId);
    activeLayerChanged(previous.activeLayerId);
  });
});
