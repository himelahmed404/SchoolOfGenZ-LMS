import { randomBytes } from 'node:crypto';
import { openEmbedded, openPg, type Opened } from './index.js';

/**
 * A fresh, migrated database for one test file.
 * By default it is the embedded one, in memory. With TEST_DATABASE_URL (as CI sets) it is a new database
 * on that Postgres server, dropped again on close, so the same tests also run on the real thing.
 */
export async function testDb(): Promise<Opened> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    const o = await openEmbedded();
    await o.migrate();
    return o;
  }
  const name = 'test_' + randomBytes(6).toString('hex');
  const { default: pg } = await import('pg');
  const run = async (q: string) => { const c = new pg.Client({ connectionString: url }); await c.connect(); try { await c.query(q); } finally { await c.end(); } };
  await run('CREATE DATABASE ' + name);
  const target = new URL(url);
  target.pathname = '/' + name;
  const o = await openPg(target.toString(), 3);
  await o.migrate();
  return { ...o, close: async () => { await o.close(); await run('DROP DATABASE IF EXISTS ' + name + ' WITH (FORCE)'); } };
}
