import { afterEach, describe, expect, it, vi } from 'vitest';
import { dateLabel, daysTo, digits, mmss, ordinal, pad2, secs, taka } from './format';

afterEach(() => { vi.useRealTimers(); });

describe('digits', () => {
  it('converts only the digits to Bangla', () => {
    expect(digits('12:30', 'bn')).toBe('১২:৩০');
    expect(digits(405, 'bn')).toBe('৪০৫');
  });
  it('leaves Latin digits alone', () => {
    expect(digits('12:30', 'latin')).toBe('12:30');
  });
});

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

describe('money and ordinals', () => {
  it('groups thousands after the taka sign', () => {
    expect(taka(3000, 'latin')).toBe('৳3,000');
    expect(taka(38400, 'bn')).toBe('৳৩৮,৪০০');
  });
  it('uses the Bangla ordinal suffixes, then তম from 11', () => {
    expect(ordinal(1, 'bn')).toBe('১ম');
    expect(ordinal(4, 'bn')).toBe('৪র্থ');
    expect(ordinal(11, 'latin')).toBe('11তম');
  });
});

describe('dates', () => {
  it('labels an ISO date with the Bangla month', () => {
    expect(dateLabel('2026-12-14', 'latin')).toBe('14 ডিসেম্বর 2026');
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
