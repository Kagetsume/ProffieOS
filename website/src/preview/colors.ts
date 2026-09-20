/**
 * Parse Proffie color names to RGB for approximate preview.
 *
 * @module preview/colors
 */
export { parseColorRgb as parseColor } from '../model/colors';

/** Linear interpolate between two RGB triples. */
export function lerpRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}
