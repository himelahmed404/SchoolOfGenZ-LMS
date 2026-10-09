/* What Vercel runs: it looks for a default-exported Express app in src/index.ts. Locally, src/dev.ts listens on a port. */
import { createApp } from './app.js';
import { database } from './db/index.js';

const { db } = await database();

export default createApp({ db });
