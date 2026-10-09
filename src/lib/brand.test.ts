import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND, brandTokens, contrast } from './brand';

/** The colour tokens of one theme, read from the stylesheet. */
function tokens(theme: 'light' | 'dark') {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const start = css.indexOf(theme === 'light' ? ':root, [data-theme="light"] {' : '[data-theme="dark"] {');
  const block = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})\b/g)].map((m) => [m[1], m[2]]));
}

describe('contrast', () => {
  it('measures black on white as 21 and a colour on itself as 1', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrast('#0F7A55', '#0F7A55')).toBe(1);
  });
});

describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
  const t = tokens(theme);
  const text: [string, string][] = [
    ['--ink-2', '--surface'], ['--ink-3', '--surface'], ['--ink-3', '--paper'], ['--ink-3', '--surface-sunk'],
    ['--brand', '--surface'], ['--on-brand', '--brand'], ['--on-brand-soft', '--brand-soft'],
    ['--ok', '--ok-soft'], ['--warn', '--warn-soft'], ['--accent-2', '--accent-2-soft'], ['--margin', '--margin-soft'], ['--margin', '--surface'],
  ];
  it.each(text)('%s is readable on %s', (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
  it.each(['--surface', '--paper', '--surface-sunk'])('the edge of a field shows against %s', (bg) => {
    expect(contrast(t['--field-line'], t[bg])).toBeGreaterThanOrEqual(3);
  });
  it('has the same brand tokens in the stylesheet as the ones derived at runtime', () => {
    const derived = brandTokens(BRAND, theme === 'dark');
    for (const k of ['--brand', '--brand-hover', '--brand-press', '--brand-soft', '--on-brand', '--on-brand-soft', '--hero']) {
      expect(t[k].toLowerCase(), k).toBe(derived[k].toLowerCase());
    }
  });
});

describe('brand tokens from one hex', () => {
  it.each(['#0F7A55', '#2D46D6', '#C2357A', '#B45309'])('keep text readable on the soft fill for %s', (hex) => {
    for (const dark of [false, true]) {
      const t = brandTokens(hex, dark);
      expect(contrast(t['--on-brand-soft'], t['--brand-soft'])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
