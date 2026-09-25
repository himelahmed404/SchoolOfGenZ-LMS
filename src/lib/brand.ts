/** One hex drives every brand token. The design's default brand. */
export const BRAND = '#B0561F';

type RGB = [number, number, number];

const hx = (h: string): RGB => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
};
const mix = (a: RGB, b: RGB, t: number): string =>
  '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');

/**
 * Derive brand tokens from one hex.
 * Hover/press = 14%/28% toward black (light) or white (dark); soft = 88% (light) / 84% (dark) toward paper;
 * dark mode lifts the base 34% toward white; on-brand flips on luminance > 0.55.
 */
export function brandTokens(hex: string, dark: boolean): Record<string, string> {
  const base = dark ? hx(mix(hx(hex), [255, 255, 255], 0.34)) : hx(hex);
  const toward: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  const lum = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) / 255;
  const b = mix(base, base, 0);
  return {
    '--brand': b,
    '--brand-hover': mix(base, toward, 0.14),
    '--brand-press': mix(base, toward, 0.28),
    '--brand-soft': mix(base, dark ? [16, 20, 19] : [245, 246, 244], dark ? 0.84 : 0.88),
    '--focus': b,
    '--on-brand': lum > 0.55 ? '#101413' : '#FFFFFF',
  };
}

export function applyBrand(el: HTMLElement, hex: string, dark: boolean) {
  const t = brandTokens(hex, dark);
  Object.keys(t).forEach((k) => el.style.setProperty(k, t[k]));
}
