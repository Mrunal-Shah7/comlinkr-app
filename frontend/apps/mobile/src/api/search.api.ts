/**
 * Search API
 *
 * Global search across all content types: listings, restaurants,
 * events, community posts/questions, users, and news.
 *
 * Endpoints:
 *   GET  /search                     — unified search across all types
 *   GET  /search/listings            — search housing listings only
 *   GET  /search/restaurants         — search restaurants only
 *   GET  /search/events              — search events only
 *   GET  /search/community           — search community posts + questions
 *   GET  /search/users               — search user profiles
 *   GET  /search/news                — search news articles
 *   GET  /search/suggestions         — autocomplete suggestions
 *   GET  /search/recent              — user's recent searches
 *   DELETE /search/recent            — clear recent searches
 *   DELETE /search/recent/:query     — remove one recent search
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SearchContentType =
  | "listing"
  | "restaurant"
  | "event"
  | "post"
  | "question"
  | "user"
  | "news";

export interface SearchResult {
  id: string;
  type: SearchContentType;
  title: string;
  subtitle?: string;
  image?: string;
  tags?: string[];
  city?: string;
  score: number;         // relevance score from backend
  createdAt: string;
  /** Type-specific metadata (price for listings, rating for restaurants, etc.) */
  meta?: Record<string, unknown>;
}

export interface UnifiedSearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
  /** Per-type counts */
  counts: Partial<Record<SearchContentType, number>>;
}

export interface SearchQueryParams {
  q: string;
  page?: number;
  pageSize?: number;
  city?: string;
  types?: SearchContentType[];   // filter to specific types
}

export interface SearchSuggestion {
  text: string;
  type: "query" | "user" | "location" | "tag";
}

export interface RecentSearch {
  query: string;
  searchedAt: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

function toQs(params: object): string {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((item) => [k, String(item)]) : [[k, String(v)]]
      )
  ).toString();
  return qs ? `?${qs}` : "";
}

export function search(params: SearchQueryParams): Promise<UnifiedSearchResponse> {
  return api.get<UnifiedSearchResponse>(`/search${toQs(params)}`);
}

export function searchListings(q: string, params: { page?: number; city?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/listings${toQs({ q, ...params })}`);
}

export function searchRestaurants(q: string, params: { page?: number; city?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/restaurants${toQs({ q, ...params })}`);
}

export function searchEvents(q: string, params: { page?: number; city?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/events${toQs({ q, ...params })}`);
}

export function searchCommunity(q: string, params: { page?: number; city?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/community${toQs({ q, ...params })}`);
}

export function searchUsers(q: string, params: { page?: number; city?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/users${toQs({ q, ...params })}`);
}

export function searchNews(q: string, params: { page?: number; country?: string } = {}): Promise<{ data: SearchResult[]; total: number }> {
  return api.get(`/search/news${toQs({ q, ...params })}`);
}

export function getSearchSuggestions(q: string, city?: string): Promise<SearchSuggestion[]> {
  return api.get<SearchSuggestion[]>(`/search/suggestions${toQs({ q, city })}`);
}

export function getRecentSearches(): Promise<RecentSearch[]> {
  return api.get<RecentSearch[]>("/search/recent");
}

export function clearRecentSearches(): Promise<void> {
  return api.delete("/search/recent");
}

export function removeRecentSearch(query: string): Promise<void> {
  return api.delete(`/search/recent/${encodeURIComponent(query)}`);
}
