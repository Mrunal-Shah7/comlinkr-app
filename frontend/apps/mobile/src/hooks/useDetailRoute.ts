// src/hooks/useDetailRoute.ts
//
// Helpers for the detail routes (plan 03): /listing/[id], /roommate/[id], /room/[id], /restaurant/[id],
// /events/[id]. A detail opened from a list shows the list's cached row at once and refreshes it from the
// by-id endpoint; a detail opened from a link fetches by id.

import { useLocalSearchParams, router } from "expo-router";
import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** The `[id]` segment of the current route, trimmed. */
export function useIdParam(): string {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return typeof id === "string" ? id.trim() : Array.isArray(id) ? String(id[0] ?? "").trim() : "";
}

/** Back to the screen that opened the detail; from a cold link, to Explore. */
export function closeDetail() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)/feed" as never);
}

type Row = Record<string, unknown>;

function search(value: unknown, match: (x: Row) => boolean, depth: number): Row | undefined {
  if (depth > 4 || value == null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const x of value) if (x && typeof x === "object" && !Array.isArray(x) && match(x as Row)) return x as Row;
    for (const x of value) {
      const hit = search(x, match, depth + 1);
      if (hit) return hit;
    }
    return undefined;
  }
  for (const v of Object.values(value as Row)) {
    const hit = search(v, match, depth + 1);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * The first cached row with this id in any query under `prefix` (list pages, plain arrays), skipping
 * queries whose key `keep` rejects. Returns the row and the query's data, for flags kept beside the rows.
 */
export function findCachedRow<T>(
  qc: QueryClient,
  prefix: QueryKey,
  id: string,
  keep: (key: QueryKey) => boolean = () => true,
): { row: T; data: unknown } | undefined {
  if (!id) return undefined;
  for (const q of qc.getQueryCache().findAll({ queryKey: prefix })) {
    if (!keep(q.queryKey) || q.state.data == null) continue;
    const row = search(q.state.data, (x) => x.id === id, 0);
    if (row) return { row: row as T, data: q.state.data };
  }
  return undefined;
}
