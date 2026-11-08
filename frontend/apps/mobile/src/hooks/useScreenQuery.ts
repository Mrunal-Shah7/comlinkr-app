// src/hooks/useScreenQuery.ts
//
// useQuery for a screen's data, plus the pieces every screen used to build by hand: a fallback value while
// loading, a cache setter for optimistic edits (delete a row, flip a status), pull-to-refresh state, and a
// refetch when the screen regains focus.

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useRefetchOnFocus } from './useRefetchOnFocus';

type Options<T> = {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  /** What the screen shows before the first answer. */
  initial: T;
  enabled?: boolean;
  staleTime?: number;
  /** Refetch (if stale) when the screen comes back into focus. Default true. */
  refetchOnFocus?: boolean;
};

export function useScreenQuery<T>({ queryKey, queryFn, initial, enabled = true, staleTime, refetchOnFocus = true }: Options<T>) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey, queryFn, enabled, staleTime });
  const initialRef = useRef(initial);
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;

  useRefetchOnFocus(query.refetch, enabled && refetchOnFocus);

  const setData = useCallback(
    (fn: (prev: T) => T) => qc.setQueryData<T>(keyRef.current, (prev) => fn(prev ?? initialRef.current)),
    [qc],
  );

  const [refreshing, setRefreshing] = useState(false);
  const { refetch } = query;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return {
    data: query.data ?? initial,
    setData,
    /** True only before the first answer (hide empty states while this is true). */
    loading: enabled && query.isPending,
    error: query.error,
    refetch,
    refreshing,
    onRefresh,
  };
}
