// src/features/admin/api/useAdminListState.ts
//
// Paged list state for the admin screens, on React Query (TR-013, point 3). The return shape is the one the
// screens were written against (items, meta, isLoading, loadMore, setParams…), so no screen changed.
// - Each list is cached under ['admin', key, params]; changing a filter is a new key, page 1.
// - refresh() refetches the loaded pages; loadMore() fetches the next page while meta.page < meta.totalPages.
// - The screen refetches stale data when it regains focus, and every admin mutation invalidates ['admin'].
import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { AdminPageMeta } from "../../../api/admin.api";
import { useRefetchOnFocus } from "../../../hooks/useRefetchOnFocus";
import { adminQueryFn } from "./adminQuery";

/** Paginated envelope expected from admin list fetchers. */
export interface AdminListFetchResult<T> {
  data: T[];
  meta: AdminPageMeta;
}

export interface UseAdminListStateOptions<T, P extends Record<string, unknown>> {
  /** Names the list in the cache: ['admin', key, params]. */
  key: string;
  /** Fetcher must return { data, meta } after client unwrap. */
  fetchPage: (params: P & { page: number }) => Promise<AdminListFetchResult<T>>;
  /** Initial query params (without page; page is managed here). */
  initialParams?: P;
  /** When false, nothing is fetched. */
  enabled?: boolean;
}

export interface UseAdminListStateResult<T, P extends Record<string, unknown>> {
  items: T[];
  meta: AdminPageMeta | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isEmpty: boolean;
  isError: boolean;
  errorMessage: string | null;
  refresh: () => void;
  loadMore: () => void;
  setParams: (next: Partial<P> | ((prev: P) => P)) => void;
  params: P;
}

const EMPTY_META: AdminPageMeta = { page: 1, limit: 20, total: 0, totalPages: 0 };

export function useAdminListState<T, P extends Record<string, unknown> = Record<string, unknown>>(
  options: UseAdminListStateOptions<T, P>,
): UseAdminListStateResult<T, P> {
  const { key, fetchPage, initialParams, enabled = true } = options;
  const [params, setParamsState] = useState<P>((initialParams ?? {}) as P);
  const [refreshing, setRefreshing] = useState(false);
  const queryKey = useMemo(() => ["admin", key, params] as const, [key, params]);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => adminQueryFn(() => fetchPage({ ...params, page: pageParam } as P & { page: number })),
    initialPageParam: 1,
    getNextPageParam: (last: AdminListFetchResult<T>) => {
      const m = last.meta;
      return m && m.page < m.totalPages ? m.page + 1 : undefined;
    },
    enabled,
  });
  useRefetchOnFocus(queryKey, enabled);

  const pages = query.data?.pages;
  const items = useMemo(() => pages?.flatMap((p) => p.data ?? []) ?? [], [pages]);
  const meta = pages && pages.length ? pages[pages.length - 1].meta ?? EMPTY_META : null;

  const { refetch, fetchNextPage, hasNextPage, isFetching } = query;
  const refresh = useCallback(() => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetching) return;
    void fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  const setParams = useCallback((next: Partial<P> | ((prev: P) => P)) => {
    setParamsState((prev) => (typeof next === "function" ? next(prev) : { ...prev, ...next }));
  }, []);

  const isLoading = (enabled && query.isPending) || refreshing;
  const isError = query.isError;
  const errorMessage = query.error ? query.error.message : null;

  return {
    items,
    meta,
    isLoading,
    isLoadingMore: query.isFetchingNextPage,
    isEmpty: !isLoading && !isError && items.length === 0,
    isError,
    errorMessage,
    refresh,
    loadMore,
    setParams,
    params,
  };
}
