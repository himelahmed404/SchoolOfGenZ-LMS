/* Numbers behind the admin charts: figure formats, axis steps, and thinning a series. No React here, so it is unit-tested. */
import type { Trend } from './types';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** A figure in the chart's unit; `short` is the compact form for axis ticks (৳250K). */
export function figure(n: number, unit: Trend['unit'], short = false) {
  return (unit === 'taka' ? '৳' : '') + (short ? compact.format(n) : Math.round(n).toLocaleString('en-US'));
}

/**
 * A series cut down to at most `max` steps: the earlier values are averaged in equal shares, and the last value is kept as it is,
 * because that is the figure the tile shows. A tile is too small to draw thirty days one by one.
 */
export function thin(values: number[], max: number) {
  if (values.length <= max) return values;
  const head = values.slice(0, -1), n = max - 1;
  return Array.from({ length: n }, (_, i) => {
    const part = head.slice(Math.floor((i * head.length) / n), Math.floor(((i + 1) * head.length) / n));
    return part.reduce((x, y) => x + y, 0) / part.length;
  }).concat(values.slice(-1));
}

/**
 * A y axis for values up to `max`: about four round steps, ending on the first step at or above `max`.
 * `whole` keeps the steps to whole numbers, for counts.
 */
export function niceScale(max: number, whole = false) {
  const raw = Math.max(max, 1) / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  const m = [1, 2, 2.5, 5, 10].find((x) => x >= f - 1e-9 && !(whole && p === 1 && x === 2.5)) || 10;
  const step = whole ? Math.max(1, m * p) : m * p;
  return { top: Math.max(step, Math.ceil(max / step - 1e-9) * step), step };
}

/**
 * Where each part of a ring starts and how long it is, in hundredths of the ring. Parts are scaled to fill the ring
 * even when their figures do not add up to 100, and a part of nothing gets no arc.
 */
export function ringArcs(pcts: number[]) {
  const total = pcts.reduce((a, b) => a + Math.max(0, b), 0);
  if (!total) return [];
  return pcts.map((pct, i) => ({ i, from: (pcts.slice(0, i).reduce((a, b) => a + Math.max(0, b), 0) / total) * 100, len: (Math.max(0, pct) / total) * 100 }))
    .filter((a) => a.len > 0);
}
