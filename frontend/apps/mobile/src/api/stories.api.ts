/**
 * Stories API — multipart create, list, view, save, my stories, saved list
 */

import { api, postFormData } from "./client";
import { queryClient } from "../services/cache/queryClient";

/** Explore caches the story rings for minutes: a story added or removed must show at once. */
function storiesChanged(): void {
  void queryClient.invalidateQueries({ queryKey: ["feed", "stories"] });
}

export type StoryMediaTypeApi = "REEL" | "PHOTO" | "VIDEO";
export type StoryCategoryApi = "EVENTS" | "FOOD" | "HOUSING" | "CULTURE" | "LOCAL_NEWS" | "GENERAL";

/** Shape returned by Nest `StoriesService.formatStory` (list + create + view). */
export interface ApiStory {
  id: string;
  title: string;
  mediaType: string;
  category: string;
  details?: string | null;
  hashtags: string[];
  durationSeconds?: number | null;
  location?: string | null;
  mediaUrl?: string | null;
  viewsCount: number;
  commentCount?: number;
  likeCount?: number;
  likedByMe?: boolean;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  isSaved: boolean;
  author: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
}

export type CreatedStory = ApiStory;

export interface ApiSavedStory extends ApiStory {
  savedAt: string;
}

export type StoryAuthorGroup = {
  author: ApiStory["author"];
  stories: ApiStory[];
};

/** Group flat API list (same author contiguous, yours first) into author rings + viewer groups. */
export function buildStoryAuthorGroups(
  stories: ApiStory[],
  currentUserId: string | undefined,
): StoryAuthorGroup[] {
  const uid = currentUserId ?? "";
  const groups: StoryAuthorGroup[] = [];
  for (const s of stories) {
    const last = groups[groups.length - 1];
    if (last && last.author.id === s.author.id) {
      last.stories.push(s);
    } else {
      groups.push({ author: { ...s.author }, stories: [s] });
    }
  }
  if (!uid) return groups;
  const mineIdx = groups.findIndex((g) => g.author.id === uid);
  if (mineIdx > 0) {
    const [mine] = groups.splice(mineIdx, 1);
    groups.unshift(mine);
  }
  return groups;
}

export interface CreateStoryPayload {
  /** Optional (design D: photo or video first). */
  title?: string;
  mediaType: StoryMediaTypeApi;
  /** Optional; the server stores GENERAL. */
  category?: StoryCategoryApi;
  details?: string;
  hashtags?: string[];
  durationSeconds?: number;
  location?: string;
  /** First image or video from the picker */
  media?: { uri: string; name?: string; type?: string };
}

function guessMime(uri: string, fallback: string): string {
  const u = uri.toLowerCase();
  if (u.includes(".png")) return "image/png";
  if (u.includes(".webp")) return "image/webp";
  if (u.includes(".webm")) return "video/webm";
  if (u.includes(".mp4")) return "video/mp4";
  return fallback;
}

export function getActiveStories(city?: string): Promise<ApiStory[]> {
  const qs = city?.trim() ? `?city=${encodeURIComponent(city.trim())}` : "";
  return api.get<ApiStory[]>(`/stories${qs}`);
}

export function getMyStories(): Promise<ApiStory[]> {
  return api.get<ApiStory[]>("/stories/me");
}

export function getStory(id: string): Promise<ApiStory> {
  return api.get<ApiStory>(`/stories/${id}`);
}

export function toggleStorySave(id: string): Promise<{ saved: boolean; isSaved: boolean }> {
  return api.post<{ saved: boolean; isSaved: boolean }>(`/stories/${id}/save`);
}

export async function createStory(payload: CreateStoryPayload): Promise<CreatedStory> {
  const fd = new FormData();
  if (payload.title) fd.append("title", payload.title);
  fd.append("mediaType", payload.mediaType);
  if (payload.category) fd.append("category", payload.category);
  if (payload.details) fd.append("details", payload.details);
  if (payload.hashtags?.length) {
    fd.append("hashtags", JSON.stringify(payload.hashtags));
  }
  if (payload.durationSeconds != null) {
    fd.append("durationSeconds", String(payload.durationSeconds));
  }
  if (payload.location) fd.append("location", payload.location);
  if (payload.media) {
    const name =
      payload.media.name ||
      (payload.mediaType === "PHOTO" ? "story.jpg" : "story.mp4");
    const type =
      payload.media.type ||
      guessMime(payload.media.uri, payload.mediaType === "PHOTO" ? "image/jpeg" : "video/mp4");
    fd.append("media", { uri: payload.media.uri, name, type } as any);
  }
  const created = await postFormData<CreatedStory>("/stories", fd);
  storiesChanged();
  return created;
}

export interface StoryComment {
  id: string;
  storyId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface PaginatedStoryComments {
  data: StoryComment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function addStoryComment(storyId: string, content: string): Promise<StoryComment> {
  return api.post<StoryComment>(`/stories/${storyId}/comments`, { content });
}

export function getStoryComments(
  storyId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<PaginatedStoryComments> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("limit", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return api.get<PaginatedStoryComments>(`/stories/${storyId}/comments${suffix}`, { public: true });
}

export function deleteStoryComment(storyId: string, commentId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/stories/${storyId}/comments/${commentId}`);
}

export interface StoryLikeStatus {
  likeCount: number;
  likedByMe: boolean;
}

export function toggleStoryLike(
  storyId: string
): Promise<{ liked: boolean; likeCount: number }> {
  return api.post<{ liked: boolean; likeCount: number }>(
    `/stories/${storyId}/like`,
    {}
  );
}

export function getStoryLikeStatus(storyId: string): Promise<StoryLikeStatus> {
  return api.get<StoryLikeStatus>(`/stories/${storyId}/like`);
}

/** Delete your own story (removed for everyone; media deleted on server). */
export async function deleteStory(storyId: string): Promise<{ deleted: boolean }> {
  const res = await api.delete<{ deleted: boolean }>(`/stories/${storyId}`);
  storiesChanged();
  return res;
}
