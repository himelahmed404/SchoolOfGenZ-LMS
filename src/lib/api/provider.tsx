'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { ApiFailure, watchSignedOut } from './client';
import { ME_KEY } from './session';

/**
 * Holds what was fetched from the API, so two screens asking for the same thing share one request,
 * and a tab that comes back into view checks whether anything changed.
 */
export function ApiProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Try again only when the request never arrived. A refusal will be refused again.
        retry: (count, err) => err instanceof ApiFailure && err.status === 0 && count < 2,
      },
      mutations: { retry: false },
    },
  }));
  useEffect(() => {
    // The API said the session has ended (signed out somewhere else, suspended, expired): forget the person here too,
    // and the screen they are on sends them to sign in.
    watchSignedOut(() => client.setQueryData(ME_KEY, null));
    return () => watchSignedOut(null);
  }, [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
