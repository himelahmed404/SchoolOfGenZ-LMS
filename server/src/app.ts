import express, { Router } from 'express';
import helmet from 'helmet';
import type { Db } from './db/index.js';
import { errorHandler, noRoute } from './http/errors.js';
import { requestLog } from './http/log.js';
import { requestId } from './http/requestId.js';
import { healthRoutes } from './modules/health/routes.js';

export interface Deps { db: Db }

/**
 * The whole API as one Express app. It is given what it depends on, so a test can hand it a fresh database.
 * Every path is under /v1. The LMS and the marketing site forward their own /api/* here, so the browser
 * only ever talks to its own site.
 */
export function createApp({ db }: Deps) {
  const app = express();
  app.disable('x-powered-by');
  // Requests arrive through Vercel and the sites' forwarding, so the caller's address is in the forwarded header.
  app.set('trust proxy', true);
  app.use(helmet());
  app.use(requestId);
  app.use(requestLog);
  // Bodies are small JSON. Videos and files go straight to storage and never pass through here.
  app.use(express.json({ limit: '100kb' }));

  const v1 = Router();
  v1.use('/health', healthRoutes(db));
  app.use('/v1', v1);

  app.use(noRoute);
  app.use(errorHandler);
  return app;
}
