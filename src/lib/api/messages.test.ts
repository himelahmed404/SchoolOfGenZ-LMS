import { describe, expect, it } from 'vitest';
import { ApiFailure } from './client';
import { digits } from '../format';
import { KNOWN_CODES, sayError } from './messages';

const bn = (v: string | number) => digits(v, 'bn');
const latin = (v: string | number) => digits(v, 'latin');
const fail = (code: string) => new ApiFailure(400, code);
const general = sayError(new Error('boom'), bn);

describe('saying what went wrong', () => {
  it('has a Bangla sentence for every code the sign-in screens can get', () => {
    for (const code of ['bad_credentials', 'rate_limited', 'suspended', 'inactive', 'device_limit', 'bad_code', 'weak_password', 'bad_link', 'wrong_password', 'email_taken', 'offline']) {
      expect(KNOWN_CODES).toContain(code);
      const said = sayError(fail(code), bn);
      expect(said, code).not.toBe(general);
      expect(said, code).toMatch(/[ঀ-৿]/);
    }
  });
  it('falls back to a general sentence for a code it does not know, and for anything that is not a refusal', () => {
    expect(sayError(fail('something_new'), bn)).toBe(general);
    expect(sayError(undefined, bn)).toBe(general);
    expect(sayError(new ApiFailure(500, 'internal'), bn)).toBe(general);
  });
  it('writes digits in the reader\'s numerals', () => {
    expect(sayError(fail('weak_password'), bn)).toContain('৮টা');
    expect(sayError(fail('weak_password'), latin)).toContain('8টা');
  });
  it('never has a digit typed into a sentence', () => {
    // With a formatter that drops digits, none may be left: every digit must have gone through it.
    const none = (v: string | number) => String(v).replace(/[0-9]/g, '');
    for (const code of KNOWN_CODES) expect(sayError(fail(code), none), code).not.toMatch(/[0-9০-৯]/);
    expect(sayError(null, none)).not.toMatch(/[0-9০-৯]/);
  });
});
