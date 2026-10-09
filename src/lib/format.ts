/*
 * Two kinds of text:
 *  - Facts (names, semester, batch, dates, times, durations, counts, prices, ranks) are English with 123 digits.
 *    The formatters in the first half produce them and take no numeral setting.
 *  - Bangla sentences keep the student's numeral setting: `digits` and `ordinal`.
 */

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
export const taka = (n: number) => '৳' + n.toLocaleString('en-US');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parse = (iso: string) => new Date(iso + 'T00:00:00');

/** "14 Dec 2026"; without the year: "14 Dec". */
export function dateEn(iso: string, year = true): string {
  const d = parse(iso);
  return d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3) + (year ? ' ' + d.getFullYear() : '');
}

/** "1 Aug – 28 Dec 2026"; the first year shows only when the two differ. */
export function dateRangeEn(from: string, to: string): string {
  return dateEn(from, parse(from).getFullYear() !== parse(to).getFullYear()) + ' – ' + dateEn(to);
}

/** "October 2026" */
export const monthEn = (d: Date) => MONTHS[d.getMonth()] + ' ' + d.getFullYear();

/** 1st 2nd 3rd 4th … 11th 12th 13th … 21st */
export function ordinalEn(n: number): string {
  const t = n % 100;
  const suffix = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return n + suffix;
}

export const semLabel = (sem: number) => ordinalEn(sem) + ' Semester';

/** Singular or plural by count: plural(1, 'lesson') → "1 lesson", plural(4, 'lesson') → "4 lessons". */
export const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** How long ago, from minutes: "just now", "12 min ago", "3 h ago", "yesterday", "5 days ago". */
export function ago(min: number): string {
  if (min < 1) return 'just now';
  if (min < 60) return Math.round(min) + ' min ago';
  if (min < 1440) return Math.floor(min / 60) + ' h ago';
  if (min < 2880) return 'yesterday';
  return Math.round(min / 1440) + ' days ago';
}

export function daysTo(iso: string): number {
  const d = parse(iso).getTime();
  const n = new Date();
  n.setHours(0, 0, 0, 0);
  return Math.round((d - n.getTime()) / 86400000);
}

/** A phone number as the API keeps it (01712445589), split for reading: 01712-445589. */
export const phoneEn = (p: string, sep = '-') => (/^\d{11}$/.test(p) ? p.slice(0, 5) + sep + p.slice(5) : p);

/** The same with the middle hidden, for a screen someone else may see: 01712-••••89. */
export const maskPhone = (p: string) => (/^\d{11}$/.test(p) ? p.slice(0, 5) + '-••••' + p.slice(9) : p);

/* ---------- Bangla sentences ---------- */

export type Numerals = 'bn' | 'latin';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Render any digits in `v` in the viewer's preferred numeral system. For Bangla sentences only. */
export function digits(v: string | number, numerals: Numerals): string {
  const s = String(v);
  return numerals === 'latin' ? s : s.replace(/[0-9]/g, (d) => BN_DIGITS[+d]);
}

const ORD: Record<number, string> = { 1: 'ম', 2: 'য়', 3: 'য়', 4: 'র্থ', 5: 'ম', 6: 'ষ্ঠ', 7: 'ম', 8: 'ম', 9: 'ম', 10: 'ম' };
/** Bangla ordinal for use inside a Bangla sentence: ১ম ২য় ৩য় ৪র্থ … ১০ম, then ১১তম. */
export const ordinal = (n: number, numerals: Numerals) => digits(n, numerals) + (ORD[n] || 'তম');
