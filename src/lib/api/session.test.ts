import type { Me } from '@contract';
import { describe, expect, it } from 'vitest';
import { afterSignIn, homeOf, isOpen, kindFor, looksLikeEmail, passwordOk, passwordRules, redirectFor, safeNext, signInPath } from './session';

const person = (kind: Me['kind']): Me => ({
  id: 'u1', kind, name: 'Someone', phone: null, email: null, numerals: 'bn', semester: null, institute: null,
  examDate: null, setupDone: true, bio: null, subjects: [], role: null,
});

describe('who a screen is for', () => {
  it('gives each kind of person their own start', () => {
    expect(homeOf('student')).toBe('/');
    expect(homeOf('teacher')).toBe('/teacher');
    expect(homeOf('staff')).toBe('/admin');
  });
  it('reads the kind from the path, and does not mistake a look-alike for it', () => {
    expect(kindFor('/')).toBe('student');
    expect(kindFor('/learn/dsa/2/4')).toBe('student');
    expect(kindFor('/teacher')).toBe('teacher');
    expect(kindFor('/teacher/content/x')).toBe('teacher');
    expect(kindFor('/admin/roles')).toBe('staff');
    expect(kindFor('/teachers-lounge')).toBe('student');
  });
  it('knows the screens that need no sign-in', () => {
    expect(isOpen('/signin')).toBe(true);
    expect(isOpen('/invite/abc')).toBe(true);
    expect(isOpen('/')).toBe(false);
    expect(isOpen('/signing')).toBe(false);
  });
});

describe('sending people to the right place', () => {
  it('sends a signed-out visitor to sign in, remembering where they were going', () => {
    expect(redirectFor(null, '/courses')).toBe('/signin?next=%2Fcourses');
    expect(redirectFor(null, '/')).toBe('/signin');
  });

  it('sends someone who just logged out to a plain sign-in, so the next person does not land on their screen', () => {
    expect(redirectFor(null, '/teacher/profile', true)).toBe('/signin');
    expect(redirectFor(null, '/admin/payments?x=1', true)).toBe('/signin');
  });
  it('lets a person stay in their own area', () => {
    expect(redirectFor(person('student'), '/courses')).toBeNull();
    expect(redirectFor(person('teacher'), '/teacher/doubts')).toBeNull();
    expect(redirectFor(person('staff'), '/admin')).toBeNull();
  });
  it('sends a person who opened another area to their own start', () => {
    expect(redirectFor(person('student'), '/admin/payments')).toBe('/');
    expect(redirectFor(person('student'), '/teacher')).toBe('/');
    expect(redirectFor(person('teacher'), '/courses')).toBe('/teacher');
    expect(redirectFor(person('staff'), '/teacher')).toBe('/admin');
  });
  it('goes back after signing in only to a place that is theirs', () => {
    expect(afterSignIn(person('student'), '/learn/dsa/2/4?tab=quiz')).toBe('/learn/dsa/2/4?tab=quiz');
    expect(afterSignIn(person('teacher'), '/learn/dsa/2/4')).toBe('/teacher');
    expect(afterSignIn(person('staff'), '/admin/roles')).toBe('/admin/roles');
    expect(afterSignIn(person('student'), null)).toBe('/');
  });
});

describe('a link cannot send a person somewhere else', () => {
  it('keeps a path on this site', () => {
    expect(safeNext('/courses')).toBe('/courses');
    expect(safeNext('/learn/dsa/2/4#notes')).toBe('/learn/dsa/2/4#notes');
  });
  it('drops another site, however it is written', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'courses', '', null, undefined]) {
      expect(safeNext(bad)).toBeNull();
    }
    expect(afterSignIn(person('student'), '//evil.example/x')).toBe('/');
  });
  it('reads the address as a browser does, so a tab or a line break cannot hide another site', () => {
    for (const bad of ['/\t/evil.example', '/\n/evil.example', '\t//evil.example', '/\r\n/evil.example/courses', '/\u0000/evil.example']) {
      expect(safeNext(bad)).toBeNull();
    }
    expect(safeNext('/courses/../signin')).toBeNull();
    expect(safeNext('/learn/dsa/2/4?tab=notes#top')).toBe('/learn/dsa/2/4?tab=notes#top');
  });
  it('does not loop back to a sign-in screen', () => {
    expect(safeNext('/signin')).toBeNull();
    expect(safeNext('/forgot?x=1')).toBeNull();
    expect(signInPath('/signin?next=%2Fsignin')).toBe('/signin');
  });
});

describe('what was typed', () => {
  it('checks a new password the way the server does', () => {
    expect(passwordRules('abc')).toEqual({ long: false, digit: false });
    expect(passwordRules('abcdefgh')).toEqual({ long: true, digit: false });
    expect(passwordOk('abcdefg1')).toBe(true);
    expect(passwordOk('abcdefgh')).toBe(false);
    expect(passwordOk('1'.repeat(201))).toBe(false);
  });
  it('tells an email from a phone number', () => {
    expect(looksLikeEmail('rifat@schoolofgenz.com')).toBe(true);
    expect(looksLikeEmail('01712445589')).toBe(false);
  });
});
