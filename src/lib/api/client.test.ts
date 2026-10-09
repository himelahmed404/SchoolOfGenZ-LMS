import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiFailure } from './client';

/** Make `fetch` answer once with this status and body, and remember what it was called with. */
function answer(status: number, body: unknown) {
  const fn = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('calling the API', () => {
  it('asks this site, under /api/v1, and sends the cookie', async () => {
    const fetch = answer(200, { ok: true });
    await expect(api('/health')).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0][0]).toBe('/api/v1/health');
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'same-origin' });
  });

  it('posts a body as JSON', async () => {
    const fetch = answer(200, {});
    await api('/me/notes', { body: { text: 'মনে রাখো' } });
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'মনে রাখো' }) });
    await api('/me/notes', { method: 'PUT', body: {} });
    expect(fetch.mock.calls[1][1]!.method).toBe('PUT');
  });

  it('turns a refusal into its code, fields and request id', async () => {
    answer(409, { error: { code: 'trx_taken', message: 'This TrxID was used before', requestId: 'r-1' } });
    await expect(api('/x')).rejects.toMatchObject({ status: 409, code: 'trx_taken', requestId: 'r-1' });
    answer(400, { error: { code: 'invalid_input', message: '', fields: { phone: 'too_small' }, requestId: 'r-2' } });
    const e = await api('/x').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiFailure);
    expect((e as ApiFailure).fields).toEqual({ phone: 'too_small' });
  });

  it('reports a server that answered with something else as an internal error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api('/x')).rejects.toMatchObject({ status: 502, code: 'internal' });
  });

  it('says offline when the request never arrived', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(api('/x')).rejects.toMatchObject({ status: 0, code: 'offline' });
  });

  it('returns nothing for an empty answer', async () => {
    answer(204, undefined);
    await expect(api('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
