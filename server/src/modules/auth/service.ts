/*
 * Signing in, and the three ways to get a password: the code in an approval SMS (students),
 * a reset code by SMS (students), and a one-time link an admin sends (teachers and staff).
 *
 * These take the database itself, not a transaction: a rate-limit count or a wrong-code count has
 * to stay counted even when the request then fails. The steps that belong together run in one
 * transaction inside each function.
 */
import { and, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm';
import { queueSms } from '../../adapters/sms.js';
import { Email, Phone } from '../../contract/index.js';
import type { AcceptInviteBody, ActivateBody, InviteInfo, Me, PasswordBody, ResetBody, Role, SessionRow, SignInBody } from '../../contract/index.js';
import type { Db, Tx } from '../../db/index.js';
import { oneTimeCodes, roles, sessions, settings, staff, users } from '../../db/schema.js';
import { env } from '../../env.js';
import { badRequest, forbidden, notFound, unauthorized } from '../../http/errors.js';
import { limit } from '../../http/rateLimit.js';
import { hashPassword, keyed, newCode, newToken, passwordProblem, tidyCode, verifyPassword } from './crypto.js';

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
type Purpose = 'activate' | 'reset' | 'invite';

/** Who is asking: the person, the device they are on, and for staff what their role allows. */
export interface Auth { user: User; session: Session; role: Role | null }
/** What signing in gives back. `token` is shown to its owner once and never stored. */
export interface Signed { token: string; session: Session; user: User; role: Role | null }
/** Where a request came from, as far as it matters here. */
export interface Ctx { ip?: string; userAgent?: string; now?: Date }

const MIN = 60_000, DAY = 86_400_000;
export const SESSION_DAYS = 30;
const LIFE: Record<Purpose, number> = { activate: 7 * DAY, reset: 15 * MIN, invite: 7 * DAY };
/** Wrong guesses a code survives. */
const TRIES = 5;

/* ---------- finding people ---------- */

/** A login is a phone number or an email. Says which, tidied; null when it is neither. */
export function parseLogin(login: string): { phone: string } | { email: string } | null {
  if (login.includes('@')) {
    const r = Email.safeParse(login);
    return r.success ? { email: r.data } : null;
  }
  const r = Phone.safeParse(login);
  return r.success ? { phone: r.data } : null;
}

/** What a rate limit is counted against when the login is not a real phone or email. */
const loginKey = (login: string) => {
  const who = parseLogin(login);
  return who ? ('phone' in who ? who.phone : who.email) : 'other:' + login.toLowerCase().slice(0, 60);
};

async function byLogin(db: Tx, login: string): Promise<User | undefined> {
  const who = parseLogin(login);
  if (!who) return undefined;
  const [u] = await db.select().from(users).where('phone' in who ? eq(users.phone, who.phone) : eq(users.email, who.email));
  return u;
}

export async function roleOf(db: Tx, userId: string): Promise<Role | null> {
  const [r] = await db.select({ id: roles.id, name: roles.name, description: roles.description, locked: roles.locked, perms: roles.perms })
    .from(staff).innerJoin(roles, eq(roles.id, staff.roleId)).where(eq(staff.userId, userId));
  return r || null;
}

export function toMe(user: User, role: Role | null): Me {
  return {
    id: user.id, kind: user.kind, name: user.name, phone: user.phone, email: user.email, numerals: user.numerals,
    semester: user.semester, institute: user.institute, examDate: user.examDate, setupDone: user.setupDone,
    bio: user.bio, subjects: user.subjects || [], role,
  };
}

/* ---------- sessions ---------- */

/** "Chrome · Android": enough for a student to recognise their own devices. */
export function deviceLabel(ua = ''): string {
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Macintosh|Mac OS X/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '';
  return [browser, os].filter(Boolean).join(' · ') || 'Unknown device';
}

/** How many devices a student may be signed in on (Settings → Content protection). */
async function deviceLimit(db: Tx): Promise<number> {
  const [row] = await db.select().from(settings).where(eq(settings.key, 'devices'));
  const n = Number(row?.value);
  return Number.isInteger(n) && n > 0 ? n : 2;
}

/**
 * Sign a person in on a device. A student is held to the device limit: a device they are already on
 * is replaced, a new one is refused once the limit is reached, and an admin can reset their devices.
 */
export async function startSession(db: Tx, user: User, o: { device?: string; userAgent?: string; now?: Date } = {}): Promise<{ token: string; session: Session }> {
  const now = o.now || new Date(), device = o.device || 'unknown';
  const live = and(eq(sessions.userId, user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, now));
  if (user.kind === 'student') {
    const on = new Set((await db.select({ d: sessions.deviceId }).from(sessions).where(live)).map((s) => s.d || 'unknown'));
    if (!on.has(device) && on.size >= (await deviceLimit(db))) throw forbidden('device_limit', 'Signed in on too many devices');
  }
  // Signing in again on the same device replaces what was there.
  await db.update(sessions).set({ revokedAt: now }).where(and(live, o.device ? eq(sessions.deviceId, o.device) : isNull(sessions.deviceId)));
  const token = newToken();
  const [session] = await db.insert(sessions).values({
    userId: user.id, tokenHash: keyed(token), deviceId: o.device || null, deviceLabel: deviceLabel(o.userAgent),
    lastUsedAt: now, expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY),
  }).returning();
  await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, user.id));
  return { token, session: session! };
}

/** The person a token belongs to, or null. A suspended or deactivated account has no session, whatever token it holds. */
export async function sessionFor(db: Tx, token: string, now = new Date()): Promise<Auth | null> {
  const [row] = await db.select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(eq(sessions.tokenHash, keyed(token)));
  if (!row || row.session.revokedAt || row.session.expiresAt <= now || row.user.status !== 'active') return null;
  const role = row.user.kind === 'staff' ? await roleOf(db, row.user.id) : null;
  // Staff with no role can do nothing, so they are not signed in at all.
  if (row.user.kind === 'staff' && !role) return null;
  // Noted at most every five minutes; a session in its second half is given another full term.
  if (now.getTime() - row.session.lastUsedAt.getTime() > 5 * MIN) {
    const closing = row.session.expiresAt.getTime() - now.getTime() < (SESSION_DAYS / 2) * DAY;
    await db.update(sessions).set({ lastUsedAt: now, ...(closing ? { expiresAt: new Date(now.getTime() + SESSION_DAYS * DAY) } : {}) }).where(eq(sessions.id, row.session.id));
    await db.update(users).set({ lastSeenAt: now }).where(eq(users.id, row.user.id));
  }
  return { user: row.user, session: row.session, role };
}

export async function signOut(db: Tx, sessionId: string, now = new Date()): Promise<void> {
  await db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
}

/** End every session of a person, except optionally the one they are using. */
export async function endSessions(db: Tx, userId: string, keep?: string, now = new Date()): Promise<void> {
  await db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt), keep ? ne(sessions.id, keep) : undefined));
}

export async function listSessions(db: Tx, auth: Auth, now = new Date()): Promise<SessionRow[]> {
  const rows = await db.select().from(sessions).where(and(eq(sessions.userId, auth.user.id), isNull(sessions.revokedAt), gt(sessions.expiresAt, now))).orderBy(desc(sessions.lastUsedAt));
  return rows.map((s) => ({ id: s.id, device: s.deviceLabel || 'Unknown device', current: s.id === auth.session.id, createdAt: s.createdAt.toISOString(), lastUsedAt: s.lastUsedAt.toISOString() }));
}

/** End one of the person's own sessions. Someone else's id is reported as not found. */
export async function endOwnSession(db: Tx, auth: Auth, id: string, now = new Date()): Promise<void> {
  const done = await db.update(sessions).set({ revokedAt: now }).where(and(eq(sessions.id, id), eq(sessions.userId, auth.user.id), isNull(sessions.revokedAt))).returning({ id: sessions.id });
  if (!done.length) throw notFound('no_session');
}

/* ---------- signing in ---------- */

export async function signIn(db: Db, body: SignInBody, ctx: Ctx = {}): Promise<Signed> {
  const now = ctx.now || new Date();
  await limit(db, 'signin:login:' + loginKey(body.login), 10, 15 * 60, now);
  if (ctx.ip) await limit(db, 'signin:ip:' + ctx.ip, 60, 15 * 60, now);
  const user = await byLogin(db, body.login);
  // The password is checked even when nobody has this login, and both failures read the same.
  const ok = await verifyPassword(body.password, user?.passwordHash);
  if (!user || !ok) throw unauthorized('bad_credentials', 'The phone number, email or password is wrong');
  if (user.status === 'suspended') throw forbidden('suspended', 'This account is suspended');
  if (user.status !== 'active') throw forbidden('inactive', 'This account is not active');
  const role = user.kind === 'staff' ? await roleOf(db, user.id) : null;
  if (user.kind === 'staff' && !role) throw forbidden('inactive', 'This account is not active');
  return { ...(await startSession(db, user, { device: body.device, userAgent: ctx.userAgent, now })), user, role };
}

/* ---------- one-time codes ---------- */

/** Make a code or link for a person. Any earlier one of the same kind stops working. */
export async function issueCode(db: Tx, userId: string, purpose: Purpose, now = new Date()): Promise<{ secret: string; expiresAt: Date }> {
  await db.update(oneTimeCodes).set({ usedAt: now }).where(and(eq(oneTimeCodes.userId, userId), eq(oneTimeCodes.purpose, purpose), isNull(oneTimeCodes.usedAt)));
  // A link carries a long token. An SMS carries a code short enough to type.
  const secret = purpose === 'invite' ? newToken() : newCode();
  const expiresAt = new Date(now.getTime() + LIFE[purpose]);
  await db.insert(oneTimeCodes).values({ userId, purpose, secretHash: keyed(purpose + ':' + secret), expiresAt });
  return { secret, expiresAt };
}

/** K7QM-2XDP: how a code is written in an SMS. */
export const prettyCode = (code: string) => code.slice(0, 4) + '-' + code.slice(4);

const badCode = () => badRequest('bad_code', 'The code is wrong or has expired');

/**
 * Check the code a person typed. A wrong guess is counted against the code, and after five the code is dead.
 * Every failure reads the same, whether there is no such person, no code, an old code or a wrong one.
 */
async function checkCode(db: Db, userId: string | undefined, purpose: 'activate' | 'reset', typed: string, now: Date): Promise<string> {
  if (!userId) throw badCode();
  const [row] = await db.select().from(oneTimeCodes)
    .where(and(eq(oneTimeCodes.userId, userId), eq(oneTimeCodes.purpose, purpose), isNull(oneTimeCodes.usedAt))).orderBy(desc(oneTimeCodes.createdAt)).limit(1);
  if (!row || row.expiresAt <= now || row.attempts >= TRIES) throw badCode();
  if (row.secretHash !== keyed(purpose + ':' + tidyCode(typed))) {
    await db.update(oneTimeCodes).set({ attempts: sql`${oneTimeCodes.attempts} + 1` }).where(eq(oneTimeCodes.id, row.id));
    throw badCode();
  }
  return row.id;
}

/** Use a code up. It is false when someone else used it in the same instant. */
async function consume(tx: Tx, codeId: string, now: Date): Promise<boolean> {
  const done = await tx.update(oneTimeCodes).set({ usedAt: now }).where(and(eq(oneTimeCodes.id, codeId), isNull(oneTimeCodes.usedAt))).returning({ id: oneTimeCodes.id });
  return done.length === 1;
}

function mustBeStrong(password: string, field: string) {
  const problem = passwordProblem(password);
  if (problem) throw badRequest('weak_password', 'The password needs 8 characters and a digit', { [field]: problem });
}

/* ---------- a student's first password ---------- */

/** Set a first password with the code from the approval SMS, and sign in. */
export async function activate(db: Db, body: ActivateBody, ctx: Ctx = {}): Promise<Signed> {
  const now = ctx.now || new Date();
  await limit(db, 'code:login:' + body.phone, 10, 15 * 60, now);
  if (ctx.ip) await limit(db, 'code:ip:' + ctx.ip, 60, 15 * 60, now);
  mustBeStrong(body.password, 'password');
  const [found] = await db.select().from(users).where(eq(users.phone, body.phone));
  const user = found && found.kind === 'student' && (found.status === 'pending' || found.status === 'active') ? found : undefined;
  const codeId = await checkCode(db, user?.id, 'activate', body.code, now);
  const passwordHash = await hashPassword(body.password);
  return db.transaction(async (tx) => {
    if (!(await consume(tx, codeId, now))) throw badCode();
    const [u] = await tx.update(users).set({ passwordHash, status: 'active' }).where(eq(users.id, user!.id)).returning();
    return { ...(await startSession(tx, u!, { device: body.device, userAgent: ctx.userAgent, now })), user: u!, role: null };
  });
}

/* ---------- a forgotten password ---------- */

/**
 * Ask for a reset. It answers the same whether or not the account exists.
 * A student gets a code by SMS. A teacher or staff member asks an admin for a new link.
 */
export async function forgot(db: Db, login: string, ctx: Ctx = {}): Promise<void> {
  const now = ctx.now || new Date();
  await limit(db, 'forgot:login:' + loginKey(login), 3, 60 * 60, now);
  if (ctx.ip) await limit(db, 'forgot:ip:' + ctx.ip, 20, 60 * 60, now);
  const user = await byLogin(db, login);
  if (!user || user.status !== 'active' || user.kind !== 'student' || !user.phone || !user.passwordHash) return;
  await db.transaction(async (tx) => {
    const { secret } = await issueCode(tx, user.id, 'reset', now);
    await queueSms(tx, user.phone!, 'School of GenZ: your password code is ' + prettyCode(secret) + '. It works for 15 minutes. If you did not ask for it, ignore this message.', 'reset');
  });
}

/** Set a new password with the reset code. Every other device is signed out. */
export async function reset(db: Db, body: ResetBody, ctx: Ctx = {}): Promise<Signed> {
  const now = ctx.now || new Date();
  await limit(db, 'code:login:' + loginKey(body.login), 10, 15 * 60, now);
  if (ctx.ip) await limit(db, 'code:ip:' + ctx.ip, 60, 15 * 60, now);
  mustBeStrong(body.password, 'password');
  const found = await byLogin(db, body.login);
  const user = found && found.status === 'active' ? found : undefined;
  const codeId = await checkCode(db, user?.id, 'reset', body.code, now);
  const passwordHash = await hashPassword(body.password);
  return db.transaction(async (tx) => {
    if (!(await consume(tx, codeId, now))) throw badCode();
    const [u] = await tx.update(users).set({ passwordHash }).where(eq(users.id, user!.id)).returning();
    await endSessions(tx, u!.id, undefined, now);
    return { ...(await startSession(tx, u!, { device: body.device, userAgent: ctx.userAgent, now })), user: u!, role: null };
  });
}

/* ---------- invitations: teachers and staff ---------- */

/** A link that lets a teacher or staff member set a password: their invitation, or a reset an admin made for them. */
export async function linkFor(db: Tx, userId: string, now = new Date()): Promise<{ link: string; expiresAt: Date }> {
  const { secret, expiresAt } = await issueCode(db, userId, 'invite', now);
  return { link: env.LMS_URL.replace(/\/$/, '') + '/invite/' + secret, expiresAt };
}

const badLink = () => badRequest('bad_link', 'This link is wrong, used or expired');

async function inviteOf(db: Tx, token: string, now: Date) {
  const [row] = await db.select({ code: oneTimeCodes, user: users }).from(oneTimeCodes).innerJoin(users, eq(users.id, oneTimeCodes.userId))
    .where(and(eq(oneTimeCodes.secretHash, keyed('invite:' + token)), eq(oneTimeCodes.purpose, 'invite'), isNull(oneTimeCodes.usedAt)));
  if (!row || row.code.expiresAt <= now || row.user.kind === 'student' || (row.user.status !== 'invited' && row.user.status !== 'active')) return null;
  return row;
}

/** Who a link is for, so its page can greet them before they choose a password. */
export async function inviteInfo(db: Db, token: string, ctx: Ctx = {}): Promise<InviteInfo> {
  const now = ctx.now || new Date();
  if (ctx.ip) await limit(db, 'invite:ip:' + ctx.ip, 60, 15 * 60, now);
  const row = await inviteOf(db, token, now);
  if (!row) throw badLink();
  return { name: row.user.name, email: row.user.email || '', kind: row.user.kind as 'teacher' | 'staff' };
}

/** Set a password from the link and sign in. Any other device is signed out. */
export async function acceptInvite(db: Db, body: AcceptInviteBody, ctx: Ctx = {}): Promise<Signed> {
  const now = ctx.now || new Date();
  if (ctx.ip) await limit(db, 'invite:ip:' + ctx.ip, 60, 15 * 60, now);
  mustBeStrong(body.password, 'password');
  const row = await inviteOf(db, body.token, now);
  if (!row) throw badLink();
  const passwordHash = await hashPassword(body.password);
  return db.transaction(async (tx) => {
    if (!(await consume(tx, row.code.id, now))) throw badLink();
    const [u] = await tx.update(users).set({ passwordHash, status: 'active' }).where(eq(users.id, row.user.id)).returning();
    const role = u!.kind === 'staff' ? await roleOf(tx, u!.id) : null;
    if (u!.kind === 'staff' && !role) throw badLink();
    await endSessions(tx, u!.id, undefined, now);
    return { ...(await startSession(tx, u!, { device: body.device, userAgent: ctx.userAgent, now })), user: u!, role };
  });
}

/* ---------- changing a password ---------- */

/** Change the password while signed in. Other devices are signed out; this one stays. */
export async function changePassword(db: Db, auth: Auth, body: PasswordBody, ctx: Ctx = {}): Promise<void> {
  const now = ctx.now || new Date();
  await limit(db, 'password:user:' + auth.user.id, 10, 15 * 60, now);
  if (!(await verifyPassword(body.current, auth.user.passwordHash))) throw badRequest('wrong_password', 'The current password is wrong', { current: 'wrong' });
  mustBeStrong(body.next, 'next');
  const passwordHash = await hashPassword(body.next);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, auth.user.id));
    await endSessions(tx, auth.user.id, auth.session.id, now);
  });
}
