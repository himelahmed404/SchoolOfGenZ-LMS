import { sql } from 'drizzle-orm';
import type { Tx } from '../db/index.js';
import { rateLimits } from '../db/schema.js';
import { tooMany } from './errors.js';

/**
 * Count one use of `key` and refuse it once more than `max` have happened in the current window.
 * The count lives in the database: on Vercel the server has no memory between requests, and there can be several copies of it.
 *
 * `key` names what is being limited and for whom, for example `signin:phone:01712345678` or `code:ip:203.0.113.7`.
 */
export async function limit(db: Tx, key: string, max: number, windowSec: number, now = new Date()): Promise<void> {
  const start = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);
  const [row] = await db.insert(rateLimits).values({ key, windowStart: start, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  if (row && row.count > max) throw tooMany(Math.max(1, Math.ceil((start.getTime() + windowSec * 1000 - now.getTime()) / 1000)));
}

/** Old windows are of no use. A timed job calls this. */
export async function forgetOldLimits(db: Tx, olderThan = new Date(Date.now() - 24 * 3600 * 1000)): Promise<void> {
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < ${olderThan}`);
}
