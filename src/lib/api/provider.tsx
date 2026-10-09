'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ApiFailure } from './client';

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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
