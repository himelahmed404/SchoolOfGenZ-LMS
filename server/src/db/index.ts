import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { env } from '../env.js';
import * as schema from './schema.js';

export { schema };

/** The database as services use it. The same queries run on Postgres (Neon) and on the embedded one. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
/** The database, or a transaction on it. A service takes this so that several can run inside one transaction. */
export type Tx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

export interface Opened {
  db: Db;
  /** Bring the database up to the newest migration. Safe to run again. */
  migrate: () => Promise<void>;
  close: () => Promise<void>;
}

/** The SQL migrations written by `npm run db:generate`. */
export const MIGRATIONS = path.join(import.meta.dirname, '../../drizzle');

/** A real Postgres: Neon in previews and production, a service container in CI. */
export async function openPg(url: string, max = 5): Promise<Opened> {
  const { default: pg } = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  // A few connections are plenty: on Vercel each running copy of the server keeps its own pool, behind Neon's pooler.
  const pool = new pg.Pool({ connectionString: url, max });
  const db = drizzle(pool, { schema });
  return { db: db as unknown as Db, migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }), close: () => pool.end() };
}

/**
 * Postgres running inside this process (PGlite), so development and tests need nothing installed.
 * With a folder the data is kept between runs; without one it lives in memory.
 */
export async function openEmbedded(dir?: string): Promise<Opened> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  if (dir) mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  return { db: db as unknown as Db, migrate: () => migrate(db, { migrationsFolder: MIGRATIONS }), close: () => client.close() };
}

let opened: Promise<Opened> | undefined;

/** The server's one database, opened on first use. */
export function database(): Promise<Opened> {
  opened ??= env.DATABASE_URL ? openPg(env.DATABASE_URL) : openEmbedded(env.NODE_ENV === 'test' ? undefined : path.resolve(env.DATA_DIR));
  return opened;
}
