/*
 * Demo data: the catalog the LMS was built on, the staff roles and the settings.
 * `npm run db:seed` loads it into an empty database. Never run it against production.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { sql } from 'drizzle-orm';
import type { Area, Block, Perm, QuizQ } from '../contract/index.js';
import type { Db } from './index.js';
import { hashPassword } from '../modules/auth/crypto.js';
import { batches, chapterTests, chapters, courseTeachers, courses, enrollments, lessons, programCourses, programs, roles, settings, staff, users } from './schema.js';

/** Every demo account signs in with this. It is for development and previews only. */
export const DEMO_PASSWORD = 'genz2026';

interface Demo {
  people: {
    students: { name: string; phone: string; email: string; institute: string; semester: number; enrollments: { program: string; batch: string | null; price: number }[] }[];
    teachers: { name: string; email: string; status: 'active' | 'invited'; courses: string[]; bio?: string; subjects?: string[] }[];
    staff: { name: string; email: string; role: string }[];
  };
  settings: Record<string, unknown>;
  roles: { id: string; name: string; description: string; locked: boolean; perms: Partial<Record<Area, Perm>> }[];
  programs: {
    slug: string; kind: 'diploma' | 'single'; code: string; title: string; titleBn: string; department: string | null; semester: number | null;
    status: 'draft' | 'published' | 'archived'; model: 'free' | 'one' | 'inst'; price: number; installments: number;
    earlyOn: boolean; earlyPrice: number; earlyEnd: string | null; weeks: number | null; hasCertificate: boolean; courses: string[];
  }[];
  batches: { code: string; slug: string; program: string; no: number; startDate: string; examDate: string; seats: number; status: 'enrolling' | 'running' | 'closed' | 'finished'; price: number | null }[];
  courses: {
    slug: string; code: string; title: string; titleBn: string; bteb: string | null;
    chapters: { name: string; test?: { seconds: number; questions: QuizQ[] }; lessons: { title: string; durationSec: number; blocks?: Block[]; quiz?: QuizQ[] }[] }[];
  }[];
}

export const demo = (): Demo => JSON.parse(readFileSync(path.join(import.meta.dirname, 'seed/demo.json'), 'utf8'));

/** Load the demo data. Everything goes in together or not at all. */
export async function seed(db: Db, d: Demo = demo()): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(settings).values(Object.entries(d.settings).map(([key, value]) => ({ key, value })));
    await tx.insert(roles).values(d.roles);

    const courseId: Record<string, string> = {};
    for (const c of d.courses) {
      const [row] = await tx.insert(courses).values({ slug: c.slug, code: c.code, title: c.title, titleBn: c.titleBn, bteb: c.bteb }).returning({ id: courses.id });
      courseId[c.slug] = row!.id;
      for (const [ci, ch] of c.chapters.entries()) {
        const [chRow] = await tx.insert(chapters).values({ courseId: row!.id, position: ci, name: ch.name }).returning({ id: chapters.id });
        if (ch.lessons.length) {
          await tx.insert(lessons).values(ch.lessons.map((l, li) => ({
            chapterId: chRow!.id, position: li, title: l.title, durationSec: l.durationSec,
            // Every seeded lesson is live. Most have only a heading for notes; one has real notes and a practice quiz.
            published: { title: l.title, video: { state: 'done' as const, dur: mmss(l.durationSec) }, blocks: l.blocks || [{ t: 'h' as const, x: l.title }], quiz: l.quiz || [] },
            publishedAt: new Date(),
          })));
        }
        if (ch.test) await tx.insert(chapterTests).values({ chapterId: chRow!.id, seconds: ch.test.seconds, questions: ch.test.questions });
      }
    }

    const programId: Record<string, string> = {};
    for (const p of d.programs) {
      const { courses: list, ...row } = p;
      const [made] = await tx.insert(programs).values(row).returning({ id: programs.id });
      programId[p.slug] = made!.id;
      if (list.length) await tx.insert(programCourses).values(list.map((slug, position) => ({ programId: made!.id, courseId: need(courseId, slug), position })));
    }

    const batchId: Record<string, string> = {};
    for (const { program, ...b } of d.batches) {
      const [made] = await tx.insert(batches).values({ ...b, programId: need(programId, program) }).returning({ id: batches.id });
      batchId[b.code] = made!.id;
    }

    // One hash for all of them: hashing is slow on purpose, and they share the password anyway.
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const p of d.people.staff) {
      const [u] = await tx.insert(users).values({ kind: 'staff', name: p.name, email: p.email, passwordHash, status: 'active', setupDone: true }).returning({ id: users.id });
      await tx.insert(staff).values({ userId: u!.id, roleId: p.role });
    }
    for (const p of d.people.teachers) {
      // An invited teacher has no password until they open their link.
      const active = p.status === 'active';
      const [u] = await tx.insert(users).values({ kind: 'teacher', name: p.name, email: p.email, passwordHash: active ? passwordHash : null, status: p.status, setupDone: true, bio: p.bio, subjects: p.subjects }).returning({ id: users.id });
      if (p.courses.length) await tx.insert(courseTeachers).values(p.courses.map((slug) => ({ courseId: need(courseId, slug), userId: u!.id })));
    }
    for (const p of d.people.students) {
      const { enrollments: list, ...row } = p;
      const [u] = await tx.insert(users).values({ kind: 'student', ...row, passwordHash, status: 'active', setupDone: true }).returning({ id: users.id });
      await tx.insert(enrollments).values(list.map((e) => ({ userId: u!.id, programId: need(programId, e.program), batchId: e.batch ? need(batchId, e.batch) : null, status: 'active' as const, price: e.price, activatedAt: new Date() })));
    }
  });
}

/** Seed a database that has no programs yet; leave any other alone. */
export async function seedIfEmpty(db: Db): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(programs);
  if (row && row.n > 0) return false;
  await seed(db);
  return true;
}

const mmss = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');

function need(map: Record<string, string>, key: string): string {
  const v = map[key];
  if (!v) throw new Error('Seed refers to "' + key + '", which is not defined');
  return v;
}

// Run directly: `npm run db:seed`.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const { database } = await import('./index.js');
  const { env } = await import('../env.js');
  if (env.NODE_ENV === 'production') throw new Error('The demo seed is not for production');
  const o = await database();
  await o.migrate();
  console.log((await seedIfEmpty(o.db)) ? 'Demo data loaded.' : 'The database already has data; nothing was changed.');
  await o.close();
}
