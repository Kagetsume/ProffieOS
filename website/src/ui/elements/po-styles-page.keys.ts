/**
 * i18n keys for {@link PoStylesPage}.
 *
 * @module ui/elements/po-styles-page.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const stylesPageKeys = {
  title: 'title',
  lead: 'lead',
  helpSummary: 'help.summary',
  helpRecipe: 'help.recipe',
  helpBaseLayer: 'help.baseLayer',
  helpOverlays: 'help.overlays',
  helpTextures: 'help.textures',
  helpVariables: 'help.variables',
  helpPreviewNotePrefix: 'help.previewNotePrefix',
  helpPreviewNoteLink: 'help.previewNoteLink',
  labelRecipe: 'label.recipe',
  pickerInFile: 'picker.inFile',
  pickerLibrary: 'picker.library',
  newRecipe: 'newRecipe',
  remove: commonKeys.actions.remove,
  recipeSummaryLayers: 'recipeSummary.layers',
  headingBaseBlade: 'heading.baseBlade',
  hintBaseBlade: 'hint.baseBlade',
  hintNoBaseVars: 'hint.noBaseVars',
  addBaseVar: 'addBaseVar',
  headingRecipeStack: 'heading.recipeStack',
  hintRecipeStack: 'hint.recipeStack',
  addLayer: 'addLayer',
  hintExport: 'hint.export',
  removeVarAria: 'removeVar.aria',
  removeVarTitle: 'removeVar.title',
} as const;
