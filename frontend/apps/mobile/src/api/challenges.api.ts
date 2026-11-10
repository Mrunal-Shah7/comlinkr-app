/**
 * Challenges API — `POST /challenges`, `GET /challenges`, etc.
 */

import { api } from "./client";

export type ChallengeTypeApi =
  | "PHOTO"
  | "FITNESS"
  | "FOOD"
  | "EXPLORE"
  | "SOCIAL"
  | "CREATIVE"
  | "GREEN"
  | "TRIVIA";

export type ChallengeDurationApi =
  | "ONE_DAY"
  | "THREE_DAYS"
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "ONE_MONTH";

export interface CreateChallengePayload {
  title: string;
  type: ChallengeTypeApi;
  details?: string;
  duration: ChallengeDurationApi;
  goalCondition: string;
  reward: string;
  maxParticipants?: number;
  hashtags?: string[];
  location?: string;
}

export interface CreatedChallenge {
  id: string;
  title: string;
  type: string;
  details?: string | null;
  duration: string;
  goalCondition: string;
  reward: string;
  maxParticipants?: number | null;
  hashtags: string[];
  location?: string | null;
  status: string;
  endsAt: string;
  createdAt: string;
}

export interface ApiChallenge {
  id: string;
  title: string;
  type: ChallengeTypeApi;
  details?: string | null;
  duration: ChallengeDurationApi;
  goalCondition: string;
  reward: string;
  maxParticipants?: number | null;
  hashtags: string[];
  location?: string | null;
  status: string;
  endsAt: string;
  createdAt: string;
  /** How many joined, the author included (the API's name; the app used to read `participantsCount`). */
  participantCount?: number;
  isJoined?: boolean;
  isFull?: boolean;
  author?: { id: string; username: string; name: string; avatarUrl: string | null };
}

/** `GET /challenges/:id`: the quest with the first ten people who joined (plan 10). */
export interface ApiChallengeDetail extends ApiChallenge {
  participants: { id: string; username: string; name: string; avatarUrl: string | null; joinedAt: string }[];
  totalParticipants: number;
}

export interface PaginatedChallenges {
  data: ApiChallenge[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function createChallenge(payload: CreateChallengePayload): Promise<CreatedChallenge> {
  return api.post<CreatedChallenge>("/challenges", payload);
}

export function getChallenges(
  params?: { status?: string; city?: string; page?: number; limit?: number }
): Promise<PaginatedChallenges> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.city) query.set("city", params.city);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();
  return api.get<PaginatedChallenges>(`/challenges${qs ? `?${qs}` : ""}`);
}

export function joinChallenge(id: string): Promise<{ joined: boolean }> {
  return api.post<{ joined: boolean }>(`/challenges/${id}/join`, {});
}

export function getChallenge(id: string): Promise<ApiChallengeDetail> {
  return api.get<ApiChallengeDetail>(`/challenges/${encodeURIComponent(id)}`);
}

/** Plan 10: leave a quest you joined (not the author's own, not an ended one). */
export function leaveChallenge(id: string): Promise<{ joined: boolean; participantCount: number }> {
  return api.delete<{ joined: boolean; participantCount: number }>(`/challenges/${encodeURIComponent(id)}/join`);
}

/** The author deletes their own challenge (My posts). */
export function deleteChallenge(id: string): Promise<void> {
  return api.delete(`/challenges/${id}`);
}
