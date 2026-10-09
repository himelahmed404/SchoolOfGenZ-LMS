import { eq, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { limit } from '../http/rateLimit.js';
import type { Opened } from './index.js';
import { activityLog, batches, chapterTests, chapters, courses, enrollments, lessons, payments, programCourses, programs, rateLimits, roles, settings, users } from './schema.js';
import { demo, seed, seedIfEmpty } from './seed.js';
import { testDb } from './testing.js';

let o: Opened;
beforeAll(async () => { o = await testDb(); await seed(o.db); });
afterAll(async () => { await o.close(); });

/** Rows in a table. */
const count = async (table: PgTable) => (await o.db.select({ n: sql<number>`count(*)::int` }).from(table))[0]!.n;

describe('the demo data', () => {
  it('loads both kinds of program', async () => {
    const all = await o.db.select().from(programs);
    expect(all.filter((p) => p.kind === 'diploma').map((p) => p.slug).sort()).toEqual(['cst-3rd-semester', 'cst-4th-semester', 'cst-5th-semester']);
    expect(all.filter((p) => p.kind === 'single')).toHaveLength(4);
    // Only single courses give a certificate.
    expect(all.every((p) => p.hasCertificate === (p.kind === 'single'))).toBe(true);
  });

  it('gives a semester its subjects in order, and a single program its one course', async () => {
    const of = async (slug: string) => (await o.db.select({ slug: courses.slug }).from(programCourses)
      .innerJoin(programs, eq(programs.id, programCourses.programId)).innerJoin(courses, eq(courses.id, programCourses.courseId))
      .where(eq(programs.slug, slug)).orderBy(programCourses.position)).map((r) => r.slug);
    expect(await of('cst-4th-semester')).toEqual(['math4', 'dsa', 'dbms', 'wdd', 'de2', 'mp', 'soc']);
    expect(await of('web-development-basics')).toEqual(['web']);
  });

  it('runs batches for diploma programs only', async () => {
    const rows = await o.db.select({ code: batches.code, kind: programs.kind }).from(batches).innerJoin(programs, eq(programs.id, batches.programId));
    expect(rows.map((r) => r.code).sort()).toEqual(['CST-03-B02', 'CST-04-B01', 'CST-04-B02', 'CST-05-B01']);
    expect(rows.every((r) => r.kind === 'diploma')).toBe(true);
  });

  it('has every lesson of the seed, with chapter tests on the diploma subject that has them', async () => {
    const d = demo();
    expect(await count(lessons)).toBe(d.courses.reduce((a, c) => a + c.chapters.reduce((x, ch) => x + ch.lessons.length, 0), 0));
    expect(await count(chapters)).toBe(d.courses.reduce((a, c) => a + c.chapters.length, 0));
    const tests = await o.db.select({ slug: courses.slug }).from(chapterTests).innerJoin(chapters, eq(chapters.id, chapterTests.chapterId)).innerJoin(courses, eq(courses.id, chapters.courseId));
    expect(tests.map((t) => t.slug)).toEqual(['dsa', 'dsa', 'dsa']);
  });

  it('keeps the roles and the settings', async () => {
    expect((await o.db.select().from(roles)).map((r) => r.id).sort()).toEqual(['content', 'finance', 'super', 'support']);
    const [bkash] = await o.db.select().from(settings).where(eq(settings.key, 'bkash'));
    expect(bkash!.value).toBe('01777 090909');
  });

  it('is only loaded into an empty database', async () => {
    expect(await seedIfEmpty(o.db)).toBe(false);
    expect(await count(programs)).toBe(7);
  });
});

describe('rules the database itself keeps', () => {
  /** A student with one pending enrollment, to hang payments on. */
  async function enrolled(phone: string) {
    const [u] = await o.db.insert(users).values({ kind: 'student', name: 'Test Student', phone }).returning();
    const [p] = await o.db.select().from(programs).where(eq(programs.slug, 'web-development-basics'));
    const [e] = await o.db.insert(enrollments).values({ userId: u!.id, programId: p!.id, price: p!.price }).returning();
    return { user: u!, enrollment: e! };
  }

  it('lets a TrxID be used once, ever', async () => {
    const a = await enrolled('01700000001'), b = await enrolled('01700000002');
    await o.db.insert(payments).values({ enrollmentId: a.enrollment.id, userId: a.user.id, method: 'bKash', amount: 2500, trxId: 'BKX0000001' });
    await expect(o.db.insert(payments).values({ enrollmentId: b.enrollment.id, userId: b.user.id, method: 'Nagad', amount: 2500, trxId: 'BKX0000001' })).rejects.toThrow();
  });

  it('enrolls a student in a program once', async () => {
    const a = await enrolled('01700000003');
    await expect(o.db.insert(enrollments).values({ userId: a.user.id, programId: a.enrollment.programId, price: 1 })).rejects.toThrow();
  });

  it('refuses a payment of nothing, and a person with no way to sign in', async () => {
    const a = await enrolled('01700000004');
    await expect(o.db.insert(payments).values({ enrollmentId: a.enrollment.id, userId: a.user.id, method: 'bKash', amount: 0, trxId: 'BKX0000002' })).rejects.toThrow();
    await expect(o.db.insert(users).values({ kind: 'student', name: 'Nobody' })).rejects.toThrow();
  });

  it('gives one phone number to one person', async () => {
    await expect(o.db.insert(users).values({ kind: 'student', name: 'Twin', phone: '01700000001' })).rejects.toThrow();
  });

  it('lets the activity log be added to and never changed', async () => {
    const [row] = await o.db.insert(activityLog).values({ actorName: 'Nabila Chowdhury', area: 'payments', action: 'Approved payment', target: 'BKX0000001' }).returning();
    await expect(o.db.update(activityLog).set({ action: 'Rejected payment' }).where(eq(activityLog.id, row!.id))).rejects.toThrow();
    await expect(o.db.delete(activityLog).where(eq(activityLog.id, row!.id))).rejects.toThrow();
    expect(await count(activityLog)).toBe(1);
  });

  it('undoes everything when one step of a transaction fails', async () => {
    const before = await count(users);
    await expect(o.db.transaction(async (tx) => {
      await tx.insert(users).values({ kind: 'student', name: 'Half Done', phone: '01700000009' });
      await tx.insert(users).values({ kind: 'student', name: 'Twin', phone: '01700000009' });
    })).rejects.toThrow();
    expect(await count(users)).toBe(before);
  });
});

describe('rate limits', () => {
  const at = (sec: number) => new Date(Date.UTC(2026, 9, 9, 10, 0, sec));

  it('lets the allowed number through and refuses the next, saying how long to wait', async () => {
    for (let i = 0; i < 3; i++) await limit(o.db, 'signin:phone:01711111111', 3, 60, at(5));
    await expect(limit(o.db, 'signin:phone:01711111111', 3, 60, at(20))).rejects.toMatchObject({ status: 429, code: 'rate_limited', retryAfterSec: 40 });
  });

  it('counts each key on its own and starts again in the next window', async () => {
    await limit(o.db, 'signin:phone:01722222222', 3, 60, at(20));
    await limit(o.db, 'signin:phone:01711111111', 3, 60, at(61));
    expect(await count(rateLimits)).toBe(3);
  });
});
