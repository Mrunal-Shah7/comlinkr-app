/**
 * Community API
 *
 * Endpoints:
 *   GET    /community/posts                    — community feed
 *   POST   /community/posts                    — create community post
 *   GET    /community/posts/:id                — single community post
 *   DELETE /community/posts/:id                — delete post
 *   POST   /community/posts/:id/like           — toggle like
 *   POST   /community/posts/:id/comments       — add comment
 *   GET    /community/posts/:id/comments       — list comments
 *   POST   /community/posts/:id/report         — report post
 *   GET    /community/members                  — members in city
 *   GET    /community/members/:id              — member profile
 *   POST   /community/members/:id/follow       — follow/unfollow
 *   POST   /community/members/:id/report       — report member
 *   GET    /community/polls                    — active polls
 *   POST   /community/polls/:id/vote           — vote on poll
 */

import { api } from "./client";
import type { PaginatedResponse } from "./feed.api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommunityAuthor {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  badges: string[];
  verified: boolean;
  city?: string;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  content: string;
  image?: string;
  tags: string[];
  likes: number;
  likedByMe: boolean;
  comments: number;
  category?: string;
  createdAt: string;
}

export interface CommunityMember {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  city?: string;
  badges: string[];
  verified: boolean;
  followers: number;
  followingMe: boolean;
  followedByMe: boolean;
  joinedAt: string;
}

export interface Poll {
  id: string;
  question: string;
  /** e.g. HOUSING, FOOD, TRANSIT — shown on Would You Rather cards */
  category?: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
  myVote?: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateCommunityPostPayload {
  content: string;
  image?: string;
  tags?: string[];
  category?: string;
}

export interface MembersQueryParams {
  page?: number;
  pageSize?: number;
  city?: string;
  search?: string;
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

export function getCommunityFeed(params: { page?: number; pageSize?: number; city?: string; category?: string } = {}): Promise<PaginatedResponse<CommunityPost>> {
  return api.get<PaginatedResponse<CommunityPost>>(`/community/posts${toQs(params)}`);
}

export function getCommunityPost(id: string): Promise<CommunityPost> {
  return api.get<CommunityPost>(`/community/posts/${id}`);
}

export function createCommunityPost(payload: CreateCommunityPostPayload): Promise<CommunityPost> {
  return api.post<CommunityPost>("/community/posts", payload);
}

export function deleteCommunityPost(id: string): Promise<void> {
  return api.delete(`/community/posts/${id}`);
}

export function toggleCommunityLike(id: string): Promise<{ liked: boolean; likes: number }> {
  return api.post(`/community/posts/${id}/like`);
}

export function addCommunityComment(postId: string, text: string): Promise<{ id: string; text: string; createdAt: string }> {
  return api.post(`/community/posts/${postId}/comments`, { text });
}

export function getCommunityComments(postId: string): Promise<{ id: string; author: CommunityAuthor; text: string; createdAt: string }[]> {
  return api.get(`/community/posts/${postId}/comments`);
}

export function reportCommunityPost(id: string, reason: string): Promise<void> {
  return api.post(`/community/posts/${id}/report`, { reason });
}

export function getMembers(params: MembersQueryParams = {}): Promise<PaginatedResponse<CommunityMember>> {
  return api.get<PaginatedResponse<CommunityMember>>(`/community/members${toQs(params)}`);
}

export function getMember(id: string): Promise<CommunityMember> {
  return api.get<CommunityMember>(`/community/members/${id}`);
}

export function toggleFollow(id: string): Promise<{ following: boolean }> {
  return api.post(`/community/members/${id}/follow`);
}

export function reportMember(id: string, reason: string): Promise<void> {
  return api.post(`/community/members/${id}/report`, { reason });
}

export function getPolls(city?: string): Promise<Poll[]> {
  return api.get<Poll[]>(`/community/polls${city ? `?city=${encodeURIComponent(city)}` : ""}`);
}

export function votePoll(pollId: string, optionId: string): Promise<Poll> {
  return api.post<Poll>(`/community/polls/${pollId}/vote`, { optionId });
}
