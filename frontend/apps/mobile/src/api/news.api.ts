/**
 * News API
 *
 * The feed screen fetches real news via a backend RSS proxy (Google News RSS).
 * The backend fetches the RSS, enriches with og:image + og:description, caches,
 * and returns structured JSON — avoiding CORS issues on device.
 *
 * Endpoints:
 *   GET  /news                  — paginated news articles (uses user's country by default)
 *   GET  /news/categories       — available news categories for the user's country
 *   GET  /news/trending         — top trending stories across all categories
 *   POST /news/articles/:id/save       — save article to favorites
 *   DELETE /news/articles/:id/save     — unsave article
 *   POST /news/articles/:id/share      — log a share event (for trending analytics)
 *
 * Country codes accepted (from app's locationData):
 *   US, GB, CA, AU, IN, DE, FR, JP, BR, MX, ES, IT, NL, KR, NG, ZA, AE, SG, NZ, IE, PK, BD, PH, KE
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NewsCategory =
  | "all"
  | "local"
  | "national"
  | "world"
  | "business"
  | "technology"
  | "health"
  | "sports"
  | "entertainment"
  | "science"
  | "politics";

export interface NewsArticle {
  id: string;
  title: string;
  description?: string;
  url: string;
  image?: string;
  source: string;
  sourceDomain?: string;
  category: NewsCategory;
  country: string;
  publishedAt: string;
  savedByMe: boolean;
}

export interface NewsQueryParams {
  page?: number;
  pageSize?: number;
  category?: NewsCategory;
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB", "IN" */
  country?: string;
  /** City name — backend will try to fetch localised content */
  city?: string;
  search?: string;
}

export interface PaginatedNews {
  data: NewsArticle[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  /** ISO timestamp of when the RSS was last fetched by the backend */
  cachedAt: string;
}

export interface NewsCategory_Info {
  id: NewsCategory;
  label: string;
  available: boolean;
}

// ─── API calls ────────────────────────────────────────────────────────────────

function toQs(params: object): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return qs ? `?${qs}` : "";
}

export function getNews(params: NewsQueryParams = {}): Promise<PaginatedNews> {
  return api.get<PaginatedNews>(`/news${toQs(params)}`);
}

/** Live Explore tab — server-side RSS aggregation (`GET /news/explore`) */
export interface NewsExploreArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
  category: string;
}

export interface NewsExploreResponse {
  data: NewsExploreArticle[];
  cachedAt: string;
  total: number;
  phase?: string;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export function getNewsExplore(params: {
  city: string;
  country: string;
  state?: string; // SPRINT-30
  phase?: "primary" | "full";
  page?: number;
  pageSize?: number;
  force?: boolean;
}): Promise<NewsExploreResponse> {
  const qs = new URLSearchParams();
  if (params.city?.trim()) qs.set("city", params.city.trim());
  if (params.country?.trim()) qs.set("country", params.country.trim());
  if (params.state?.trim()) qs.set("state", params.state.trim()); // SPRINT-30
  if (params.phase) qs.set("phase", params.phase);
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("pageSize", String(params.pageSize));
  if (params.force === true) qs.set("force", "true");
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get<NewsExploreResponse>(`/news/explore${suffix}`);
}

export function getNewsCategories(country?: string): Promise<NewsCategory_Info[]> {
  return api.get<NewsCategory_Info[]>(`/news/categories${country ? `?country=${country}` : ""}`);
}

export function getTrendingNews(country?: string): Promise<NewsArticle[]> {
  return api.get<NewsArticle[]>(`/news/trending${country ? `?country=${country}` : ""}`);
}

// SPRINT-30: toggle save with article metadata (replaces empty-body save/unsave)
export function saveNewsArticle(
  articleId: string,
  payload: {
    title: string;
    url: string;
    imageUrl?: string;
    source?: string;
    publishedAt?: string;
  },
): Promise<{ saved: boolean }> {
  return api.post<{ saved: boolean }>(`/news/articles/${articleId}/save`, payload);
}

export function getSavedNewsArticles(params: { page?: number; pageSize?: number } = {}): Promise<{
  data: Array<{
    id: string;
    articleId: string;
    title: string;
    url: string;
    imageUrl: string | null;
    source: string | null;
    publishedAt: string | null;
    savedAt: string;
  }>;
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("limit", String(Math.min(Number(params.pageSize), 50)));
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get(`/news/articles/saved${suffix}`);
}

/** @deprecated SPRINT-30 — use saveNewsArticle toggle instead */
export function saveArticle(id: string): Promise<void> {
  return api.post(`/news/articles/${id}/save`);
}

/** @deprecated SPRINT-30 — use saveNewsArticle toggle instead */
export function unsaveArticle(id: string): Promise<void> {
  return api.delete(`/news/articles/${id}/save`);
}

export function logArticleShare(id: string): Promise<void> {
  return api.post(`/news/articles/${id}/share`);
}

export interface NewsArticleStats {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean; // SPRINT-30
}

export interface NewsArticleComment {
  id: string;
  articleId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface PaginatedNewsComments {
  data: NewsArticleComment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** GET /news/articles/:id: one article from the live cache or a saved copy (TR-017); 404 once it is gone. */
export function getNewsArticle(articleId: string): Promise<{
  id: string;
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: string;
  publishedAt: string;
  category: string;
}> {
  return api.get(`/news/articles/${encodeURIComponent(articleId)}`);
}

export function getArticleStats(articleId: string): Promise<NewsArticleStats> {
  return api.get<NewsArticleStats>(`/news/articles/${articleId}/stats`);
}

/**
 * SPRINT-58: stats for many articles in one request.
 * Replaces the per-card `getArticleStats` fan-out that fired 20 requests every time the
 * article list changed identity (primary load, full load, description enrichment, paging).
 */
export function getArticleStatsBatch(
  ids: string[]
): Promise<{ data: Record<string, NewsArticleStats> }> {
  return api.post<{ data: Record<string, NewsArticleStats> }>(`/news/articles/stats`, {
    ids,
  });
}

export function toggleArticleLike(
  articleId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return api.post<{ liked: boolean; likeCount: number }>(
    `/news/articles/${articleId}/like`,
    {}
  );
}

export function getArticleComments(
  articleId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<PaginatedNewsComments> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("limit", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs}` : "";
  return api.get<PaginatedNewsComments>(`/news/articles/${articleId}/comments${suffix}`);
}

export function addArticleComment(
  articleId: string,
  content: string
): Promise<NewsArticleComment> {
  return api.post<NewsArticleComment>(`/news/articles/${articleId}/comments`, {
    content,
  });
}
