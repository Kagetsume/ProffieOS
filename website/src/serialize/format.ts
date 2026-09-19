/**
 * Shared INI formatting helpers (comment banners, spacing).
 *
 * @module serialize/format
 */

/**
 * Proffie-style comment header block used at the top of generated INI files.
 *
 * @param title - First line after the banner (file purpose)
 * @param lines - Additional `#` comment lines
 */
export function iniHeader(title: string, lines: string[]): string {
  const bar = '# =============================================================================';
  const body = lines.map((line) => `# ${line}`).join('\n');
  return `${bar}\n# ${title}\n${bar}\n${body}\n`;
}

/** Empty line between blade blocks in `blades.ini`. */
export function blankLine(): string {
  return '';
}
