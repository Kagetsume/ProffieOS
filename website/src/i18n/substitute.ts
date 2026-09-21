/**
 * `${variable}` substitution for i18n strings.
 *
 * @module i18n/substitute
 */
import type { SubstitutionMap } from './types.js';
import { sanitizeI18nString } from './sanitize.js';

const VARIABLE_PATTERN = /\$\{([^}]+)\}/g;

/**
 * Replace `${name}` placeholders using `substitutions`.
 *
 * - Known keys are replaced with a sanitized string value.
 * - Unknown keys leave the original `${name}` token in place.
 */
export function applySubstitutions(
  template: string,
  substitutions?: SubstitutionMap,
): string {
  if (!substitutions) {
    return sanitizeI18nString(template);
  }

  const replaced = template.replace(VARIABLE_PATTERN, (token, rawName: string) => {
    const name = rawName.trim();
    if (!Object.prototype.hasOwnProperty.call(substitutions, name)) {
      return token;
    }
    const value = substitutions[name];
    if (value === undefined || value === null) {
      return token;
    }
    return sanitizeI18nString(String(value));
  });

  return sanitizeI18nString(replaced);
}
