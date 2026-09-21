/**
 * Helpers for reading Web Awesome form control values from DOM events.
 *
 * @module ui/wa-form-utils
 */

/** Read the committed `value` from a `wa-select` change/wa-change event. */
export function readWaSelectValue(event: Event): string {
  const control = event.currentTarget as HTMLElement & { value?: string };
  if (typeof control.value === 'string') {
    return control.value;
  }
  return (event.target as HTMLSelectElement).value ?? '';
}
