/* `npm run dev`: the server on a local port. With no DATABASE_URL it uses the embedded database, migrated on start. */
import { database } from './db/index.js';
import { env } from './env.js';
import { seedIfEmpty } from './db/seed.js';
import app from './index.js';

const { db, migrate } = await database();
if (!env.DATABASE_URL) {
  await migrate();
  await seedIfEmpty(db);
}

app.listen(env.PORT, () => {
  console.log('API on http://localhost:' + env.PORT + '/v1  ·  database: ' + (env.DATABASE_URL ? 'Postgres' : 'embedded (' + env.DATA_DIR + ')'));
});
