/**
 * Sanitize resolved i18n strings before UI injection.
 *
 * @module i18n/sanitize
 */
import DOMPurify from 'dompurify';

/**
 * Strip hazardous markup from a resolved translation.
 *
 * Tags are removed; text content is kept. Safe for Lit text bindings and attributes.
 */
export function sanitizeI18nString(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], KEEP_CONTENT: true });
}
