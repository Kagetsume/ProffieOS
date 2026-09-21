/**
 * i18n keys for {@link PoFeaturesPage}.
 *
 * @module ui/elements/po-features-page.keys
 */
import { commonKeys } from '../../i18n/common-keys.js';

export const featuresPageKeys = {
  title: 'title',
  lead: 'lead',
  featureGestureLabel: 'feature.gesture.label',
  featureGestureDescription: 'feature.gesture.description',
  featureTwistOnLabel: 'feature.twistOn.label',
  featureTwistOnDescription: 'feature.twistOn.description',
  featureTwistOffLabel: 'feature.twistOff.label',
  featureTwistOffDescription: 'feature.twistOff.description',
  hintExportAs: commonKeys.hint.exportAs,
} as const;

export const featuresPageFieldKeys = {
  gesture: {
    label: featuresPageKeys.featureGestureLabel,
    description: featuresPageKeys.featureGestureDescription,
  },
  twistOn: {
    label: featuresPageKeys.featureTwistOnLabel,
    description: featuresPageKeys.featureTwistOnDescription,
  },
  twistOff: {
    label: featuresPageKeys.featureTwistOffLabel,
    description: featuresPageKeys.featureTwistOffDescription,
  },
} as const;
