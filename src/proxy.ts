import { NextResponse, type NextRequest } from 'next/server';

/** Screens anyone may open without signing in. `src/lib/api/session.ts` keeps the same list. */
const OPEN = ['/signin', '/activate', '/forgot', '/invite'];

/**
 * Sends a visitor with no session cookie straight to sign in, before any page is drawn.
 * It only looks at whether the cookie is there: the API is what checks it, on every request,
 * and the screens send a person on if the session turns out to have ended (`useGuard`).
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  // The API names the cookie `__Host-sgz_session` in production and `sgz_session` in development.
  if (req.cookies.has('__Host-sgz_session') || req.cookies.has('sgz_session')) return NextResponse.next();
  const to = new URL('/signin', req.url);
  if (pathname !== '/') to.searchParams.set('next', pathname + search);
  return NextResponse.redirect(to);
}

// Pages only: not the API (it answers for itself), not Next's own files, not anything with a file extension.
export const config = { matcher: ['/((?!api/|_next/|.*\\..*).*)'] };
