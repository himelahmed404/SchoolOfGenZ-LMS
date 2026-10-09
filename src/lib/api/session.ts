import type { Me } from '@contract';

/*
 * Who may open what. The API decides for real on every request; this is what the screens use
 * to send a person to the right place instead of showing them an empty page.
 */

export type Kind = Me['kind'];

/** Where TanStack Query keeps the signed-in person (`Me`, or null when nobody is). */
export const ME_KEY = ['me'] as const;

/** Screens anyone may open without signing in. `src/proxy.ts` keeps the same list. */
export const OPEN = ['/signin', '/activate', '/forgot', '/invite'];
const under = (path: string, root: string) => path === root || path.startsWith(root + '/');
export const isOpen = (path: string) => OPEN.some((p) => under(path, p));

/** Where each kind of person starts. */
export const homeOf = (kind: Kind) => (kind === 'teacher' ? '/teacher' : kind === 'staff' ? '/admin' : '/');

const pathOnly = (url: string) => url.split(/[?#]/)[0];

/** Which kind of person a screen is for. */
export function kindFor(url: string): Kind {
  const path = pathOnly(url);
  return under(path, '/teacher') ? 'teacher' : under(path, '/admin') ? 'staff' : 'student';
}

/** A stand-in for this site, so an address can be resolved without knowing where the site is. */
const HERE = 'http://local.invalid';

/**
 * A place on this site to go back to after signing in, or null. Anything else is dropped (another site,
 * a `//host` address, a sign-in screen), so a link someone sends cannot take a person elsewhere.
 * The address is read the way a browser reads it, which drops tabs and line breaks: `/\t/host` is `//host`.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || /[\u0000-\u001f\\]/.test(next) || !next.startsWith('/') || next.startsWith('//')) return null;
  let u: URL;
  try { u = new URL(next, HERE); } catch { return null; }
  if (u.origin !== HERE || isOpen(u.pathname)) return null;
  return u.pathname + u.search + u.hash;
}

/** The sign-in screen, remembering where the person was going. */
export function signInPath(from?: string | null): string {
  const next = safeNext(from);
  return next && next !== '/' ? '/signin?next=' + encodeURIComponent(next) : '/signin';
}

/**
 * Where to send someone who opened `path`, or null when they may stay. `left` is true for someone who has
 * just logged out: they go to a plain sign-in, not one that brings the next person back to this screen.
 */
export function redirectFor(me: Me | null, path: string, left = false): string | null {
  if (!me) return left ? '/signin' : signInPath(path);
  return me.kind === kindFor(path) ? null : homeOf(me.kind);
}

/** After signing in: back to where they were going when that place is theirs, otherwise their home. */
export function afterSignIn(me: Me, next?: string | null): string {
  const n = safeNext(next);
  return n && kindFor(n) === me.kind ? n : homeOf(me.kind);
}

/** The rules for a new password, as the server checks them. */
export const passwordRules = (pw: string) => ({ long: pw.length >= 8, digit: /\d/.test(pw) });
export const passwordOk = (pw: string) => { const r = passwordRules(pw); return r.long && r.digit && pw.length <= 200; };

/** Whether what was typed is an email address; otherwise it is treated as a phone number. */
export const looksLikeEmail = (login: string) => login.includes('@');

const DEVICE_KEY = 'sgz-device';

/**
 * A name for this browser, made once and kept. Signing in here again then replaces this browser's
 * own session instead of counting as one more device.
 */
export function deviceId(): string | undefined {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
