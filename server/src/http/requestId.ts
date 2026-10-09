import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    /** Sent back as `x-request-id` and in every error, so one failed request can be found in the logs. */
    id: string;
  }
}

const SAFE = /^[\w.:-]{8,100}$/;

/** Keep the id the platform gave the request when there is one; otherwise make one. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const given = req.get('x-vercel-id') || req.get('x-request-id') || '';
  req.id = SAFE.test(given) ? given : randomUUID();
  res.setHeader('x-request-id', req.id);
  next();
}
