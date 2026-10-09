import { eq } from 'drizzle-orm';
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { AcceptInviteBody, ActivateBody, ForgotBody, PasswordBody, ResetBody, SignInBody, type SignedIn } from '../../contract/index.js';
import type { Db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { devLogin } from '../../env.js';
import { clearSession, ctxOf, requireUser, setSession } from '../../http/auth.js';
import { notFound } from '../../http/errors.js';
import { parse } from '../../http/validate.js';
import { acceptInvite, activate, changePassword, endOwnSession, forgot, inviteInfo, listSessions, reset, roleOf, signIn, signOut, startSession, toMe, type Signed } from './service.js';

/** The demo accounts the development sign-in can become. They come from the demo data. */
const DEMO = { student: { phone: '01712445589' }, teacher: { email: 'shahriar@schoolofgenz.com' }, admin: { email: 'rifat@schoolofgenz.com' } } as const;

export function authRoutes(db: Db) {
  const r = Router();

  /** A browser gets the session as a cookie. A mobile app asks for the token itself with `x-token-mode: bearer`. */
  const answer = (req: Request, res: Response, s: Signed) => {
    const body: SignedIn = { user: toMe(s.user, s.role) };
    if (req.get('x-token-mode') === 'bearer') body.token = s.token;
    else setSession(res, s.token);
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
  };

  r.post('/signin', async (req, res) => answer(req, res, await signIn(db, parse(SignInBody, req.body), ctxOf(req))));

  r.post('/signout', async (req, res) => {
    if (req.auth) await signOut(db, req.auth.session.id);
    clearSession(res);
    res.status(204).end();
  });

  r.get('/me', requireUser(), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(toMe(req.auth!.user, req.auth!.role));
  });

  r.post('/activate', async (req, res) => answer(req, res, await activate(db, parse(ActivateBody, req.body), ctxOf(req))));

  // Always the same answer, so it cannot be used to find out who has an account.
  r.post('/forgot', async (req, res) => {
    await forgot(db, parse(ForgotBody, req.body).login, ctxOf(req));
    res.status(204).end();
  });

  r.post('/reset', async (req, res) => answer(req, res, await reset(db, parse(ResetBody, req.body), ctxOf(req))));

  r.get('/invite/:token', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await inviteInfo(db, String(req.params.token), ctxOf(req)));
  });

  r.post('/invite', async (req, res) => answer(req, res, await acceptInvite(db, parse(AcceptInviteBody, req.body), ctxOf(req))));

  r.post('/password', requireUser(), async (req, res) => {
    await changePassword(db, req.auth!, parse(PasswordBody, req.body), ctxOf(req));
    res.status(204).end();
  });

  r.get('/sessions', requireUser(), async (req, res) => { res.json(await listSessions(db, req.auth!)); });

  r.delete('/sessions/:id', requireUser(), async (req, res) => {
    await endOwnSession(db, req.auth!, parse(z.uuid(), req.params.id));
    res.status(204).end();
  });

  // Development only: become a demo account without its password. The route does not exist in production.
  if (devLogin()) {
    r.post('/dev', async (req, res) => {
      const { as, device } = parse(z.object({ as: z.enum(['student', 'teacher', 'admin']), device: z.string().max(100).optional() }), req.body);
      const who = DEMO[as];
      const [user] = await db.select().from(users).where('phone' in who ? eq(users.phone, who.phone) : eq(users.email, who.email));
      if (!user || user.status !== 'active') throw notFound('no_demo_account', 'Load the demo data first: npm --prefix server run db:reset');
      const role = user.kind === 'staff' ? await roleOf(db, user.id) : null;
      answer(req, res, { ...(await startSession(db, user, { device, userAgent: req.get('user-agent') || undefined })), user, role });
    });
  }

  return r;
}
