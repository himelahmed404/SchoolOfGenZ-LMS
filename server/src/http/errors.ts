import type { NextFunction, Request, Response } from 'express';
import { log, pathOf } from './log.js';

/**
 * Every failure the API reports. Clients show `code` in their own words (the LMS in Bangla);
 * `message` is for a developer reading the response.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message?: string,
    /** For a rejected body: the field and what is wrong with it. */
    readonly fields?: Record<string, string>,
  ) {
    super(message || code);
  }
}

export const badRequest = (code: string, message?: string, fields?: Record<string, string>) => new ApiError(400, code, message, fields);
export const unauthorized = (code = 'unauthorized', message?: string) => new ApiError(401, code, message);
export const forbidden = (code = 'forbidden', message?: string) => new ApiError(403, code, message);
export const notFound = (code = 'not_found', message?: string) => new ApiError(404, code, message);
export const conflict = (code: string, message?: string) => new ApiError(409, code, message);
export const tooMany = (retryAfterSec: number) => Object.assign(new ApiError(429, 'rate_limited', 'Too many requests'), { retryAfterSec });

export interface ErrorBody { error: { code: string; message: string; fields?: Record<string, string>; requestId: string } }

/** A path nothing answers. */
export function noRoute(req: Request, _res: Response, next: NextFunction) {
  next(notFound('no_route', 'No route for ' + req.method + ' ' + req.path));
}

/**
 * The one place an error becomes a response. Anything that is not an ApiError is a bug:
 * it is logged in full and the client is told only that something went wrong.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  let e: ApiError;
  if (err instanceof ApiError) e = err;
  else if (isBodyError(err)) e = badRequest(err.type === 'entity.too.large' ? 'body_too_large' : 'invalid_json', 'The request body could not be read');
  else {
    log.error({ msg: 'unhandled', id: req.id, path: pathOf(req), err: err instanceof Error ? err.stack || err.message : String(err) });
    e = new ApiError(500, 'internal', 'Something went wrong');
  }
  const retry = (e as { retryAfterSec?: number }).retryAfterSec;
  if (retry) res.setHeader('Retry-After', String(retry));
  const body: ErrorBody = { error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}), requestId: req.id } };
  res.status(e.status).json(body);
}

/** What `express.json()` raises for a body it cannot parse or that is too large. */
function isBodyError(err: unknown): err is { type: string } {
  return typeof err === 'object' && err !== null && typeof (err as { type?: unknown }).type === 'string' && String((err as { type: string }).type).startsWith('entity.');
}
