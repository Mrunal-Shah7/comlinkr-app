// SPRINT-41: Reusable list state for admin paginated screens (page/limit or page/pageSize).
import { useCallback, useEffect, useRef, useState } from "react"; // SPRINT-41:
import type { AdminPageMeta } from "../../../api/admin.api"; // SPRINT-41:
import { handleAdminApiError } from "./handleAdminError"; // SPRINT-41:

/** // SPRINT-41: Minimal paginated envelope expected from admin list fetchers */
export interface AdminListFetchResult<T> { // SPRINT-41:
  data: T[]; // SPRINT-41:
  meta: AdminPageMeta; // SPRINT-41:
} // SPRINT-41:

export interface UseAdminListStateOptions<T, P extends Record<string, unknown>> { // SPRINT-41:
  /** // SPRINT-41: Fetcher must return { data, meta } after client unwrap */
  fetchPage: (params: P & { page: number }) => Promise<AdminListFetchResult<T>>; // SPRINT-41:
  /** // SPRINT-41: Initial query params (without page; page is managed internally) */
  initialParams?: P; // SPRINT-41:
  /** // SPRINT-41: When false, skip the first fetch until enabled */
  enabled?: boolean; // SPRINT-41:
} // SPRINT-41:

export interface UseAdminListStateResult<T, P extends Record<string, unknown>> { // SPRINT-41:
  items: T[]; // SPRINT-41:
  meta: AdminPageMeta | null; // SPRINT-41:
  isLoading: boolean; // SPRINT-41:
  isLoadingMore: boolean; // SPRINT-41:
  isEmpty: boolean; // SPRINT-41:
  isError: boolean; // SPRINT-41:
  errorMessage: string | null; // SPRINT-41:
  refresh: () => void; // SPRINT-41:
  loadMore: () => void; // SPRINT-41:
  setParams: (next: Partial<P> | ((prev: P) => P)) => void; // SPRINT-41:
  params: P; // SPRINT-41:
} // SPRINT-41:

const EMPTY_META: AdminPageMeta = { page: 1, limit: 20, total: 0, totalPages: 0 }; // SPRINT-41:

/**
 * // SPRINT-41: Practical list hook with useState/useEffect.
 * // SPRINT-41: - refresh() reloads page 1 and replaces items
 * // SPRINT-41: - loadMore() appends the next page when meta.page < meta.totalPages
 * // SPRINT-41: - setParams() merges filters and resets to page 1
 */
export function useAdminListState<T, P extends Record<string, unknown> = Record<string, unknown>>( // SPRINT-41:
  options: UseAdminListStateOptions<T, P>, // SPRINT-41:
): UseAdminListStateResult<T, P> { // SPRINT-41:
  const { fetchPage, initialParams, enabled = true } = options; // SPRINT-41:
  const [params, setParamsState] = useState<P>((initialParams ?? {}) as P); // SPRINT-41:
  const [items, setItems] = useState<T[]>([]); // SPRINT-41:
  const [meta, setMeta] = useState<AdminPageMeta | null>(null); // SPRINT-41:
  const [isLoading, setIsLoading] = useState(false); // SPRINT-41:
  const [isLoadingMore, setIsLoadingMore] = useState(false); // SPRINT-41:
  const [isError, setIsError] = useState(false); // SPRINT-41:
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // SPRINT-41:
  const [page, setPage] = useState(1); // SPRINT-41:
  const [reloadToken, setReloadToken] = useState(0); // SPRINT-41:
  const fetchRef = useRef(fetchPage); // SPRINT-41:
  fetchRef.current = fetchPage; // SPRINT-41:

  useEffect(() => { // SPRINT-41:
    if (!enabled) return; // SPRINT-41:
    let cancelled = false; // SPRINT-41:
    const loadingMore = page > 1; // SPRINT-41:
    if (loadingMore) setIsLoadingMore(true); // SPRINT-41:
    else setIsLoading(true); // SPRINT-41:
    setIsError(false); // SPRINT-41:
    setErrorMessage(null); // SPRINT-41:

    (async () => { // SPRINT-41:
      try { // SPRINT-41:
        const result = await fetchRef.current({ ...params, page } as P & { page: number }); // SPRINT-41:
        if (cancelled) return; // SPRINT-41:
        setMeta(result.meta ?? EMPTY_META); // SPRINT-41:
        setItems((prev) => (page === 1 ? result.data : [...prev, ...result.data])); // SPRINT-41:
      } catch (err) { // SPRINT-41:
        if (cancelled) return; // SPRINT-41:
        setIsError(true); // SPRINT-41:
        setErrorMessage(handleAdminApiError(err)); // SPRINT-41:
        if (page === 1) setItems([]); // SPRINT-41:
      } finally { // SPRINT-41:
        if (!cancelled) { // SPRINT-41:
          setIsLoading(false); // SPRINT-41:
          setIsLoadingMore(false); // SPRINT-41:
        } // SPRINT-41:
      } // SPRINT-41:
    })(); // SPRINT-41:

    return () => { // SPRINT-41:
      cancelled = true; // SPRINT-41:
    }; // SPRINT-41:
  }, [enabled, params, page, reloadToken]); // SPRINT-41:

  const refresh = useCallback(() => { // SPRINT-41:
    setPage(1); // SPRINT-41:
    setReloadToken((t) => t + 1); // SPRINT-41:
  }, []); // SPRINT-41:

  const loadMore = useCallback(() => { // SPRINT-41:
    if (isLoading || isLoadingMore) return; // SPRINT-41:
    const m = meta; // SPRINT-41:
    if (!m || m.page >= m.totalPages) return; // SPRINT-41:
    setPage((p) => p + 1); // SPRINT-41:
  }, [isLoading, isLoadingMore, meta]); // SPRINT-41:

  const setParams = useCallback((next: Partial<P> | ((prev: P) => P)) => { // SPRINT-41:
    setParamsState((prev) => { // SPRINT-41:
      const merged = typeof next === "function" ? next(prev) : { ...prev, ...next }; // SPRINT-41:
      return merged; // SPRINT-41:
    }); // SPRINT-41:
    setPage(1); // SPRINT-41:
  }, []); // SPRINT-41:

  const isEmpty = !isLoading && !isError && items.length === 0; // SPRINT-41:

  return { // SPRINT-41:
    items, // SPRINT-41:
    meta, // SPRINT-41:
    isLoading, // SPRINT-41:
    isLoadingMore, // SPRINT-41:
    isEmpty, // SPRINT-41:
    isError, // SPRINT-41:
    errorMessage, // SPRINT-41:
    refresh, // SPRINT-41:
    loadMore, // SPRINT-41:
    setParams, // SPRINT-41:
    params, // SPRINT-41:
  }; // SPRINT-41:
} // SPRINT-41:
