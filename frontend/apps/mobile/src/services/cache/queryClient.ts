// src/services/cache/queryClient.ts
//
// One React Query client for the app (expo-data-fetching). Server data that a screen shows lives here, keyed by
// `queryKeys` (src/services/cache/queryKeys.ts), not in component state filled from a `useEffect`.

import { AppState, type AppStateStatus } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

// React Native has no window focus: tell React Query when the app comes back to the foreground, so stale queries
// refetch then (the web's `refetchOnWindowFocus`).
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (status: AppStateStatus) => handleFocus(status === 'active'));
  return () => sub.remove();
});

/** The tab lists used to refetch on focus at most every 10 minutes (the old listFetchCache); same window here. */
export const LIST_STALE_MS = 10 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error: any) => {
        // ApiError and HttpApiError carry the HTTP code as `status`; `statusCode` is the raw backend body's name.
        const status = error?.status ?? error?.statusCode;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});
