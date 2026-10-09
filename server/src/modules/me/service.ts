import { eq } from 'drizzle-orm';
import type { ProfileBody } from '../../contract/index.js';
import type { Db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { conflict, forbidden } from '../../http/errors.js';
import type { Auth, User } from '../auth/service.js';

/** What each kind of person may change about themselves. Anything else in the body is refused, not ignored. */
const MAY: Record<User['kind'], (keyof ProfileBody)[]> = {
  student: ['name', 'email', 'institute', 'semester', 'numerals', 'examDate', 'setupDone'],
  teacher: ['bio', 'subjects', 'numerals'],
  staff: ['numerals'],
};

/** Change the signed-in person's own profile. Only the fields that were sent change. */
export async function saveProfile(db: Db, auth: Auth, body: ProfileBody): Promise<User> {
  const sent = (Object.keys(body) as (keyof ProfileBody)[]).filter((k) => body[k] !== undefined);
  const refused = sent.filter((k) => !MAY[auth.user.kind].includes(k));
  if (refused.length) throw forbidden('not_yours_to_change', 'You cannot change: ' + refused.join(', '));
  if (!sent.length) return auth.user;

  const patch: Partial<typeof users.$inferInsert> = {};
  for (const k of sent) (patch as Record<string, unknown>)[k] = body[k];
  // A different semester means a different board exam, so a date the student set by hand no longer applies.
  if (body.semester !== undefined && body.semester !== auth.user.semester && body.examDate === undefined) patch.examDate = null;

  try {
    const [saved] = await db.update(users).set(patch).where(eq(users.id, auth.user.id)).returning();
    return saved!;
  } catch (e) {
    if (body.email && isUnique(e)) throw conflict('email_taken', 'Someone already uses this email');
    throw e;
  }
}

/** A row that would repeat a value the database keeps unique. Postgres reports it as 23505, on every driver. */
export function isUnique(e: unknown): boolean {
  for (let x: unknown = e; x && typeof x === 'object'; x = (x as { cause?: unknown }).cause) {
    if ((x as { code?: unknown }).code === '23505') return true;
  }
  return false;
}
