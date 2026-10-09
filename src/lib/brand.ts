/** One hex drives every brand token. The design's chosen brand (v6 `brandColor`). */
export const BRAND = '#0F7A55';

type RGB = [number, number, number];

const hx = (h: string): RGB => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB;
};
const mix = (a: RGB, b: RGB, t: number): string =>
  '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const lum = (h: string) => {
    const [r, g, bl] = hx(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/** Small text needs 4.5:1; the target leaves room for rounding. */
const TEXT_CONTRAST = 4.6;

/**
 * Derive brand tokens from one hex (ported from v6 `applyBrand`).
 * Hover/press = 14%/28% toward black (light) or white (dark). Soft = 88% toward the light paper
 * (#F3F5FA) or 82% toward the dark paper (#0C1020). Dark mode lifts the base 34% toward white;
 * the hero stays the raw hex in light and goes 10% darker in dark. on-brand flips on luminance > 0.55.
 * on-brand-soft is the brand moved away from the soft fill, only as far as text on that fill needs.
 */
export function brandTokens(hex: string, dark: boolean): Record<string, string> {
  const base = dark ? hx(mix(hx(hex), [255, 255, 255], 0.34)) : hx(hex);
  const toward: RGB = dark ? [255, 255, 255] : [0, 0, 0];
  const lum = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) / 255;
  const b = mix(base, base, 0);
  const soft = mix(base, dark ? [12, 16, 32] : [243, 245, 250], dark ? 0.82 : 0.88);
  let onSoft = b;
  for (let t = 0.01; contrast(onSoft, soft) < TEXT_CONTRAST && t <= 0.6; t += 0.01) onSoft = mix(base, toward, t);
  return {
    '--brand': b,
    '--brand-hover': mix(base, toward, 0.14),
    '--brand-press': mix(base, toward, 0.28),
    '--brand-soft': soft,
    '--on-brand-soft': onSoft,
    '--focus': b,
    '--hero': dark ? mix(hx(hex), [0, 0, 0], 0.1) : hex,
    '--on-brand': lum > 0.55 ? '#101413' : '#FFFFFF',
  };
}

export function applyBrand(el: HTMLElement, hex: string, dark: boolean) {
  const t = brandTokens(hex, dark);
  Object.keys(t).forEach((k) => el.style.setProperty(k, t[k]));
}
