// SPRINT-41: Map admin ApiError statuses to human messages + 403 leave-admin callback.
import { Alert } from "react-native"; // SPRINT-41:
import { ApiError } from "../../../api/client"; // SPRINT-41:
import type { AdminErrorBody } from "../../../api/admin.api"; // SPRINT-41:
import { appAlert } from '../../../shared/ui/Dialogs';

let adminForbiddenHandler: (() => void) | null = null; // SPRINT-41:

/** // SPRINT-41: Register callback when a 403 hits an admin API (e.g. leave admin UI). */
export function setAdminForbiddenHandler(fn: () => void): void { // SPRINT-41:
  adminForbiddenHandler = fn; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Return a user-facing message; invoke leave-admin on 403. */
export function handleAdminApiError(err: unknown): string { // SPRINT-41:
  if (!(err instanceof ApiError)) { // SPRINT-41:
    return err instanceof Error ? err.message : "Something went wrong. Please try again."; // SPRINT-41:
  } // SPRINT-41:

  // SPRINT-41: 401 is already handled by the API client (session expiry redirect).
  if (err.status === 401) { // SPRINT-41:
    return err.message || "Your session has expired. Please sign in again."; // SPRINT-41:
  } // SPRINT-41:

  if (err.status === 403) { // SPRINT-41:
    adminForbiddenHandler?.(); // SPRINT-41:
    return err.message || "You do not have permission to perform this admin action."; // SPRINT-41:
  } // SPRINT-41:

  if (err.status === 400) { // SPRINT-41:
    const details = err.details as AdminErrorBody["details"] | undefined; // SPRINT-41:
    if (Array.isArray(details) && details.length > 0) { // SPRINT-41:
      return details.map((d) => d.message).filter(Boolean).join("\n") || err.message; // SPRINT-41:
    } // SPRINT-41:
    return err.message || "Invalid request. Check your input and try again."; // SPRINT-41:
  } // SPRINT-41:

  if (err.status === 404) { // SPRINT-41:
    return err.message || "The requested resource was not found."; // SPRINT-41:
  } // SPRINT-41:

  if (err.status === 409) { // SPRINT-41:
    return err.message || "This action conflicts with the current state."; // SPRINT-41:
  } // SPRINT-41:

  if (err.status >= 500) { // SPRINT-41:
    return err.message || "A server error occurred. Please try again later."; // SPRINT-41:
  } // SPRINT-41:

  return err.message || "Something went wrong. Please try again."; // SPRINT-41:
} // SPRINT-41:

/** // SPRINT-41: Convenience — Alert the mapped message (optional for screens). */
export function alertAdminApiError(err: unknown, title = "Error"): void { // SPRINT-41:
  appAlert(title, handleAdminApiError(err)); // SPRINT-41:
} // SPRINT-41:
