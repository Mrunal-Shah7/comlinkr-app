/**
 * Community Q&A API
 *
 * The Community screen uses a Q&A format (not just posts).
 * Users ask questions, others answer; questions & answers can be voted on.
 *
 * Endpoints:
 *   GET    /community/questions                          — paginated questions feed
 *   POST   /community/questions                         — ask a new question
 *   GET    /community/questions/:id                     — single question with answers
 *   DELETE /community/questions/:id                     — delete own question
 *   POST   /community/questions/:id/vote                — upvote / remove vote
 *   POST   /community/questions/:id/bookmark            — toggle bookmark
 *   POST   /community/questions/:id/report              — report question
 *
 *   GET    /community/questions/:id/answers             — list answers for question
 *   POST   /community/questions/:id/answers             — submit an answer
 *   PATCH  /community/questions/:qid/answers/:aid       — edit own answer
 *   DELETE /community/questions/:qid/answers/:aid       — delete own answer
 *   POST   /community/questions/:qid/answers/:aid/vote  — upvote answer
 *   POST   /community/questions/:qid/answers/:aid/report— report answer
 *
 *   GET    /community/bookmarks                         — questions the user bookmarked
 *   GET    /community/topics                            — available topic tags
 */

import { api } from "./client";
import type { PaginatedResponse } from "./feed.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommunityTopic =
  | "All"
  | "Housing"
  | "Food"
  | "Transit"
  | "Events"
  | "Safety"
  | "Pets"
  | "Nightlife"
  | "Jobs"
  | "Health"
  | "Education"
  | "Sports";

export interface QAAuthor {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  verified: boolean;
  badges: string[];
  city?: string;
}

export interface Answer {
  id: string;
  author: QAAuthor;
  text: string;
  votes: number;
  votedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  author: QAAuthor;
  question: string;
  /** Optional longer text; the mobile composer posts title-only questions. */
  body?: string;
  tags: CommunityTopic[];
  votes: number;
  votedByMe: boolean;
  bookmarkedByMe: boolean;
  answersCount: number;
  answers?: Answer[];     // populated in detail view
  city?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionsQueryParams {
  page?: number;
  limit?: number;
  /** Backward-compatible alias; mapped to `limit`. */
  pageSize?: number;
  tag?: CommunityTopic;
  city?: string;
  /** Backend supports `recent` | `trending`. */
  sort?: "recent" | "trending" | "popular" | "unanswered";
  search?: string;
}

function mapTopicToCategory(
  tag?: CommunityTopic
): "HOUSING" | "FOOD" | "TRANSIT" | "EVENTS" | "SAFETY" | "GENERAL" | undefined {
  if (!tag || tag === "All") return undefined;
  switch (tag) {
    case "Housing":
      return "HOUSING";
    case "Food":
      return "FOOD";
    case "Transit":
      return "TRANSIT";
    case "Events":
      return "EVENTS";
    case "Safety":
      return "SAFETY";
    default:
      // Unsupported UI tags (Pets, Nightlife, Jobs, etc.) map to GENERAL.
      return "GENERAL";
  }
}

export interface AskQuestionPayload {
  title: string;
  body?: string;
  category: "HOUSING" | "FOOD" | "TRANSIT" | "EVENTS" | "SAFETY" | "GENERAL";
  tags?: CommunityTopic[];
}

export interface SubmitAnswerPayload {
  content: string;
}

export interface CommunityStats {
  membersCount: number;
  questionsCount: number;
  answersCount: number;
}

function normalizeAuthor(raw: any): QAAuthor {
  return {
    id: String(raw?.id ?? ""),
    name: String(raw?.name ?? raw?.fullName ?? "User"),
    username: String(raw?.username ?? ""),
    avatar: raw?.avatar ?? raw?.avatarUrl ?? undefined,
    verified: Boolean(raw?.verified),
    badges: Array.isArray(raw?.badges) ? raw.badges.map(String) : [],
    city: raw?.city ? String(raw.city) : undefined,
  };
}

function normalizeAnswer(raw: any): Answer {
  return {
    id: String(raw?.id ?? ""),
    author: normalizeAuthor(raw?.author),
    text: String(raw?.text ?? raw?.content ?? ""),
    votes: Number(raw?.votes ?? raw?.upvoteCount ?? 0),
    votedByMe: Boolean(raw?.votedByMe ?? raw?.isUpvoted ?? false),
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw?.updatedAt ?? raw?.createdAt ?? new Date().toISOString()),
  };
}

// ─── Questions ────────────────────────────────────────────────────────────────

export function getQuestions(params: QuestionsQueryParams = {}): Promise<PaginatedResponse<Question>> {
  const backendParams = {
    page: params.page,
    limit: params.limit ?? params.pageSize,
    category: mapTopicToCategory(params.tag),
    city: params.city,
    sort: params.sort === "popular" ? "trending" : params.sort === "unanswered" ? "recent" : params.sort,
    search: params.search,
  };
  const qs = new URLSearchParams(
    Object.entries(backendParams)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();
  return api.get<PaginatedResponse<Question>>(`/community/questions${qs ? `?${qs}` : ""}`);
}

/** DEV-01: backend detail uses title/body/upvoteCount/answerCount/content; map to the Question contract. */
function normalizeQuestion(raw: any): Question {
  const answers = Array.isArray(raw?.answers) ? raw.answers.map(normalizeAnswer) : [];
  return {
    ...raw,
    id: String(raw?.id ?? ""),
    author: normalizeAuthor(raw?.author),
    question: String(raw?.question ?? raw?.title ?? ""),
    body: raw?.body != null ? String(raw.body) : undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    votes: Number(raw?.votes ?? raw?.upvoteCount ?? 0),
    votedByMe: Boolean(raw?.votedByMe ?? raw?.isUpvoted ?? false),
    bookmarkedByMe: Boolean(raw?.bookmarkedByMe ?? raw?.isSaved ?? false),
    answersCount: Math.max(Number(raw?.answersCount ?? raw?.answerCount ?? 0), answers.length),
    answers,
    city: raw?.city ? String(raw.city) : undefined,
    createdAt: String(raw?.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw?.updatedAt ?? raw?.createdAt ?? new Date().toISOString()),
  } as Question;
}

export function getQuestion(id: string): Promise<Question> {
  return api.get<unknown>(`/community/questions/${id}`).then(normalizeQuestion);
}

export function askQuestion(payload: AskQuestionPayload): Promise<Question> {
  return api.post<Question>("/community/questions", payload);
}

export function deleteQuestion(id: string): Promise<void> {
  return api.delete(`/community/questions/${id}`);
}

export function voteQuestion(id: string): Promise<{ upvoted: boolean; upvoteCount: number }> {
  return api.post(`/community/questions/${id}/upvote`);
}

export function bookmarkQuestion(id: string): Promise<{ saved: boolean }> {
  return api.post(`/community/questions/${id}/save`);
}

export function reportQuestion(id: string, reason: string): Promise<void> {
  return api.post(`/community/questions/${id}/report`, { reason });
}

// ─── Answers ─────────────────────────────────────────────────────────────────

export function getAnswers(questionId: string): Promise<Answer[]> {
  return api
    .get<{ answers?: unknown[] }>(`/community/questions/${questionId}`)
    .then((r) => (Array.isArray(r?.answers) ? r.answers.map(normalizeAnswer) : []));
}

export function submitAnswer(questionId: string, payload: SubmitAnswerPayload): Promise<Answer> {
  return api.post<unknown>(`/community/questions/${questionId}/answers`, payload).then(normalizeAnswer);
}

export function updateAnswer(questionId: string, answerId: string, text: string): Promise<Answer> {
  return api
    .patch<unknown>(`/community/questions/${questionId}/answers/${answerId}`, { text })
    .then(normalizeAnswer);
}

export function deleteAnswer(questionId: string, answerId: string): Promise<void> {
  return api.delete(`/community/questions/${questionId}/answers/${answerId}`);
}

export function voteAnswer(questionId: string, answerId: string): Promise<{ upvoted: boolean; upvoteCount: number }> {
  return api.post(`/community/answers/${answerId}/upvote`);
}

export function reportAnswer(questionId: string, answerId: string, reason: string): Promise<void> {
  return api.post(`/community/questions/${questionId}/answers/${answerId}/report`, { reason });
}

// ─── Bookmarks & Topics ───────────────────────────────────────────────────────

export function getBookmarkedQuestions(params: { page?: number; pageSize?: number } = {}): Promise<PaginatedResponse<Question>> {
  const backendParams = { page: params.page, limit: params.pageSize };
  const qs = new URLSearchParams(
    Object.entries(backendParams).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
  ).toString();
  return api.get<PaginatedResponse<Question>>(`/community/bookmarks${qs ? `?${qs}` : ""}`);
}

export function getTopics(): Promise<{ id: CommunityTopic; label: string; count: number }[]> {
  return api.get("/community/topics");
}

export function getCommunityStats(city?: string): Promise<CommunityStats> {
  const qs = city?.trim()
    ? `?city=${encodeURIComponent(city.trim())}`
    : "";
  return api.get<CommunityStats>(`/community/stats${qs}`);
}
