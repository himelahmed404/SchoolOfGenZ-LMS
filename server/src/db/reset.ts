/* `npm run db:reset`: throw the embedded development database away and start again from the demo data. */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { env } from '../env.js';

if (env.DATABASE_URL) throw new Error('db:reset only clears the embedded development database. DATABASE_URL is set, so nothing was touched.');
rmSync(path.resolve(env.DATA_DIR), { recursive: true, force: true });
const { database } = await import('./index.js');
const { seed } = await import('./seed.js');
const o = await database();
await o.migrate();
await seed(o.db);
await o.close();
console.log('Embedded database rebuilt from the demo data (' + env.DATA_DIR + ').');
