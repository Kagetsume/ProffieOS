/**
 * i18n keys for {@link PoHomePage}.
 *
 * @module ui/elements/po-home-page.keys
 */
export const homePageKeys = {
  title: 'title',
  lead: 'lead',
  requirement: 'requirement',
  cardWhatItDoesTitle: 'card.whatItDoes.title',
  cardWhatItDoesBody: 'card.whatItDoes.body',
  cardWhatItDoesHint: 'card.whatItDoes.hint',
  cardConfigFilesTitle: 'card.configFiles.title',
  tableFile: 'table.file',
  tablePurpose: 'table.purpose',
  tableInEditor: 'table.inEditor',
  configFileBoardPath: 'configFile.board.path',
  configFileBoardPurpose: 'configFile.board.purpose',
  configFileFeaturesPath: 'configFile.features.path',
  configFileFeaturesPurpose: 'configFile.features.purpose',
  configFileBladesPath: 'configFile.blades.path',
  configFileBladesPurpose: 'configFile.blades.purpose',
  configFileBladeStylesPath: 'configFile.bladeStyles.path',
  configFileBladeStylesPurpose: 'configFile.bladeStyles.purpose',
  configFilePresetsPath: 'configFile.presets.path',
  configFilePresetsPurpose: 'configFile.presets.purpose',
  statusReady: 'status.ready',
  statusPartial: 'status.partial',
  statusPlanned: 'status.planned',
  cardWorkflowTitle: 'card.workflow.title',
  workflowStep1: 'workflow.step1',
  workflowStep2: 'workflow.step2',
  workflowStep3: 'workflow.step3',
  workflowStep4: 'workflow.step4',
  workflowStep5: 'workflow.step5',
  actionStartBoard: 'action.startBoard',
  actionEditBlades: 'action.editBlades',
  actionExport: 'action.export',
} as const;

export const homePageConfigFilePathKeys = {
  board: homePageKeys.configFileBoardPath,
  features: homePageKeys.configFileFeaturesPath,
  blades: homePageKeys.configFileBladesPath,
  bladeStyles: homePageKeys.configFileBladeStylesPath,
  presets: homePageKeys.configFilePresetsPath,
} as const;

export const homePageConfigFilePurposeKeys = {
  board: homePageKeys.configFileBoardPurpose,
  features: homePageKeys.configFileFeaturesPurpose,
  blades: homePageKeys.configFileBladesPurpose,
  bladeStyles: homePageKeys.configFileBladeStylesPurpose,
  presets: homePageKeys.configFilePresetsPurpose,
} as const;

export const homePageStatusKeys = {
  ready: homePageKeys.statusReady,
  partial: homePageKeys.statusPartial,
  planned: homePageKeys.statusPlanned,
} as const;
