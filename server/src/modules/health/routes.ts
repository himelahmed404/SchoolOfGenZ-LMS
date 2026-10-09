import { sql } from 'drizzle-orm';
import { Router } from 'express';
import type { Health } from '../../contract/index.js';
import type { Db } from '../../db/index.js';

/** Whether the server is up and can reach its database. Open to anyone; it says nothing else. */
export function healthRoutes(db: Db) {
  const r = Router();
  r.get('/', async (_req, res) => {
    let ok = true;
    try { await db.execute(sql`select 1`); } catch { ok = false; }
    const body: Health = { ok, db: ok, at: new Date().toISOString() };
    res.setHeader('Cache-Control', 'no-store');
    res.status(ok ? 200 : 503).json(body);
  });
  return r;
}
