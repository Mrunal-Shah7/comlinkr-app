import { api } from "./client";
import type { PaginatedResponse } from "./feed.api";

export type SaveCountsResponse = {
  counts: {
    news: number;
    events: number;
    listings: number;
    food: number;
    community: number;
    stories: number;
    roommates: number;
  };
};

export type SaveTypeQuery =
  | "news"
  | "events"
  | "listings"
  | "food"
  | "community"
  | "stories"
  | "roommates";

/** `GET /saves` with no `type` — aggregate counts only. */
export async function getSaveCounts(): Promise<SaveCountsResponse> {
  return api.get<SaveCountsResponse>("/saves");
}

/** `GET /saves?type=…&page=&limit=` — typed saved list (shape includes `savedItemType` + `savedAt`). */
export async function getSavesByType<T = unknown>(
  type: SaveTypeQuery,
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResponse<T>> {
  const e = new URLSearchParams();
  e.set("type", type);
  if (params.page != null) e.set("page", String(params.page));
  if (params.limit != null) e.set("limit", String(params.limit));
  const raw = await api.get<unknown>(`/saves?${e.toString()}`);
  const o = raw as {
    data?: T[];
    meta?: { page: number; limit: number; total: number; totalPages: number };
  };
  if (o?.meta) {
    return {
      data: (o.data ?? []) as T[],
      page: o.meta.page,
      pageSize: o.meta.limit,
      total: o.meta.total,
      hasMore: o.meta.page < o.meta.totalPages,
    };
  }
  return { data: [], page: 1, pageSize: 20, total: 0, hasMore: false };
}

export function totalSaveCount(c: SaveCountsResponse["counts"]): number {
  return (
    c.news +
    c.events +
    c.listings +
    c.food +
    c.community +
    c.stories +
    c.roommates
  );
}
