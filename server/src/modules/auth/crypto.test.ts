import { describe, expect, it } from 'vitest';
import { hashPassword, keyed, newCode, newToken, passwordProblem, tidyCode, verifyPassword } from './crypto.js';

describe('passwords', () => {
  it('are stored as an argon2id hash that only the right password matches', async () => {
    const stored = await hashPassword('porashona2026');
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(stored).not.toContain('porashona2026');
    expect(await verifyPassword('porashona2026', stored)).toBe(true);
    expect(await verifyPassword('porashona2027', stored)).toBe(false);
  });

  it('hash differently each time, so two people with one password do not look alike', async () => {
    expect(await hashPassword('same-password-1')).not.toBe(await hashPassword('same-password-1'));
  });

  it('never match when the account has no password, or the stored value is damaged', async () => {
    expect(await verifyPassword('anything1', null)).toBe(false);
    expect(await verifyPassword('', null)).toBe(false);
    expect(await verifyPassword('anything1', 'not-a-hash')).toBe(false);
  });

  it('need eight characters and a digit', () => {
    expect(passwordProblem('abc1')).toBe('too_short');
    expect(passwordProblem('abcdefgh')).toBe('needs_digit');
    expect(passwordProblem('abcdefg1')).toBeNull();
    expect(passwordProblem('1'.repeat(201))).toBe('too_long');
    expect(passwordProblem('পাসওয়ার্ড১২৩4')).toBeNull();
  });
});

describe('tokens and codes', () => {
  it('makes tokens that do not repeat and are long enough to be unguessable', () => {
    const a = newToken(), b = newToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[\w-]{43}$/);
  });

  it('makes eight-character codes from letters and digits that cannot be confused', () => {
    for (let i = 0; i < 50; i++) expect(newCode()).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
  });

  it('reads a typed code whatever its spacing or case', () => {
    expect(tidyCode(' k7qm-2xdp ')).toBe('K7QM2XDP');
  });

  it('keeps only a keyed hash, the same for the same value', () => {
    expect(keyed('K7QM2XDP')).toBe(keyed('K7QM2XDP'));
    expect(keyed('K7QM2XDP')).not.toBe(keyed('K7QM2XDQ'));
    expect(keyed('K7QM2XDP')).toMatch(/^[0-9a-f]{64}$/);
  });
});
