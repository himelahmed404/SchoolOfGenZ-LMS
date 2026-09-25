import { bnMonths } from './data';

export type Numerals = 'bn' | 'latin';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Render any digits in `v` in the viewer's preferred numeral system. */
export function digits(v: string | number, numerals: Numerals): string {
  const s = String(v);
  return numerals === 'latin' ? s : s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function mmss(s: number): string {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return pad2(m) + ':' + pad2(r);
}

export function secs(t: string): number {
  const p = t.split(':');
  return +p[0] * 60 + +p[1];
}

/** Money: ৳ + grouped digits. */
export const taka = (n: number, numerals: Numerals) => '৳' + digits(n.toLocaleString('en-US'), numerals);

const ORD: Record<number, string> = { 1: 'ম', 2: 'য়', 3: 'য়', 4: 'র্থ', 5: 'ম', 6: 'ষ্ঠ', 7: 'ম', 8: 'ম', 9: 'ম', 10: 'ম' };
/** Bangla ordinal: ১ম ২য় ৩য় ৪র্থ … ১০ম, then ১১তম. */
export const ordinal = (n: number, numerals: Numerals) => digits(n, numerals) + (ORD[n] || 'তম');

export function dateLabel(iso: string, numerals: Numerals): string {
  const d = new Date(iso + 'T00:00:00');
  return digits(d.getDate(), numerals) + ' ' + bnMonths[d.getMonth()] + ' ' + digits(d.getFullYear(), numerals);
}

export function daysTo(iso: string): number {
  const d = new Date(iso + 'T00:00:00').getTime();
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((d - n.getTime()) / 86400000);
}
