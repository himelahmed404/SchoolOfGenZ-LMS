import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from './app.js';
import { ErrorBody, Health } from './contract/index.js';
import type { Opened } from './db/index.js';
import { testDb } from './db/testing.js';
import { ApiError, conflict, errorHandler } from './http/errors.js';
import { requestId } from './http/requestId.js';
import { parse } from './http/validate.js';

let o: Opened;
beforeAll(async () => { o = await testDb(); });
afterAll(async () => { await o.close(); });

describe('health', () => {
  it('says the server is up and can reach its database', async () => {
    const res = await request(createApp({ db: o.db })).get('/v1/health');
    expect(res.status).toBe(200);
    expect(Health.parse(res.body)).toMatchObject({ ok: true, db: true });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('answers 503 when the database does not', async () => {
    const broken = { execute: async () => { throw new Error('down'); } } as unknown as Opened['db'];
    const res = await request(createApp({ db: broken })).get('/v1/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ ok: false, db: false });
  });
});

describe('every response', () => {
  it('carries a request id, and keeps one the platform already gave', async () => {
    const app = createApp({ db: o.db });
    const made = await request(app).get('/v1/health');
    expect(made.headers['x-request-id']).toMatch(/^[\w-]{20,}$/);
    const kept = await request(app).get('/v1/health').set('x-vercel-id', 'sin1::abcd-1700000000000-0123456789ab');
    expect(kept.headers['x-request-id']).toBe('sin1::abcd-1700000000000-0123456789ab');
  });

  it('does not say what it is built with', async () => {
    const res = await request(createApp({ db: o.db })).get('/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('errors', () => {
  /** An app with routes that fail in each way, behind the real error handler. */
  function failing() {
    const app = express();
    app.use(requestId);
    app.use(express.json({ limit: '1kb' }));
    app.get('/known', () => { throw conflict('trx_taken', 'This TrxID was used before'); });
    app.get('/bug', async () => { throw new Error('secret detail from deep inside'); });
    app.post('/body', (req, res) => { res.json(parse(z.object({ phone: z.string().length(11), amount: z.number().int().positive() }), req.body)); });
    app.use(errorHandler);
    return app;
  }

  it('reports a known failure by its code', async () => {
    const res = await request(failing()).get('/known');
    expect(res.status).toBe(409);
    expect(ErrorBody.parse(res.body).error).toMatchObject({ code: 'trx_taken', message: 'This TrxID was used before' });
    expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
  });

  it('hides what went wrong inside when the failure is a bug', async () => {
    const res = await request(failing()).get('/bug');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal');
    expect(JSON.stringify(res.body)).not.toContain('secret detail');
  });

  it('names each field of a body that does not fit, and passes one that does', async () => {
    const bad = await request(failing()).post('/body').send({ phone: '017', amount: -5, extra: 'x' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('invalid_input');
    expect(Object.keys(bad.body.error.fields).sort()).toEqual(['amount', 'phone']);
    const ok = await request(failing()).post('/body').send({ phone: '01712345678', amount: 2500, extra: 'x' });
    expect(ok.body).toEqual({ phone: '01712345678', amount: 2500 });
  });

  it('refuses a body that is not JSON or is too large, without a stack trace', async () => {
    const broken = await request(failing()).post('/body').set('Content-Type', 'application/json').send('{"phone":');
    expect(broken.status).toBe(400);
    expect(broken.body.error.code).toBe('invalid_json');
    const huge = await request(failing()).post('/body').send({ phone: 'x'.repeat(5000) });
    expect(huge.status).toBe(400);
    expect(huge.body.error.code).toBe('body_too_large');
  });

  it('answers an unknown path with the same error shape', async () => {
    const res = await request(createApp({ db: o.db })).get('/v1/nothing-here');
    expect(res.status).toBe(404);
    expect(ErrorBody.parse(res.body).error.code).toBe('no_route');
  });

  it('keeps a failure a plain object', () => {
    const e = new ApiError(403, 'forbidden');
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('forbidden');
  });
});
