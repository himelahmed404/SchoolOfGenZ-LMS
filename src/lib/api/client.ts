import type { ErrorBody } from '@contract';

/**
 * A request the API refused, or that never reached it (`offline`, status 0).
 * `code` is what to tell the person, worded by the screen that shows it.
 */
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    /** For a rejected form: the field and what is wrong with it. */
    readonly fields?: Record<string, string>,
    /** Quote this when reporting a problem; it finds the request in the server's log. */
    readonly requestId?: string,
  ) {
    super(code);
  }
}

export interface ApiInit { method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; body?: unknown; signal?: AbortSignal }

/**
 * Call the API. `path` is relative to /api/v1 on this site, which Next forwards to the server (see next.config.ts).
 * Giving a body makes it a POST unless `method` says otherwise.
 */
export async function api<T>(path: string, init: ApiInit = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  let res: Response;
  try {
    res = await fetch('/api/v1' + path, {
      method: init.method || (hasBody ? 'POST' : 'GET'),
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
      signal: init.signal,
    });
  } catch {
    throw new ApiFailure(0, 'offline');
  }
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as ErrorBody | null)?.error;
    throw new ApiFailure(res.status, e?.code || 'internal', e?.fields, e?.requestId);
  }
  return data as T;
}
