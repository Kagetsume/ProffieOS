import { describe, expect, it, beforeEach } from 'vitest';
import { getConfigStyle } from '../model/config-styles';
import {
  $styleSections,
  activeLayerChanged,
  activeSectionChanged,
  configStyleAdded,
  getActiveSection,
  sectionVarAdded,
  sectionVarChanged,
  sectionVarRemoved,
  styleLayerAdded,
  styleLayerMoved,
  styleLayerRemoved,
  styleLayerUpdated,
  styleSectionAdded,
  styleSectionRemoved,
  suggestedBlendForStyle,
} from './styleSections';

describe('styleSections store', () => {
  beforeEach(() => {
    while ($styleSections.getState().sections.length > 1) {
      styleSectionRemoved($styleSections.getState().sections.at(-1)!.id);
    }
  });

  it('adds and activates new sections', () => {
    styleSectionAdded();
    const state = $styleSections.getState();
    expect(state.sections.length).toBeGreaterThan(1);
    expect(getActiveSection(state)?.id).toBe(state.activeSectionId);
  });

  it('edits section variables', () => {
    const section = getActiveSection($styleSections.getState())!;
    sectionVarAdded({ sectionId: section.id, key: 'foo', value: 'bar' });
    sectionVarChanged({ sectionId: section.id, key: 'foo', value: 'baz' });
    expect(getActiveSection($styleSections.getState())?.vars.foo).toBe('baz');
    sectionVarRemoved({ sectionId: section.id, key: 'foo' });
    expect(getActiveSection($styleSections.getState())?.vars.foo).toBeUndefined();
  });

  it('manages layers in a section', () => {
    const section = getActiveSection($styleSections.getState())!;
    const firstLayer = section.layers[0]!;
    styleLayerAdded({ sectionId: section.id });
    styleLayerUpdated({
      sectionId: section.id,
      layerId: firstLayer.id,
      patch: { styleName: 'fire' },
    });
    const updated = getActiveSection($styleSections.getState())!;
    expect(updated.layers.length).toBeGreaterThan(1);
    expect(updated.layers[0]?.styleName).toBe('fire');
    expect(updated.layers[0]?.args.length).toBeGreaterThan(0);

    styleLayerMoved({ sectionId: section.id, layerId: firstLayer.id, direction: 'down' });
    styleLayerRemoved({ sectionId: section.id, layerId: updated.layers.at(-1)!.id });
  });

  it('imports bundled config styles', () => {
    const style = getConfigStyle('water_blade');
    expect(style).toBeDefined();
    configStyleAdded('water_blade');
    expect(
      $styleSections.getState().sections.some((section) => section.id.includes('water_blade')),
    ).toBe(true);
  });

  it('suggests blend defaults for overlay and texture styles', () => {
    expect(suggestedBlendForStyle('blast').blend).toBe('add');
    expect(suggestedBlendForStyle('fire_mask').blend).toBe('multiply');
    expect(suggestedBlendForStyle('base_flicker').blend).toBe('multiply');
    expect(suggestedBlendForStyle('pulse_layer').blend).toBe('multiply');
    expect(suggestedBlendForStyle('swing_layer').blend).toBe('multiply');
    expect(suggestedBlendForStyle('per_led_flicker').blend).toBe('multiply');
    expect(suggestedBlendForStyle('audio_layer').blend).toBe('multiply');
    expect(suggestedBlendForStyle('gradient_layer').blend).toBe('normal');
    expect(suggestedBlendForStyle('gradient_layer').opacity).toBe(16384);
    expect(suggestedBlendForStyle('solid').blend).toBe('normal');
  });

  it('tracks expanded layer selection', () => {
    const section = getActiveSection($styleSections.getState())!;
    const layerId = section.layers[0]!.id;
    activeLayerChanged(layerId);
    expect($styleSections.getState().activeLayerId).toBe(layerId);
    activeLayerChanged('');
    expect($styleSections.getState().activeLayerId).toBe('');
    activeLayerChanged('missing-layer');
    expect($styleSections.getState().activeLayerId).toBe('');
  });

  it('resets active layer when switching sections', () => {
    styleSectionAdded();
    const state = $styleSections.getState();
    const firstSection = state.sections[0]!;
    activeLayerChanged(firstSection.layers[0]!.id);
    activeSectionChanged(state.sections[1]!.id);
    expect($styleSections.getState().activeLayerId).toBe(
      state.sections[1]!.layers.at(-1)!.id,
    );
  });

  it('clears active layer when the expanded layer is removed', () => {
    const section = getActiveSection($styleSections.getState())!;
    styleLayerAdded({ sectionId: section.id });
    const expanded = getActiveSection($styleSections.getState())!.layers.at(-1)!;
    activeLayerChanged(expanded.id);
    styleLayerRemoved({ sectionId: section.id, layerId: expanded.id });
    expect($styleSections.getState().activeLayerId).toBe(
      getActiveSection($styleSections.getState())!.layers.at(-1)!.id,
    );
  });

  it('ignores invalid active section changes', () => {
    const before = $styleSections.getState().activeSectionId;
    activeSectionChanged('missing-section');
    expect($styleSections.getState().activeSectionId).toBe(before);
  });

  it('ignores layer moves and removals at stack bounds', () => {
    styleSectionAdded();
    const section = getActiveSection($styleSections.getState())!;
    const onlyLayer = section.layers[0]!;
    styleLayerAdded({ sectionId: section.id });
    const updated = getActiveSection($styleSections.getState())!;
    styleLayerMoved({ sectionId: section.id, layerId: onlyLayer.id, direction: 'up' });
    styleLayerMoved({ sectionId: section.id, layerId: onlyLayer.id, direction: 'down' });
    styleLayerMoved({ sectionId: updated.layers.at(-1)!.id, layerId: updated.layers.at(-1)!.id, direction: 'up' });
    styleLayerRemoved({ sectionId: section.id, layerId: onlyLayer.id });
    expect(getActiveSection($styleSections.getState())?.layers).toHaveLength(1);
    const beforeCount = $styleSections.getState().sections.length;
    configStyleAdded('not_a_real_style');
    expect($styleSections.getState().sections).toHaveLength(beforeCount);
  });
});
