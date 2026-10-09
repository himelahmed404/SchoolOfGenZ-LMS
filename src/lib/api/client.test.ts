import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiFailure, watchSignedOut } from './client';

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

  it('reports a server error with no code as an internal error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Oops</html>', { status: 500 })));
    await expect(api('/x')).rejects.toMatchObject({ status: 500, code: 'internal' });
  });

  it('says offline when the answer came from in front of the API, not from it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Bad gateway</html>', { status: 502 })));
    await expect(api('/x')).rejects.toMatchObject({ status: 502, code: 'offline' });
    // No API is set up at all: Next answers /api/* itself with its own 404 page.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Not found</html>', { status: 404 })));
    await expect(api('/x')).rejects.toMatchObject({ status: 404, code: 'offline' });
    answer(404, { error: { code: 'no_route', message: '', requestId: 'r-3' } });
    await expect(api('/x')).rejects.toMatchObject({ status: 404, code: 'no_route' });
  });

  it('tells the app when the session has ended, and not when a password was wrong', async () => {
    const ended = vi.fn();
    watchSignedOut(ended);
    answer(401, { error: { code: 'bad_credentials', message: '', requestId: 'r-4' } });
    await expect(api('/auth/signin', { body: {} })).rejects.toMatchObject({ code: 'bad_credentials' });
    expect(ended).not.toHaveBeenCalled();
    answer(401, { error: { code: 'unauthorized', message: '', requestId: 'r-5' } });
    await expect(api('/me/profile')).rejects.toMatchObject({ code: 'unauthorized' });
    expect(ended).toHaveBeenCalledTimes(1);
    watchSignedOut(null);
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
