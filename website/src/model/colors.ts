/**
 * ProffieOS color names and parsing.
 *
 * - **firmware** — `ParseColorName` in `styles/rgb_arg.h` (work as INI/preset names)
 * - **extended** — Fett263 saber color-menu palette (`ColorNumber` in `sound_library.h`)
 * - **vivid** — ProffieOS 8.x palette in `styles/colors.h`
 *
 * Non-firmware catalog names are kept in the editor but exported as `r,g,b`.
 *
 * @module model/colors
 */
import catalog from '../catalog/colors.json';

export type NamedColor = {
  name: string;
  r: number;
  g: number;
  b: number;
};

export type ColorGroupId = 'firmware' | 'extended' | 'vivid';

export type ColorGroup = {
  id: ColorGroupId;
  label: string;
  colors: NamedColor[];
};

const FIRMWARE_COLORS: NamedColor[] = catalog.firmware;
const EXTENDED_COLORS: NamedColor[] = catalog.extended;
const VIVID_COLORS: NamedColor[] = catalog.vivid;

const firmwareByName = new Map(FIRMWARE_COLORS.map((color) => [color.name, color]));
const allByName = new Map(
  [...FIRMWARE_COLORS, ...EXTENDED_COLORS, ...VIVID_COLORS].map((color) => [color.name, color]),
);

/** Squared Euclidean distance in RGB space (8-bit channels). */
export function rgbDistanceSquared(a: NamedColor, b: NamedColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Order colors so each entry is the closest remaining match in RGB space.
 * Starts from the darkest swatch for a stable, spectrum-like walk.
 */
export function sortColorsByRgbCloseness(colors: readonly NamedColor[]): NamedColor[] {
  if (colors.length <= 1) {
    return [...colors];
  }

  const remaining = [...colors];
  remaining.sort(
    (a, b) => a.r + a.g + a.b - (b.r + b.g + b.b) || a.name.localeCompare(b.name),
  );

  const sorted: NamedColor[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const last = sorted[sorted.length - 1]!;
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]!;
      const distance = rgbDistanceSquared(last, candidate);
      if (
        distance < bestDistance ||
        (distance === bestDistance && candidate.name.localeCompare(remaining[bestIndex]!.name) < 0)
      ) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    sorted.push(remaining.splice(bestIndex, 1)[0]!);
  }

  return sorted;
}

/** @deprecated Use {@link listColorGroups} or {@link listAllNamedColors}. */
export const NAMED_COLORS: NamedColor[] = FIRMWARE_COLORS;

/** Dropdown groups for the color picker (each group sorted by RGB closeness). */
export function listColorGroups(): ColorGroup[] {
  return [
    { id: 'firmware', label: 'Standard', colors: sortColorsByRgbCloseness(FIRMWARE_COLORS) },
    { id: 'extended', label: 'Extended (saber menu)', colors: sortColorsByRgbCloseness(EXTENDED_COLORS) },
    { id: 'vivid', label: 'Vivid (OS 8)', colors: sortColorsByRgbCloseness(VIVID_COLORS) },
  ];
}

/** Flat list of every catalog color (group order, RGB-sorted within each group). */
export function listAllNamedColors(): NamedColor[] {
  return listColorGroups().flatMap((group) => group.colors);
}

/** @deprecated Use {@link listAllNamedColors}. */
export function listNamedColors(): NamedColor[] {
  return listAllNamedColors();
}

/** True when `value` matches any catalog color name (case-insensitive). */
export function isNamedColor(value: string): boolean {
  return allByName.has(value.trim().toLowerCase());
}

/** True when `value` is a firmware-parseable color name. */
export function isFirmwareColor(value: string): boolean {
  return firmwareByName.has(value.trim().toLowerCase());
}

/** Canonical firmware color name when recognized. */
export function canonicalFirmwareColorName(value: string): string | undefined {
  const key = value.trim().toLowerCase();
  return firmwareByName.has(key) ? key : undefined;
}

/** @deprecated Use {@link canonicalColorName} with {@link isFirmwareColor}. */
export function canonicalExtendedColorName(value: string): string | undefined {
  const key = canonicalColorName(value);
  return key && !isFirmwareColor(key) ? key : undefined;
}

/** Canonical lowercase name from any catalog group. */
export function canonicalColorName(value: string): string | undefined {
  const key = value.trim().toLowerCase();
  return allByName.has(key) ? key : undefined;
}

/** Parse `#rrggbb` or `rrggbb` to 8-bit RGB. */
export function parseHexColor(value: string): [number, number, number] | undefined {
  const raw = value.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) {
    return undefined;
  }
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return [r, g, b];
}

/** Parse `r,g,b` (8- or 16-bit channels) for firmware-style args. */
export function parseRgbTriplet(value: string): [number, number, number] | undefined {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 3) {
    return undefined;
  }
  const nums = parts.map((part) => Number(part));
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) {
    return undefined;
  }
  return [nums[0]!, nums[1]!, nums[2]!];
}

/** Parse a color token (name, `#rrggbb`, or `r,g,b`) to 8-bit RGB for preview. */
export function parseColorRgb(value: string): [number, number, number] {
  const key = value.trim().toLowerCase();
  const named = allByName.get(key);
  if (named) {
    return [named.r, named.g, named.b];
  }
  const hex = parseHexColor(key);
  if (hex) {
    return hex;
  }
  const rgb = parseRgbTriplet(value);
  if (rgb) {
    return rgb.map((channel) => (channel > 255 ? Math.round(channel / 257) : channel)) as [
      number,
      number,
      number,
    ];
  }
  return [128, 180, 255];
}

/** CSS `rgb()` string for swatches. */
export function colorToCss(value: string): string {
  const [r, g, b] = parseColorRgb(value);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Normalize a user-entered color for editor storage.
 * Catalog names stay as names; hex becomes `r,g,b`; rgb triplets are compacted.
 */
export function normalizeColorValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  const named = canonicalColorName(trimmed);
  if (named) {
    return named;
  }
  const hex = parseHexColor(trimmed);
  if (hex) {
    return hex.join(',');
  }
  const rgb = parseRgbTriplet(trimmed);
  if (rgb) {
    return rgb.join(',');
  }
  return trimmed;
}

/**
 * Token written to `blade_styles.ini` / preset overrides.
 * Firmware names stay as names; other catalog names become `r,g,b`.
 */
export function exportColorToken(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  const firmware = canonicalFirmwareColorName(trimmed);
  if (firmware) {
    return firmware;
  }
  const named = canonicalColorName(trimmed);
  if (named) {
    const color = allByName.get(named)!;
    return `${color.r},${color.g},${color.b}`;
  }
  return normalizeColorValue(trimmed);
}

export const CUSTOM_COLOR_VALUE = '__custom__';

/** Value for the color `<select>`: a catalog name or {@link CUSTOM_COLOR_VALUE}. */
export function selectValueForColor(value: string): string {
  return canonicalColorName(value) ?? CUSTOM_COLOR_VALUE;
}
