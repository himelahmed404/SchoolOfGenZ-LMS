/** One hex drives every brand token. The design's chosen brand (v6 `brandColor`). */
export const BRAND = '#0F7A55';

type RGB = [number, number, number];

const hx = (h: string): RGB => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
};
const mix = (a: RGB, b: RGB, t: number): string =>
  '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');

/**
 * Derive brand tokens from one hex (ported from v6 `applyBrand`).
 * Hover/press = 14%/28% toward black (light) or white (dark). Soft = 88% toward the light paper
 * (#F3F5FA) or 82% toward the dark paper (#0C1020). Dark mode lifts the base 34% toward white;
 * the hero stays the raw hex in light and goes 10% darker in dark. on-brand flips on luminance > 0.55.
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
    '--brand-soft': mix(base, dark ? [12, 16, 32] : [243, 245, 250], dark ? 0.82 : 0.88),
    '--focus': b,
    '--hero': dark ? mix(hx(hex), [0, 0, 0], 0.1) : hex,
    '--on-brand': lum > 0.55 ? '#101413' : '#FFFFFF',
  };
}

export function applyBrand(el: HTMLElement, hex: string, dark: boolean) {
  const t = brandTokens(hex, dark);
  Object.keys(t).forEach((k) => el.style.setProperty(k, t[k]));
}
