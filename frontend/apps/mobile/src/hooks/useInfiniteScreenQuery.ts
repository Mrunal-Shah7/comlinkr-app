// src/hooks/useInfiniteScreenQuery.ts
//
// useInfiniteQuery for a paged list, shaped like the hand-written state it replaces: a flat `items` array,
// `setItems` for optimistic edits, `loadMore`, pull-to-refresh and a refetch when the screen regains focus.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query';
import { useRefetchOnFocus } from './useRefetchOnFocus';

export type Page<T> = { items: T[]; hasMore: boolean };

type Options<T> = {
  queryKey: QueryKey;
  /** Pages start at 1. */
  fetchPage: (page: number) => Promise<Page<T>>;
  enabled?: boolean;
  staleTime?: number;
  refetchOnFocus?: boolean;
};

export function useInfiniteScreenQuery<T>({ queryKey, fetchPage, enabled = true, staleTime, refetchOnFocus = true }: Options<T>) {
  const qc = useQueryClient();
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last: Page<T>, _all, lastParam: number) => (last.hasMore ? lastParam + 1 : undefined),
    enabled,
    staleTime,
  });
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;

  useRefetchOnFocus(query.refetch, enabled && refetchOnFocus);

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);

  /** Applies `fn` to the whole list, then spreads the result back over the loaded pages (page params unchanged). */
  const setItems = useCallback(
    (fn: (prev: T[]) => T[]) =>
      qc.setQueryData<InfiniteData<Page<T>, number>>(keyRef.current, (old) => {
        if (!old) return old;
        const next = fn(old.pages.flatMap((p) => p.items));
        let at = 0;
        const pages = old.pages.map((p, i) => {
          const take = i === old.pages.length - 1 ? next.length - at : Math.min(p.items.length, next.length - at);
          const slice = next.slice(at, at + Math.max(0, take));
          at += slice.length;
          return { ...p, items: slice };
        });
        return { ...old, pages };
      }),
    [qc],
  );

  const [refreshing, setRefreshing] = useState(false);
  const { refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    setItems,
    loading: enabled && query.isPending,
    loadingMore: isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore,
    error: query.error,
    refetch,
    refreshing,
    onRefresh,
  };
}
