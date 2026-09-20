/**
 * Blade style sections store (Effector) — `config/blade_styles.ini`.
 *
 * @module stores/styleSections
 */
import { createEvent, createStore } from 'effector';
import { defaultArgsForStyle, getNamedStyle } from '../model/style-catalog';
import {
  getConfigStyle,
  instantiateConfigStyle,
  uniqueConfigStyleId,
} from '../model/config-styles';
import {
  createDefaultLayer,
  createDefaultStyleSections,
  createLayerId,
  type LayerBlend,
  type StyleLayer,
  type StyleSection,
} from '../model/style-sections';

export type StyleSectionsState = {
  sections: StyleSection[];
  activeSectionId: string;
};

const defaults = createDefaultStyleSections();

export const activeSectionChanged = createEvent<string>();
export const styleSectionAdded = createEvent<void>();
export const styleSectionRemoved = createEvent<string>();
export const sectionVarChanged = createEvent<{ sectionId: string; key: string; value: string }>();
export const sectionVarAdded = createEvent<{ sectionId: string; key: string; value?: string }>();
export const sectionVarRemoved = createEvent<{ sectionId: string; key: string }>();
export const styleLayerAdded = createEvent<{ sectionId: string }>();
export const styleLayerRemoved = createEvent<{ sectionId: string; layerId: string }>();
export const styleLayerUpdated = createEvent<{
  sectionId: string;
  layerId: string;
  patch: Partial<StyleLayer>;
}>();
export const styleLayerMoved = createEvent<{
  sectionId: string;
  layerId: string;
  direction: 'up' | 'down';
}>();
/** Add a bundled config file style (e.g. smoke_blade) as a new `[section]`. */
export const configStyleAdded = createEvent<string>();

function findSection(sections: StyleSection[], id: string): StyleSection | undefined {
  return sections.find((section) => section.id === id);
}

function updateSection(
  sections: StyleSection[],
  sectionId: string,
  fn: (section: StyleSection) => StyleSection,
): StyleSection[] {
  return sections.map((section) => (section.id === sectionId ? fn(section) : section));
}

function nextSectionId(sections: StyleSection[]): string {
  let index = sections.length + 1;
  let candidate = `section_${index}`;
  const ids = new Set(sections.map((section) => section.id));
  while (ids.has(candidate)) {
    index += 1;
    candidate = `section_${index}`;
  }
  return candidate;
}

export const $styleSections = createStore<StyleSectionsState>({
  sections: defaults,
  activeSectionId: defaults[0]!.id,
})
  .on(activeSectionChanged, (state, id) => {
    if (!findSection(state.sections, id)) {
      return state;
    }
    return { ...state, activeSectionId: id };
  })
  .on(styleSectionAdded, (state) => {
    const id = nextSectionId(state.sections);
    const section: StyleSection = {
      id,
      vars: {},
      layers: [createDefaultLayer()],
    };
    return {
      sections: [...state.sections, section],
      activeSectionId: id,
    };
  })
  .on(styleSectionRemoved, (state, sectionId) => {
    if (state.sections.length <= 1) {
      return state;
    }
    const sections = state.sections.filter((section) => section.id !== sectionId);
    const activeSectionId =
      state.activeSectionId === sectionId ? sections[0]!.id : state.activeSectionId;
    return { sections, activeSectionId };
  })
  .on(sectionVarChanged, (state, { sectionId, key, value }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => ({
      ...section,
      vars: { ...section.vars, [key]: value },
    })),
  }))
  .on(sectionVarAdded, (state, { sectionId, key, value = '' }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => ({
      ...section,
      vars: { ...section.vars, [key]: value },
    })),
  }))
  .on(sectionVarRemoved, (state, { sectionId, key }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => {
      const vars = { ...section.vars };
      delete vars[key];
      return { ...section, vars };
    }),
  }))
  .on(styleLayerAdded, (state, { sectionId }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => ({
      ...section,
      layers: [...section.layers, createDefaultLayer()],
    })),
  }))
  .on(styleLayerRemoved, (state, { sectionId, layerId }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => {
      if (section.layers.length <= 1) {
        return section;
      }
      return {
        ...section,
        layers: section.layers.filter((layer) => layer.id !== layerId),
      };
    }),
  }))
  .on(styleLayerUpdated, (state, { sectionId, layerId, patch }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => ({
      ...section,
      layers: section.layers.map((layer) => {
        if (layer.id !== layerId) {
          return layer;
        }
        const next = { ...layer, ...patch };
        if (patch.styleName && patch.styleName !== layer.styleName) {
          next.args = defaultArgsForStyle(patch.styleName);
          next.configSection = patch.styleName === 'config' ? '' : undefined;
        }
        return next;
      }),
    })),
  }))
  .on(styleLayerMoved, (state, { sectionId, layerId, direction }) => ({
    ...state,
    sections: updateSection(state.sections, sectionId, (section) => {
      const index = section.layers.findIndex((layer) => layer.id === layerId);
      if (index < 0) {
        return section;
      }
      const target = direction === 'up' ? index + 1 : index - 1;
      if (target < 0 || target >= section.layers.length) {
        return section;
      }
      const layers = [...section.layers];
      const [row] = layers.splice(index, 1);
      layers.splice(target, 0, row!);
      return { ...section, layers };
    }),
  }))
  .on(configStyleAdded, (state, styleId) => {
    const style = getConfigStyle(styleId);
    if (!style) {
      return state;
    }
    const id = uniqueConfigStyleId(state.sections, style.id);
    const section = instantiateConfigStyle(style, id);
    return {
      sections: [...state.sections, section],
      activeSectionId: id,
    };
  });

/** Active section object (convenience for UI). */
export function getActiveSection(state: StyleSectionsState): StyleSection | undefined {
  return findSection(state.sections, state.activeSectionId);
}

/** Apply blend + opacity defaults when picking an overlay or texture style. */
export function suggestedBlendForStyle(styleName: string): {
  blend: LayerBlend;
  opacity: number;
} {
  const def = getNamedStyle(styleName);
  if (def?.overlay) {
    return { blend: 'add', opacity: 16000 };
  }
  if (def?.group === 'texture') {
    return { blend: 'multiply', opacity: 20000 };
  }
  return { blend: 'normal', opacity: 32768 };
}

export { createLayerId };
