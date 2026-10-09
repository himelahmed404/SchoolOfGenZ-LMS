/* `npm run db:migrate`: bring the database up to date. On Vercel this runs in the build, before the new code goes live. */
import path from 'node:path';
import { env } from '../env.js';
import { openEmbedded, openPg } from './index.js';

// Migrations want a direct connection: a pooler can hand each statement to a different one.
const url = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
const o = url ? await openPg(url, 1) : await openEmbedded(path.resolve(env.DATA_DIR));
await o.migrate();
await o.close();
console.log('Database is up to date (' + (url ? 'Postgres' : 'embedded, ' + env.DATA_DIR) + ').');
