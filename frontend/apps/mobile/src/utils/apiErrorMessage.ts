// src/utils/apiErrorMessage.ts
// Turns an API failure into a specific, user-friendly toast message instead of a bare
// "Bad Request" / "Validation failed" from the backend.
import { ApiError } from "../api/client";

const GENERIC = /^(bad request|validation failed|validation error|invalid (input|request|data)|api_error|error|request failed)\.?$/i;

function humanizeField(name: string): string {
  const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_.]/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Pulls human-readable lines out of the many shapes a validation `details` payload can take. */
function detailLines(details: unknown): string[] {
  if (!details) return [];
  if (typeof details === "string") return [details];
  if (Array.isArray(details)) return details.flatMap(detailLines);
  if (typeof details === "object") {
    const d = details as Record<string, unknown>;
    const field = typeof d.field === "string" ? d.field : typeof d.path === "string" ? d.path : undefined;
    const msg = typeof d.message === "string" ? d.message : undefined;
    if (msg) {
      // Backend messages already naming the field (e.g. "phoneNumber must be ...") are used as-is.
      return [field && !msg.toLowerCase().includes(field.toLowerCase()) ? `${humanizeField(field)}: ${msg}` : msg];
    }
    if (d.constraints && typeof d.constraints === "object") {
      return Object.values(d.constraints as Record<string, unknown>).filter((v): v is string => typeof v === "string");
    }
    // { fieldName: "message" | ["message"] }
    return Object.entries(d).flatMap(([k, v]) => {
      const lines = detailLines(v);
      return lines.map((l) => (l.toLowerCase().includes(k.toLowerCase()) ? l : `${humanizeField(k)}: ${l}`));
    });
  }
  return [];
}

export function apiErrorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof ApiError) {
    const lines = detailLines(e.details);
    if (lines.length > 0) return lines.slice(0, 2).join("\n");
    const msg = (e.message ?? "").trim();
    if (msg && !GENERIC.test(msg)) return msg;
    switch (e.status) {
      case 400:
      case 422: return "Some of the details you entered are not valid. Please check them and try again.";
      case 401: return "Your session has expired. Please sign in again.";
      case 403: return "You don't have permission to do that.";
      case 404: return "We couldn't find what you were looking for.";
      case 409: return "This already exists. Please use a different value.";
      case 413: return "That file is too large.";
      case 429: return "Too many attempts. Please wait a moment and try again.";
      default:  return e.status >= 500 ? "Our server had a problem. Please try again shortly." : fallback;
    }
  }
  if (e instanceof Error && /network request failed|failed to fetch|timeout/i.test(e.message)) {
    return "We couldn't reach the server. Please check your connection and try again.";
  }
  return e instanceof Error && e.message ? e.message : fallback;
}
