'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { redirectFor } from '@/lib/api/session';
import { useStore } from '@/lib/store';

/**
 * Keeps a screen for the people it is for. A signed-out visitor goes to sign in and comes back afterwards;
 * someone signed in as another kind of person goes to their own start. Returns true once the screen may be shown.
 * The API refuses the data either way: this only saves the person from an empty page.
 */
export function useGuard(): boolean {
  const { me, ready, left } = useStore();
  const path = usePathname();
  const router = useRouter();
  const stay = ready && !redirectFor(me, path, left);

  useEffect(() => {
    if (!ready) return;
    // A signed-out visitor returns to the exact address, so the query string goes along.
    const to = redirectFor(me, me ? path : path + window.location.search, left);
    if (to) router.replace(to);
  }, [ready, me, left, path, router]);

  return stay;
}
