/**
 * Shared i18n keys from {@link rootI18n} / `locales/en/common.json`.
 *
 * @module i18n/common-keys
 */
export const commonKeys = {
  actions: {
    add: 'actions.add',
    copy: 'actions.copy',
    copied: 'actions.copied',
    download: 'actions.download',
    duplicate: 'actions.duplicate',
    remove: 'actions.remove',
    reset: 'actions.reset',
    new: 'actions.new',
  },
  nav: {
    configFiles: 'nav.configFiles',
    output: 'nav.output',
    ariaLabel: 'nav.ariaLabel',
    stubSoon: 'nav.stubSoon',
    route: {
      home: 'nav.route.home',
      board: 'nav.route.board',
      features: 'nav.route.features',
      blades: 'nav.route.blades',
      styles: 'nav.route.styles',
      presets: 'nav.route.presets',
      export: 'nav.route.export',
    },
  },
  hint: {
    exportFooter: 'hint.exportFooter',
    exportAs: 'hint.exportAs',
  },
} as const;
