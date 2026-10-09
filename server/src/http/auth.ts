import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Area, Role } from '../contract/index.js';
import type { Db } from '../db/index.js';
import { env, origins } from '../env.js';
import { SESSION_DAYS, sessionFor, type Auth, type Ctx, type User } from '../modules/auth/service.js';
import { forbidden, unauthorized } from './errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Who is asking, when they are signed in. */
    auth?: Auth;
  }
}

/** `__Host-` makes a browser accept the cookie only over HTTPS, for this exact site, on every path. */
export const cookieName = () => (env.NODE_ENV === 'production' ? '__Host-sgz_session' : 'sgz_session');

const cookieOptions = () => ({ httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' });

/** The page's scripts never see the token: it lives in a cookie only the browser and the server read. */
export function setSession(res: Response, token: string) {
  res.cookie(cookieName(), token, { ...cookieOptions(), maxAge: SESSION_DAYS * 86_400_000 });
}

export function clearSession(res: Response) {
  res.clearCookie(cookieName(), cookieOptions());
}

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Where the request came from, for rate limits and the device list. */
export const ctxOf = (req: Request): Ctx => ({ ip: req.get('x-real-ip') || req.ip || undefined, userAgent: req.get('user-agent') || undefined });

const CHANGES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Runs on every request: works out who is asking, from the session cookie (browsers) or a bearer token (a mobile app).
 *
 * It also stops a page on another site from making a signed-in browser act. A request that changes something
 * must come from one of our own sites; one with no origin at all is fine only when it carries no cookie,
 * which is how a mobile app or another server calls.
 */
export function authenticate(db: Db): RequestHandler {
  return async (req, _res, next) => {
    const bearer = /^Bearer\s+(\S+)$/.exec(req.get('authorization') || '')?.[1];
    const fromCookie = bearer ? undefined : readCookie(req, cookieName());
    if (CHANGES.has(req.method)) {
      const origin = req.get('origin');
      if (origin ? !origins().includes(origin.replace(/\/$/, '')) : !!fromCookie) throw forbidden('bad_origin', 'This request did not come from the app');
    }
    const token = bearer || fromCookie;
    if (token) req.auth = (await sessionFor(db, token)) || undefined;
    next();
  };
}

/** Signed in, and one of these kinds of person when any are named. */
export function requireUser(...kinds: User['kind'][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized('unauthorized', 'Sign in first');
    if (kinds.length && !kinds.includes(req.auth.user.kind)) throw forbidden('wrong_role', 'This is for another kind of account');
    next();
  };
}

const RANK = { none: 0, view: 1, edit: 2 } as const;

/** Whether a role may view or edit an area of the admin console. The locked role may do everything. */
export function allowed(role: Role | null, area: Area, level: 'view' | 'edit'): boolean {
  return !!role && (role.locked || RANK[role.perms[area] || 'none'] >= RANK[level]);
}

/** A staff member whose role gives this much access to this area. */
export function requirePerm(area: Area, level: 'view' | 'edit'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw unauthorized('unauthorized', 'Sign in first');
    if (req.auth.user.kind !== 'staff' || !allowed(req.auth.role, area, level)) throw forbidden('no_permission', 'Your role does not allow this');
    next();
  };
}
