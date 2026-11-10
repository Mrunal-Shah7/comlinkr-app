/**
 * Feed API — Nest `/api/feed/*` (+ `GET /users/me/posts` for “my posts”).
 *
 * Creating posts with media requires `multipart/form-data` (see `FeedController`);
 * `createPost` sends a minimal JSON shape for text-only posts (may still require tuning).
 */

import { api, postFormData } from "./client";

/** Turn `/api/files/...` from the API into an absolute URL for `<Image source={{ uri }} />`. */
export function resolveApiAssetUrl(pathOrUrl: string | null | undefined): string {
  if (pathOrUrl == null || pathOrUrl === "") return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const base = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "");
  const origin = base.endsWith("/api") ? base.slice(0, -4) : base;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${origin}${path}`;
}

export type FeedCategory = "COMMUNITY" | "ANNOUNCEMENT" | "JOBS" | "ALERT" | "DISCUSSION" | "QUESTION" | "TIP";
// Backward-compatible alias (older code expected `PostType` from this module).
export type PostType = FeedCategory;

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  /** SPRINT-57: true when the author holds at least one approved badge. */
  verified: boolean;
  /** SPRINT-57: the granted badge types behind `verified` (e.g. LANDLORD). */
  badges: string[];
}

export interface PostMedia {
  id: string;
  url: string;
  order: number;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  category: FeedCategory | string;
  tags: string[];

  location: string | null;
  sourceLabel: string | null;

  likesCount: number;
  commentsCount: number;
  savesCount: number;

  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null; // SPRINT-42: expose the dedicated user-edit timestamp.
  isEdited: boolean; // SPRINT-42: use the backend-derived edit marker.

  author: PostAuthor;
  media: PostMedia[];

  isLiked: boolean;
  isSaved: boolean;
  isOwner: boolean;
}

/** `GET /users/me/posts` — unified feed, events, stories, challenges, listings, polls, etc. */
export type UnifiedMyPostType = "NEWS" | "EVENT" | "STORY" | "CHALLENGE" | "LISTING" | "HOUSING" | "COMMUNITY" | "FOOD" | "POLL" | "QUESTION" | "ANNOUNCEMENT" | "JOBS";

export interface UnifiedMyPost {
  id: string;
  type: UnifiedMyPostType;
  title: string;
  content: string;
  category: string;
  status: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
  isEdited?: boolean; // SPRINT-42: preserve the backend edit marker through the unified my-posts boundary.
  isOwner?: boolean; // SPRINT-42: expose backend ownership where the unified endpoint supplies it.
}

export interface Comment {
  id: string;
  author: PostAuthor;
  /** API field (`CreateComment` / list responses) */
  content: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface CreatePostPayload {
  category: FeedCategory;
  title: string;
  content: string;
  image?: string;
  tags?: string[];
  location?: string;
  sourceLabel?: string;
}

export type UpdatePostPayload = Partial<Pick<CreatePostPayload, "title" | "content" | "category" | "tags" | "location" | "sourceLabel">>; // SPRINT-42: explicitly limit PATCH to the six editable fields.

type PostUpdateListener = (post: Post) => void; // SPRINT-42: notify visible screens without persisting stale data.
const postUpdateListeners = new Set<PostUpdateListener>(); // SPRINT-42: keep updates memory-only for the current app process.
const latestPostUpdates = new Map<string, Post>(); // SPRINT-42: bridge navigation focus races after a successful edit.

export function subscribeToPostUpdates(listener: PostUpdateListener): () => void { // SPRINT-42: shared lightweight post-edit subscription.
  postUpdateListeners.add(listener); // SPRINT-42: register the mounted rendering boundary.
  return () => postUpdateListeners.delete(listener); // SPRINT-42: avoid retaining unmounted screens.
} // SPRINT-42: end post update subscription helper.

export function getLatestPostUpdate(id: string): Post | undefined { // SPRINT-42: allow focus handlers to consume the latest in-memory patch.
  return latestPostUpdates.get(id); // SPRINT-42: never read from persisted storage.
} // SPRINT-42: end latest update accessor.

function publishPostUpdate(post: Post): void { // SPRINT-42: fan successful PATCH responses into current UI state.
  latestPostUpdates.set(post.id, post); // SPRINT-42: retain only the current process response.
  postUpdateListeners.forEach((listener) => listener(post)); // SPRINT-42: patch every mounted feed boundary immediately.
} // SPRINT-42: end update publisher.

/** Local image picked from the gallery (React Native `FormData` file part). */
export type FeedMediaAsset = { uri: string; name?: string; mediaType: "photo" | "video" };

function guessImageMime(uri: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

export interface FeedQueryParams {
  page?: number;
  pageSize?: number; // alias for backend PaginationDto.limit
  category?: FeedCategory;
  trending?: boolean;
  city?: string;
}

export type NeighborhoodMood = "GREAT" | "EXCITING" | "CHILL" | "MEH" | "NOISY";

export interface NeighborhoodMoodBreakdown {
  mood: NeighborhoodMood;
  count: number;
  percentage: number;
}

export interface NeighborhoodMoodSummary {
  city: string | null;
  totalVotes: number;
  myMood: NeighborhoodMood | null;
  moods: NeighborhoodMoodBreakdown[];
}

function toPaged<T>(raw: unknown): PaginatedResponse<T> {
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
  return {
    data: Array.isArray(o) ? (o as T[]) : [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  };
}

function feedQs(params: FeedQueryParams): string {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  if (params.category != null) e.set("category", params.category);
  if (params.trending != null) e.set("trending", params.trending ? "true" : "false");
  if (params.city?.trim()) e.set("city", params.city.trim());
  const qs = e.toString();
  return qs ? `?${qs}` : "";
}

export async function getFeed(params: FeedQueryParams = {}): Promise<PaginatedResponse<Post>> {
  const raw = await api.get<unknown>(`/feed${feedQs(params)}`);
  return toPaged<Post>(raw);
}

function normalizeMyPost(raw: unknown): UnifiedMyPost {
  const p = raw as Record<string, any>;
  // Backend may return Post shape (category field) or UnifiedMyPost shape (type field).
  // Normalise to always have type + metadata.
  const rawType: string = p.type ?? p.category ?? "NEWS";
  const type = rawType.toUpperCase() as UnifiedMyPostType;
  return {
    id: String(p.id ?? ""),
    type,
    title: String(p.title ?? p.name ?? "Untitled"),
    content: String(p.content ?? p.description ?? ""),
    category: String(p.category ?? p.type ?? "General"),
    status: p.status ?? (p.isPublished === false ? "DRAFT" : null),
    createdAt: p.createdAt ?? new Date().toISOString(),
    isEdited: p.isEdited === true ? true : p.isEdited === false ? false : (p.editedAt != null ? true : undefined), // SPRINT-42: preserve real edit fields when the unified projection supplies them; never fabricate.
    isOwner: typeof p.isOwner === "boolean" ? p.isOwner : undefined, // SPRINT-42: preserve ownership when present without inventing it.
    metadata: p.metadata != null && typeof p.metadata === "object"
      ? p.metadata as Record<string, unknown>
      : {
          likesCount:    p.likesCount    ?? p.likes    ?? 0,
          commentsCount: p.commentsCount ?? p.comments ?? 0,
          savesCount:    p.savesCount    ?? p.saves    ?? 0,
          answersCount:  p.answersCount  ?? p.commentsCount ?? 0,
          viewsCount:    p.viewsCount    ?? p.views    ?? 0,
          attendeeCount: p.attendeeCount ?? p.attendees ?? 0,
          votesCount:    p.votesCount    ?? p.votes    ?? 0,
          mediaType:     p.mediaType     ?? null,
          date:          p.date          ?? p.startDate ?? null,
          venue:         p.venue         ?? p.location ?? null,
          price:         p.price         ?? null,
          beds:          p.beds          ?? p.bedrooms ?? null,
          city:          p.city          ?? null,
          cuisine:       p.cuisine       ?? null,
          rating:        p.rating        ?? null,
        },
  };
}

export async function getMyPosts(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<UnifiedMyPost>> {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<unknown>(`/users/me/posts${qs}`);
  const paged = toPaged<unknown>(raw);
  return { ...paged, data: paged.data.map(normalizeMyPost) };
}

export function getPost(id: string): Promise<Post> {
  return api.get<Post>(`/feed/${id}`);
}

/**
 * Create a feed post (`POST /feed` multipart). Backend accepts up to 6 images (JPEG/PNG/WebP);
 * video attachments are skipped (use Stories for video).
 */
export async function createPost(
  payload: CreatePostPayload & { mediaAssets?: FeedMediaAsset[] }
): Promise<Post> {
  const fd = new FormData();
  fd.append("title", payload.title);
  fd.append("content", payload.content);
  fd.append("category", payload.category);
  if (payload.tags?.length) fd.append("tags", payload.tags.join(","));
  if (payload.location) fd.append("location", payload.location);
  if (payload.sourceLabel) fd.append("sourceLabel", payload.sourceLabel);
  let n = 0;
  for (const m of payload.mediaAssets ?? []) {
    if (m.mediaType === "video") continue;
    if (n >= 6) break;
    const name = m.name || `upload_${n + 1}.jpg`;
    fd.append("media", { uri: m.uri, name, type: guessImageMime(m.uri) } as any);
    n += 1;
  }
  return postFormData<Post>("/feed", fd);
}

export async function updatePost(id: string, payload: UpdatePostPayload): Promise<Post> { // SPRINT-42: send only caller-present editable fields.
  const body: UpdatePostPayload = { // SPRINT-42: build a dirty-field-only request body.
    ...(payload.title !== undefined ? { title: payload.title } : {}), // SPRINT-42: preserve an explicitly supplied title.
    ...(payload.content !== undefined ? { content: payload.content } : {}), // SPRINT-42: preserve explicitly supplied content.
    ...(payload.category !== undefined ? { category: payload.category } : {}), // SPRINT-42: support category editing.
    ...(payload.tags !== undefined ? { tags: payload.tags } : {}), // SPRINT-42: support clearing or replacing tags.
    ...(payload.location !== undefined ? { location: payload.location } : {}), // SPRINT-42: support clearing or replacing location.
    ...(payload.sourceLabel !== undefined ? { sourceLabel: payload.sourceLabel } : {}), // SPRINT-42: support clearing or replacing source label.
  }; // SPRINT-42: finish present-field payload.
  const updated = await api.patch<Post>(`/feed/${id}`, body as Record<string, unknown>); // SPRINT-42: PATCH the authoritative backend route.
  publishPostUpdate(updated); // SPRINT-42: update mounted UI immediately after success.
  return updated; // SPRINT-42: return the standard post response to the editor.
}

export function deletePost(id: string): Promise<void> {
  return api.delete(`/feed/${id}`);
}

export function toggleLike(id: string): Promise<{ liked: boolean; likesCount: number }> {
  return api.post(`/feed/${id}/like`);
}

export function toggleSave(id: string): Promise<{ saved: boolean; savesCount: number }> {
  return api.post(`/feed/${id}/save`);
}

export async function getComments(postId: string, params: { page?: number; pageSize?: number } = {}): Promise<Comment[]> {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  const qs = e.toString() ? `?${e.toString()}` : "";
  const raw = await api.get<unknown>(`/feed/${postId}/comments${qs}`);
  const p = toPaged<Comment>(raw);
  return p.data;
}

export function addComment(postId: string, text: string): Promise<Comment> {
  return api.post<Comment>(`/feed/${postId}/comment`, { content: text });
}

export async function getTrending(_city?: string): Promise<Post[]> {
  const raw = await api.get<unknown>(`/feed?trending=true&limit=20`);
  return toPaged<Post>(raw).data;
}

export function getSavedPosts(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Post>> {
  const e = new URLSearchParams();
  if (params.page != null) e.set("page", String(params.page));
  if (params.pageSize != null) e.set("limit", String(params.pageSize));
  const qs = e.toString() ? `?${e.toString()}` : "";
  return api.get<unknown>(`/feed/saved${qs}`).then((raw) => toPaged<Post>(raw));
}

export function getNeighborhoodMood(city?: string): Promise<NeighborhoodMoodSummary> {
  const qs = city?.trim() ? `?city=${encodeURIComponent(city.trim())}` : "";
  return api.get<NeighborhoodMoodSummary>(`/feed/mood${qs}`);
}

export function voteNeighborhoodMood(payload: { mood: NeighborhoodMood; city?: string }): Promise<NeighborhoodMoodSummary> {
  return api.post<NeighborhoodMoodSummary>("/feed/mood", payload);
}

/** Plan 16 (TR-050): one row of the Following tab. */
export interface FollowingItem {
  id: string;
  type: "NEWS" | "EVENT" | "STORY" | "CHALLENGE";
  title: string;
  createdAt: string;
  image: string | null;
  author: { id: string; name: string; username: string; avatar: string | null };
  metadata: Record<string, unknown>;
}

/** Plan 16: what the people you follow posted, newest first. */
export async function getFollowingFeed(page = 1, limit = 20): Promise<{ items: FollowingItem[]; hasMore: boolean }> {
  const raw = await api.get<any>(`/feed/following?page=${page}&limit=${limit}`);
  const items: FollowingItem[] = Array.isArray(raw?.data) ? raw.data : [];
  const meta = raw?.meta;
  const hasMore = meta ? Number(meta.page) < Number(meta.totalPages) : Boolean(raw?.hasMore);
  return { items, hasMore };
}
