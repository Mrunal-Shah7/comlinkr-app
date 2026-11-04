/**
 * User-facing Help & Support API
 *
 * Covers the "Help & Support" screen (/help-support) where users can
 * browse FAQs and submit support tickets to the team.
 *
 * Endpoints:
 *   GET    /support/faqs                    — FAQ list (optionally filtered by category)
 *   GET    /support/faqs/:id                — single FAQ
 *   POST   /support/faqs/:id/helpful        — mark FAQ as helpful / not helpful
 *
 *   GET    /support/tickets                 — current user's tickets
 *   GET    /support/tickets/:id             — single ticket with thread
 *   POST   /support/tickets                 — submit new support ticket
 *   POST   /support/tickets/:id/reply       — add message to existing ticket
 *   PATCH  /support/tickets/:id/close       — close a resolved ticket
 */

import { api } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportCategory =
  | "account"
  | "billing"
  | "listing"
  | "restaurant"
  | "safety"
  | "bug"
  | "feature_request"
  | "other";

export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: SupportCategory;
  helpful: number;
  notHelpful: number;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  from: "user" | "support";
  text: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: SupportCategory;
  status: TicketStatus;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  category: SupportCategory;
  message: string;
  /** Optional: attach a screenshot URL (use media.api.ts to upload first) */
  attachmentUrl?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export function getFAQs(category?: SupportCategory): Promise<FAQ[]> {
  return api.get<FAQ[]>(`/support/faqs${category ? `?category=${category}` : ""}`);
}

export function getFAQ(id: string): Promise<FAQ> {
  return api.get<FAQ>(`/support/faqs/${id}`);
}

export function markFAQHelpful(id: string, helpful: boolean): Promise<void> {
  return api.post(`/support/faqs/${id}/helpful`, { helpful });
}

export function getMyTickets(): Promise<SupportTicket[]> {
  return api.get<SupportTicket[]>("/support/tickets");
}

export function getTicket(id: string): Promise<SupportTicket> {
  return api.get<SupportTicket>(`/support/tickets/${id}`);
}

export function createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  return api.post<SupportTicket>("/support/tickets", payload);
}

export function replyToTicket(id: string, text: string): Promise<TicketMessage> {
  return api.post<TicketMessage>(`/support/tickets/${id}/reply`, { text });
}

export function closeTicket(id: string): Promise<SupportTicket> {
  return api.patch<SupportTicket>(`/support/tickets/${id}/close`);
}
