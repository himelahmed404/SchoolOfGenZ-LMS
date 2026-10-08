import { afterEach, describe, expect, it, vi } from 'vitest';
import { ago, dateEn, dateRangeEn, daysTo, digits, mmss, monthEn, ordinal, ordinalEn, pad2, plural, secs, semLabel, taka } from './format';

afterEach(() => { vi.useRealTimers(); });

describe('time', () => {
  it('pads and formats seconds as mm:ss', () => {
    expect(pad2(3)).toBe('03');
    expect(mmss(372)).toBe('06:12');
    expect(mmss(0)).toBe('00:00');
  });
  it('parses mm:ss back to seconds', () => {
    expect(secs('12:30')).toBe(750);
  });
});

describe('facts are English with 123 digits', () => {
  it('groups thousands after the taka sign', () => {
    expect(taka(3000)).toBe('৳3,000');
    expect(taka(38400)).toBe('৳38,400');
  });

  it('writes dates as day, short month, year', () => {
    expect(dateEn('2026-12-14')).toBe('14 Dec 2026');
    expect(dateEn('2026-08-01', false)).toBe('1 Aug');
    expect(monthEn(new Date(2026, 9, 8))).toBe('October 2026');
  });

  it('shows the first year of a range only when the years differ', () => {
    expect(dateRangeEn('2026-08-01', '2026-12-28')).toBe('1 Aug – 28 Dec 2026');
    expect(dateRangeEn('2026-10-12', '2027-02-10')).toBe('12 Oct 2026 – 10 Feb 2027');
  });

  it('uses English ordinals, including the teens', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinalEn))
      .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th']);
    expect(semLabel(4)).toBe('4th Semester');
  });

  it('pluralises by count', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson');
    expect(plural(4, 'lesson')).toBe('4 lessons');
    expect(plural(0, 'day')).toBe('0 days');
  });

  it('says how long ago from minutes', () => {
    expect(ago(0)).toBe('just now');
    expect(ago(12)).toBe('12 min ago');
    expect(ago(60)).toBe('1 h ago');
    expect(ago(300)).toBe('5 h ago');
    expect(ago(1500)).toBe('yesterday');
    expect(ago(2880)).toBe('2 days ago');
    expect(ago(4200)).toBe('3 days ago');
  });

  it('counts whole days from today, ignoring the time of day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 23, 30));
    expect(daysTo('2026-10-08')).toBe(0);
    expect(daysTo('2026-10-09')).toBe(1);
    expect(daysTo('2026-12-14')).toBe(67);
    expect(daysTo('2026-10-01')).toBe(-7);
  });
});

describe('Bangla sentences follow the numeral setting', () => {
  it('converts only the digits to Bangla', () => {
    expect(digits('আর 40 পয়েন্ট', 'bn')).toBe('আর ৪০ পয়েন্ট');
    expect(digits(405, 'bn')).toBe('৪০৫');
  });
  it('leaves Latin digits alone when asked', () => {
    expect(digits('আর 40 পয়েন্ট', 'latin')).toBe('আর 40 পয়েন্ট');
  });
  it('uses the Bangla ordinal suffixes, then তম from 11', () => {
    expect(ordinal(1, 'bn')).toBe('১ম');
    expect(ordinal(4, 'bn')).toBe('৪র্থ');
    expect(ordinal(11, 'latin')).toBe('11তম');
  });
});
