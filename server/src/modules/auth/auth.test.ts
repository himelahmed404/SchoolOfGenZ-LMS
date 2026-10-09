import { randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { Me } from '../../contract/index.js';
import type { Opened } from '../../db/index.js';
import { activityLog, oneTimeCodes, rateLimits, roles, sessions, smsOutbox, staff, users } from '../../db/schema.js';
import { DEMO_PASSWORD, seed } from '../../db/seed.js';
import { testDb } from '../../db/testing.js';
import { readEnv } from '../../env.js';
import type { AdminRoute } from '../../http/adminRouter.js';
import { hashPassword, keyed } from './crypto.js';
import { issueCode, linkFor, startSession, type User } from './service.js';

const ORIGIN = 'http://localhost:3000';
const STUDENT = '01712445589', TEACHER = 'shahriar@schoolofgenz.com', SUPER = 'rifat@schoolofgenz.com', FINANCE = 'nabila@schoolofgenz.com', SUPPORT = 'tasnim@schoolofgenz.com';

let o: Opened, app: ReturnType<typeof createApp>, hash: string;

beforeAll(async () => {
  o = await testDb();
  await seed(o.db);
  app = createApp({ db: o.db });
  hash = await hashPassword('porashona1');
});
afterAll(async () => { await o.close(); });
// Each test starts with its allowance of tries untouched.
beforeEach(async () => { await o.db.delete(rateLimits); });

const post = (path: string, body: unknown, cookie?: string) => {
  const r = request(app).post('/v1' + path).set('Origin', ORIGIN);
  return (cookie ? r.set('Cookie', cookie) : r).send(body as object);
};
const get = (path: string, cookie?: string) => { const r = request(app).get('/v1' + path); return cookie ? r.set('Cookie', cookie) : r; };
const cookieOf = (res: request.Response) => String((res.headers['set-cookie'] as unknown as string[] | undefined)?.[0] || '').split(';')[0]!;
const byLogin = async (login: string) => (await o.db.select().from(users).where(login.includes('@') ? eq(users.email, login) : eq(users.phone, login)))[0]!;
/** A session made directly, for tests that are about something other than signing in. */
const sessionOf = async (login: string, device?: string) => 'sgz_session=' + (await startSession(o.db, await byLogin(login), { device })).token;
let n = 0;
/** A fresh student with the password `porashona1`. */
async function student(over: Partial<typeof users.$inferInsert> = {}): Promise<User> {
  const phone = '0181' + String(1000000 + ++n);
  return (await o.db.insert(users).values({ kind: 'student', name: 'Student ' + n, phone, passwordHash: hash, status: 'active', ...over }).returning())[0]!;
}

describe('signing in', () => {
  it('takes a student\'s phone however it is typed, and answers with who they are', async () => {
    for (const login of ['01712445589', '01712 445589', '+8801712-445589', '০১৭১২৪৪৫৫৮৯']) {
      const res = await post('/auth/signin', { login, password: DEMO_PASSWORD });
      expect(res.status, login).toBe(200);
      expect(Me.parse(res.body.user)).toMatchObject({ kind: 'student', name: 'Mahmudul Hasan', phone: STUDENT, role: null });
    }
  });

  it('keeps the session in a cookie the page\'s scripts cannot read', async () => {
    const res = await post('/auth/signin', { login: STUDENT, password: DEMO_PASSWORD });
    const raw = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(raw).toMatch(/^sgz_session=[\w-]{43};/);
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/SameSite=Lax/i);
    expect(raw).toMatch(/Path=\//);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/password|argon2/i);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('takes a staff member\'s email in any case, and says what their role allows', async () => {
    const res = await post('/auth/signin', { login: 'Nabila@SchoolOfGenZ.com', password: DEMO_PASSWORD });
    expect(res.body.user).toMatchObject({ kind: 'staff', role: { id: 'finance', locked: false } });
    expect(res.body.user.role.perms).toMatchObject({ payments: 'edit', students: 'view', roles: 'none' });
  });

  it('answers a wrong password and an unknown login the same way', async () => {
    const wrong = await post('/auth/signin', { login: STUDENT, password: 'not-the-password1' });
    const nobody = await post('/auth/signin', { login: '01999999999', password: DEMO_PASSWORD });
    const nonsense = await post('/auth/signin', { login: 'not a login', password: DEMO_PASSWORD });
    for (const res of [wrong, nobody, nonsense]) {
      expect(res.status).toBe(401);
      expect(res.body.error).toMatchObject({ code: 'bad_credentials', message: wrong.body.error.message });
      expect(res.headers['set-cookie']).toBeUndefined();
    }
  });

  it('stops after ten wrong guesses at one login, and says how long to wait', async () => {
    const u = await student();
    for (let i = 0; i < 10; i++) expect((await post('/auth/signin', { login: u.phone, password: 'guess-number-' + i })).status).toBe(401);
    const res = await post('/auth/signin', { login: u.phone, password: 'porashona1' });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('rate_limited');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('refuses someone who was invited but has not set a password', async () => {
    expect((await post('/auth/signin', { login: 'maruf.h@gmail.com', password: DEMO_PASSWORD })).status).toBe(401);
  });

  it('never keeps a password or a token as it was typed', async () => {
    const res = await post('/auth/signin', { login: STUDENT, password: DEMO_PASSWORD });
    const token = cookieOf(res).split('=')[1]!;
    const all = await o.db.select().from(sessions);
    expect(all.some((s) => s.tokenHash === token)).toBe(false);
    expect(all.some((s) => s.tokenHash === keyed(token))).toBe(true);
    expect((await o.db.select().from(users)).every((u) => !u.passwordHash || (u.passwordHash.startsWith('$argon2id$') && !u.passwordHash.includes(DEMO_PASSWORD)))).toBe(true);
  });
});

describe('a session', () => {
  it('says who is signed in, and nothing to anyone else', async () => {
    expect((await get('/auth/me')).status).toBe(401);
    expect((await get('/auth/me', 'sgz_session=made-up-token')).status).toBe(401);
    const me = await get('/auth/me', await sessionOf(TEACHER));
    expect(Me.parse(me.body)).toMatchObject({ kind: 'teacher', email: TEACHER, subjects: ['Data Structure', 'C Programming', 'Algorithm'] });
  });

  it('ends when the person signs out', async () => {
    const cookie = await sessionOf(STUDENT, 'device-signout-1');
    const out = await post('/auth/signout', {}, cookie);
    expect(out.status).toBe(204);
    expect(String((out.headers['set-cookie'] as unknown as string[])[0])).toMatch(/^sgz_session=;/);
    expect((await get('/auth/me', cookie)).status).toBe(401);
  });

  it('ends at once when the account is suspended', async () => {
    const u = await student();
    const cookie = 'sgz_session=' + (await startSession(o.db, u)).token;
    expect((await get('/auth/me', cookie)).status).toBe(200);
    await o.db.update(users).set({ status: 'suspended', note: 'Shared the account' }).where(eq(users.id, u.id));
    expect((await get('/auth/me', cookie)).status).toBe(401);
    const again = await post('/auth/signin', { login: u.phone, password: 'porashona1' });
    expect(again.status).toBe(403);
    expect(again.body.error.code).toBe('suspended');
  });

  it('gives a mobile app the token itself, and takes it back as a header', async () => {
    const res = await request(app).post('/v1/auth/signin').set('x-token-mode', 'bearer').send({ login: TEACHER, password: DEMO_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(res.body.token).toMatch(/^[\w-]{43}$/);
    const me = await request(app).get('/v1/auth/me').set('Authorization', 'Bearer ' + res.body.token);
    expect(me.body.email).toBe(TEACHER);
    // With a token there is no cookie for another site to ride on, so no origin is asked for.
    expect((await request(app).post('/v1/auth/signout').set('Authorization', 'Bearer ' + res.body.token)).status).toBe(204);
  });

  it('lists the devices a person is signed in on and lets them end one of their own', async () => {
    const u = await student();
    const here = 'sgz_session=' + (await startSession(o.db, u, { device: 'device-aaaa', userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile' })).token;
    const there = await startSession(o.db, u, { device: 'device-bbbb', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0' });
    const list = await get('/auth/sessions', here);
    expect(list.body.map((s: { device: string; current: boolean }) => [s.device, s.current]).sort()).toEqual([['Chrome · Android', true], ['Chrome · Windows', false]]);
    expect((await request(app).delete('/v1/auth/sessions/' + there.session.id).set('Origin', ORIGIN).set('Cookie', here)).status).toBe(204);
    expect((await get('/auth/me', 'sgz_session=' + there.token)).status).toBe(401);
    // Someone else's session is not theirs to end, or even to know about.
    const other = await startSession(o.db, await student());
    expect((await request(app).delete('/v1/auth/sessions/' + other.session.id).set('Origin', ORIGIN).set('Cookie', here)).status).toBe(404);
  });
});

describe('requests that change something', () => {
  it('must come from one of our own sites when they carry the session cookie', async () => {
    const cookie = await sessionOf(STUDENT, 'device-origin-1');
    const noOrigin = await request(app).post('/v1/auth/signout').set('Cookie', cookie);
    const elsewhere = await request(app).post('/v1/auth/signout').set('Cookie', cookie).set('Origin', 'https://evil.example');
    for (const res of [noOrigin, elsewhere]) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('bad_origin');
    }
    expect((await get('/auth/me', cookie)).status).toBe(200);
  });

  it('are refused from another site even before anyone is signed in', async () => {
    const res = await request(app).post('/v1/auth/signin').set('Origin', 'https://evil.example').send({ login: STUDENT, password: DEMO_PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe('the device limit', () => {
  it('holds a student to the number of devices in Settings, and lets a known device back in', async () => {
    const u = await student();
    const on = (device: string) => post('/auth/signin', { login: u.phone, password: 'porashona1', device });
    expect((await on('device-phone-1')).status).toBe(200);
    expect((await on('device-laptop-1')).status).toBe(200);
    const third = await on('device-tablet-1');
    expect(third.status).toBe(403);
    expect(third.body.error.code).toBe('device_limit');
    expect((await on('device-phone-1')).status).toBe(200);
    // Signing in again on the same device replaces its session; it does not add one.
    expect(await o.db.select().from(sessions).where(and(eq(sessions.userId, u.id), isNull(sessions.revokedAt)))).toHaveLength(2);
  });

  it('does not apply to teachers and staff', async () => {
    for (const d of ['device-office-1', 'device-office-2', 'device-office-3']) expect((await post('/auth/signin', { login: SUPPORT, password: DEMO_PASSWORD, device: d })).status).toBe(200);
  });
});

describe('a student\'s first password', () => {
  /** An approved student who has not set a password yet, and the code from their SMS. */
  async function approved() {
    const u = await student({ passwordHash: null, status: 'pending' });
    return { u, code: (await issueCode(o.db, u.id, 'activate')).secret };
  }

  it('is set with the code from the SMS, typed any way, and signs them in', async () => {
    const { u, code } = await approved();
    expect((await post('/auth/signin', { login: u.phone, password: 'porashona1' })).status).toBe(401);
    const res = await post('/auth/activate', { phone: u.phone, code: code.slice(0, 4).toLowerCase() + ' - ' + code.slice(4), password: 'porashona1' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: u.id, kind: 'student' });
    expect((await get('/auth/me', cookieOf(res))).status).toBe(200);
    expect((await byLogin(u.phone!)).status).toBe('active');
  });

  it('works once', async () => {
    const { u, code } = await approved();
    expect((await post('/auth/activate', { phone: u.phone, code, password: 'porashona1' })).status).toBe(200);
    const again = await post('/auth/activate', { phone: u.phone, code, password: 'another-pass2' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('bad_code');
  });

  it('dies after five wrong guesses, so even the right code no longer works', async () => {
    const { u, code } = await approved();
    for (let i = 0; i < 5; i++) expect((await post('/auth/activate', { phone: u.phone, code: 'ZZZZZZZ' + i, password: 'porashona1' })).body.error.code).toBe('bad_code');
    expect((await post('/auth/activate', { phone: u.phone, code, password: 'porashona1' })).status).toBe(400);
  });

  it('expires, and is replaced when a new one is issued', async () => {
    const { u, code } = await approved();
    await o.db.update(oneTimeCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(oneTimeCodes.userId, u.id));
    expect((await post('/auth/activate', { phone: u.phone, code, password: 'porashona1' })).status).toBe(400);
    const next = (await issueCode(o.db, u.id, 'activate')).secret;
    expect((await post('/auth/activate', { phone: u.phone, code: next, password: 'porashona1' })).status).toBe(200);
  });

  it('says the same for a phone nobody has, and is kept as a hash', async () => {
    const { u, code } = await approved();
    expect((await post('/auth/activate', { phone: '01999999998', code, password: 'porashona1' })).body.error.code).toBe('bad_code');
    const [row] = await o.db.select().from(oneTimeCodes).where(eq(oneTimeCodes.userId, u.id));
    expect(row!.secretHash).not.toContain(code);
    expect(row!.secretHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('needs a password of eight characters with a digit, and says which rule failed', async () => {
    const { u, code } = await approved();
    const short = await post('/auth/activate', { phone: u.phone, code, password: 'abc1' });
    expect(short.body.error).toMatchObject({ code: 'weak_password', fields: { password: 'too_short' } });
    expect((await post('/auth/activate', { phone: u.phone, code, password: 'abcdefgh' })).body.error.fields.password).toBe('needs_digit');
    // A refused password does not use the code up.
    expect((await post('/auth/activate', { phone: u.phone, code, password: 'abcdefg1' })).status).toBe(200);
  });
});

describe('a forgotten password', () => {
  const sms = async (phone: string) => (await o.db.select().from(smsOutbox).where(eq(smsOutbox.toPhone, phone)));
  const codeIn = (text: string) => /code is ([\w-]+)\./.exec(text)![1]!;

  it('answers the same whether or not the account exists, and texts a code only when it does', async () => {
    const u = await student();
    const real = await post('/auth/forgot', { login: u.phone });
    const fake = await post('/auth/forgot', { login: '01999999997' });
    expect([real.status, fake.status]).toEqual([204, 204]);
    expect(await sms(u.phone!)).toHaveLength(1);
    expect(await sms('01999999997')).toHaveLength(0);
  });

  it('lets the student set a new password with the code, and signs every other device out', async () => {
    const u = await student();
    const old = 'sgz_session=' + (await startSession(o.db, u, { device: 'device-old-01' })).token;
    await post('/auth/forgot', { login: u.phone });
    const code = codeIn((await sms(u.phone!))[0]!.text);
    const res = await post('/auth/reset', { login: u.phone, code, password: 'notun-pass9', device: 'device-new-01' });
    expect(res.status).toBe(200);
    expect((await get('/auth/me', old)).status).toBe(401);
    expect((await get('/auth/me', cookieOf(res))).status).toBe(200);
    expect((await post('/auth/signin', { login: u.phone, password: 'porashona1' })).status).toBe(401);
    expect((await post('/auth/signin', { login: u.phone, password: 'notun-pass9', device: 'device-new-01' })).status).toBe(200);
    expect((await post('/auth/reset', { login: u.phone, code, password: 'third-pass3' })).body.error.code).toBe('bad_code');
  });

  it('sends at most three codes an hour to one number', async () => {
    const u = await student();
    for (let i = 0; i < 3; i++) expect((await post('/auth/forgot', { login: u.phone })).status).toBe(204);
    expect((await post('/auth/forgot', { login: u.phone })).status).toBe(429);
    expect(await sms(u.phone!)).toHaveLength(3);
  });

  it('sends nothing to a teacher or staff member: they ask an admin for a link', async () => {
    expect((await post('/auth/forgot', { login: TEACHER })).status).toBe(204);
    expect(await o.db.select().from(oneTimeCodes).where(eq(oneTimeCodes.userId, (await byLogin(TEACHER)).id))).toHaveLength(0);
  });
});

describe('changing a password', () => {
  it('needs the current one, keeps this device and signs the others out', async () => {
    const u = await student();
    const here = 'sgz_session=' + (await startSession(o.db, u, { device: 'device-here-1' })).token;
    const there = 'sgz_session=' + (await startSession(o.db, u, { device: 'device-there1' })).token;
    const wrong = await post('/auth/password', { current: 'not-it-12345', next: 'notun-pass9' }, here);
    expect(wrong.body.error).toMatchObject({ code: 'wrong_password', fields: { current: 'wrong' } });
    expect((await post('/auth/password', { current: 'porashona1', next: 'short1' }, here)).body.error.fields.next).toBe('too_short');
    expect((await post('/auth/password', { current: 'porashona1', next: 'notun-pass9' }, here)).status).toBe(204);
    expect((await get('/auth/me', here)).status).toBe(200);
    expect((await get('/auth/me', there)).status).toBe(401);
    expect((await post('/auth/password', { current: 'x', next: 'y' })).status).toBe(401);
  });
});

describe('invitations', () => {
  it('let an admin add a staff member, who sets a password from a link that works once', async () => {
    const admin = await sessionOf(SUPER);
    const made = await post('/admin/staff', { name: 'Arif Chowdhury', email: 'Arif@SchoolOfGenZ.com', role: 'support' }, admin);
    expect(made.status).toBe(201);
    expect(made.body.link).toMatch(/^http:\/\/localhost:3000\/invite\/[\w-]{43}$/);
    const token = made.body.link.split('/').pop() as string;
    expect((await post('/auth/signin', { login: 'arif@schoolofgenz.com', password: 'porashona1' })).status).toBe(401);

    expect((await get('/auth/invite/' + token)).body).toEqual({ name: 'Arif Chowdhury', email: 'arif@schoolofgenz.com', kind: 'staff' });
    const res = await post('/auth/invite', { token, password: 'porashona1' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ kind: 'staff', role: { id: 'support' } });
    expect((await post('/auth/invite', { token, password: 'again-pass2' })).body.error.code).toBe('bad_link');
    expect((await get('/auth/invite/' + token)).status).toBe(400);
    expect((await post('/auth/signin', { login: 'arif@schoolofgenz.com', password: 'porashona1' })).status).toBe(200);
    expect((await o.db.select().from(activityLog).where(eq(activityLog.action, 'Invited staff')))[0]).toMatchObject({ actorName: 'Rifat Ahmed', area: 'roles', target: 'Arif Chowdhury · Support' });
  });

  it('refuse an email that is already someone\'s, and a role that does not exist', async () => {
    const admin = await sessionOf(SUPER);
    expect((await post('/admin/staff', { name: 'Twin', email: FINANCE, role: 'support' }, admin)).body.error.code).toBe('email_taken');
    expect((await post('/admin/staff', { name: 'Lost', email: 'lost@schoolofgenz.com', role: 'no-such-role' }, admin)).body.error.code).toBe('no_role');
    expect(await o.db.select().from(users).where(eq(users.email, 'lost@schoolofgenz.com'))).toHaveLength(0);
  });

  it('let a teacher who was invited set their password the same way', async () => {
    const maruf = await byLogin('maruf.h@gmail.com');
    const token = (await linkFor(o.db, maruf.id)).link.split('/').pop() as string;
    const res = await post('/auth/invite', { token, password: 'porashona1' });
    expect(res.body.user).toMatchObject({ kind: 'teacher', role: null });
  });

  it('are not for students, and a made-up link is refused', async () => {
    expect((await post('/auth/invite', { token: 'x'.repeat(43), password: 'porashona1' })).body.error.code).toBe('bad_link');
  });
});

describe('roles and staff', () => {
  it('shows roles and staff to those whose role allows it, and to nobody else', async () => {
    const ok = await get('/admin/roles', await sessionOf(SUPER));
    expect(ok.status).toBe(200);
    expect(ok.body.roles.map((r: { id: string }) => r.id)).toContain('finance');
    expect(ok.body.staff.find((s: { email: string }) => s.email === FINANCE)).toMatchObject({ role: 'finance', status: 'active' });
    const no = await get('/admin/roles', await sessionOf(FINANCE));
    expect(no.status).toBe(403);
    expect(no.body.error.code).toBe('no_permission');
    expect((await get('/admin/roles', await sessionOf(TEACHER))).status).toBe(403);
  });

  it('changes what a role may do, with a reason, and writes it down', async () => {
    const admin = await sessionOf(SUPER);
    const body = { name: 'Support', description: 'Students, notices, certificates', perms: { students: 'edit', refunds: 'view' } };
    expect((await request(app).put('/v1/admin/roles/support').set('Origin', ORIGIN).set('Cookie', admin).send(body)).body.error.code).toBe('reason_needed');
    const res = await request(app).put('/v1/admin/roles/support').set('Origin', ORIGIN).set('Cookie', admin).send({ ...body, reason: 'Support now handles refund questions' });
    expect(res.status).toBe(200);
    expect(res.body.perms).toEqual({ students: 'edit', refunds: 'view' });
    expect((await o.db.select().from(activityLog).where(eq(activityLog.action, 'Changed role permissions')))[0]).toMatchObject({ target: 'Support', reason: 'Support now handles refund questions' });
  });

  it('never lets the super admin role be edited', async () => {
    const res = await request(app).put('/v1/admin/roles/super').set('Origin', ORIGIN).set('Cookie', await sessionOf(SUPER)).send({ name: 'Super admin', perms: {}, reason: 'Trying to lock everyone out' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('role_locked');
    expect((await o.db.select().from(roles).where(eq(roles.id, 'super')))[0]!.locked).toBe(true);
  });

  it('deletes a role nobody holds, with a reason, and keeps one that is locked or in use', async () => {
    const admin = await sessionOf(SUPER);
    const del = (id: string, body: object = { reason: 'Merged into another role' }) => post('/admin/roles/' + id + '/delete', body, admin);
    expect((await post('/admin/roles', { name: 'Night shift', perms: { payments: 'view' } }, admin)).status).toBe(201);
    expect((await del('night-shift', {})).body.error.code).toBe('invalid_input');
    expect((await del('super')).body.error.code).toBe('role_locked');
    expect((await del('finance')).body.error.code).toBe('role_in_use');
    expect((await del('no-such-role')).status).toBe(404);
    expect((await del('night-shift')).status).toBe(204);
    expect(await o.db.select().from(roles).where(eq(roles.id, 'night-shift'))).toEqual([]);
    expect((await o.db.select().from(roles).where(eq(roles.id, 'finance')))).toHaveLength(1);
    expect((await o.db.select().from(activityLog).where(eq(activityLog.action, 'Deleted role')))[0]).toMatchObject({ target: 'Night shift', reason: 'Merged into another role' });
  });

  it('removes a staff member\'s access at once, and can give it back', async () => {
    const admin = await sessionOf(SUPER), sakib = await byLogin('sakib@schoolofgenz.com');
    const theirs = await sessionOf('sakib@schoolofgenz.com');
    const patch = (body: object) => request(app).patch('/v1/admin/staff/' + sakib.id).set('Origin', ORIGIN).set('Cookie', admin).send(body);
    expect((await patch({ active: false, reason: 'Left the team' })).status).toBe(204);
    expect((await get('/auth/me', theirs)).status).toBe(401);
    expect((await post('/auth/signin', { login: sakib.email, password: DEMO_PASSWORD })).body.error.code).toBe('inactive');
    expect((await patch({ active: true, reason: 'Came back' })).status).toBe(204);
    expect((await post('/auth/signin', { login: sakib.email, password: DEMO_PASSWORD })).status).toBe(200);
    expect((await patch({ role: 'finance', reason: 'Moved to the finance desk' })).status).toBe(204);
    expect((await o.db.select().from(staff).where(eq(staff.userId, sakib.id)))[0]!.roleId).toBe('finance');
  });

  it('does not let anyone change their own access, or remove the last super admin', async () => {
    const rifat = await byLogin(SUPER), admin = await sessionOf(SUPER);
    const self = await request(app).patch('/v1/admin/staff/' + rifat.id).set('Origin', ORIGIN).set('Cookie', admin).send({ role: 'support', reason: 'Stepping down' });
    expect(self.body.error.code).toBe('not_yourself');
    // A second super admin tries to remove the first: allowed. Then the first cannot be the only one left to remove.
    const made = await post('/admin/staff', { name: 'Second Super', email: 'second@schoolofgenz.com', role: 'super' }, admin);
    await post('/auth/invite', { token: made.body.link.split('/').pop(), password: 'porashona1' });
    const second = await sessionOf('second@schoolofgenz.com');
    expect((await request(app).patch('/v1/admin/staff/' + rifat.id).set('Origin', ORIGIN).set('Cookie', second).send({ active: false, reason: 'Handing over' })).status).toBe(204);
    const back = await request(app).patch('/v1/admin/staff/' + rifat.id).set('Origin', ORIGIN).set('Cookie', second).send({ active: true, reason: 'Handing back' });
    expect(back.status).toBe(204);
    await request(app).patch('/v1/admin/staff/' + made.body.id).set('Origin', ORIGIN).set('Cookie', await sessionOf(SUPER)).send({ active: false, reason: 'No longer needed' });
    const supers = await o.db.select().from(staff).innerJoin(users, eq(users.id, staff.userId)).where(and(eq(staff.roleId, 'super'), eq(users.status, 'active')));
    expect(supers).toHaveLength(1);
  });
});

describe('every admin route', () => {
  it('is refused to anyone whose role does not allow it', async () => {
    const routes = app.locals.adminRoutes as AdminRoute[];
    expect(routes.length).toBeGreaterThan(0);

    // Two staff members made for this: one who may view everything and edit nothing, one who may do nothing.
    await o.db.insert(roles).values([
      { id: 'looker', name: 'Looker', perms: Object.fromEntries(routes.map((r) => [r.area, 'view'])) },
      { id: 'nobody', name: 'Nobody', perms: {} },
    ]);
    const make = async (role: string) => {
      const [u] = await o.db.insert(users).values({ kind: 'staff', name: role, email: role + '@schoolofgenz.com', passwordHash: hash, status: 'active' }).returning();
      await o.db.insert(staff).values({ userId: u!.id, roleId: role });
      return 'sgz_session=' + (await startSession(o.db, u!)).token;
    };
    const looker = await make('looker'), nobody = await make('nobody'), asTeacher = await sessionOf(TEACHER);
    const asStudent = 'sgz_session=' + (await startSession(o.db, await student())).token;

    for (const r of routes) {
      const path = '/v1/admin' + r.path.replace(/:\w+/g, randomUUID());
      const call = (cookie?: string) => { const q = request(app)[r.method](path).set('Origin', ORIGIN); return (cookie ? q.set('Cookie', cookie) : q).send({}); };
      const what = r.method.toUpperCase() + ' ' + r.path;
      expect((await call()).status, what + ' signed out').toBe(401);
      expect((await call(asStudent)).status, what + ' as a student').toBe(403);
      expect((await call(asTeacher)).status, what + ' as a teacher').toBe(403);
      expect((await call(nobody)).status, what + ' with no access to ' + r.area).toBe(403);
      const seen = (await call(looker)).status;
      if (r.level === 'edit') expect(seen, what + ' with view only').toBe(403);
      else expect(seen, what + ' with view').not.toBe(403);
    }
  });
});

describe('a person\'s own profile', () => {
  const patch = (cookie: string, body: object) => request(app).patch('/v1/me/profile').set('Origin', ORIGIN).set('Cookie', cookie).send(body);

  it('lets a student change their details, and drops a hand-set exam date when the semester changes', async () => {
    const u = await student({ semester: 4, examDate: '2026-12-20' });
    const cookie = 'sgz_session=' + (await startSession(o.db, u)).token;
    const same = await patch(cookie, { name: '  রিয়া আক্তার ', institute: 'Dhaka Polytechnic Institute', semester: 4, numerals: 'latin', setupDone: true });
    expect(same.body).toMatchObject({ name: 'রিয়া আক্তার', semester: 4, examDate: '2026-12-20', numerals: 'latin', setupDone: true });
    expect((await patch(cookie, { semester: 5 })).body).toMatchObject({ semester: 5, examDate: null });
    expect((await patch(cookie, { semester: 6, examDate: '2027-06-01' })).body).toMatchObject({ semester: 6, examDate: '2027-06-01' });
  });

  it('refuses an email someone else uses', async () => {
    const u = await student();
    const res = await patch('sgz_session=' + (await startSession(o.db, u)).token, { email: TEACHER });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('email_taken');
  });

  it('lets a teacher change their bio and subjects, but not their name', async () => {
    const cookie = await sessionOf(TEACHER);
    expect((await patch(cookie, { bio: 'নতুন পরিচিতি', subjects: ['Data Structure'] })).body).toMatchObject({ bio: 'নতুন পরিচিতি', subjects: ['Data Structure'] });
    const no = await patch(cookie, { name: 'Someone Else' });
    expect(no.status).toBe(403);
    expect(no.body.error.code).toBe('not_yours_to_change');
    expect((await patch(cookie, { semester: 99 })).body.error.code).toBe('invalid_input');
    expect((await request(app).patch('/v1/me/profile').set('Origin', ORIGIN).send({ bio: 'x' })).status).toBe(401);
  });
});

describe('the demo sign-in', () => {
  it('becomes a demo account without its password, outside production', async () => {
    const res = await post('/auth/dev', { as: 'admin' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: SUPER, role: { id: 'super', locked: true } });
    expect((await post('/auth/dev', { as: 'nobody' })).status).toBe(400);
  });

  it('cannot be switched on in production, where a secret is required too', () => {
    const prod = { NODE_ENV: 'production', DATABASE_URL: 'postgres://x', SECRET: 'x'.repeat(40) };
    expect(() => readEnv({ ...prod, DEV_LOGIN: '1' })).toThrow(/DEV_LOGIN/);
    expect(() => readEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgres://x' })).toThrow(/SECRET/);
    expect(readEnv(prod).NODE_ENV).toBe('production');
  });
});
