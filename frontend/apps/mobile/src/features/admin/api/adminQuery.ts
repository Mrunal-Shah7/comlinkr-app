// src/features/admin/api/adminQuery.ts — shared pieces for the admin screens' React Query hooks (TR-013, point 3).
import { handleAdminApiError } from "./handleAdminError";

/** An admin request failure with the message the screens show; keeps the HTTP status for the retry rule. */
export class AdminQueryError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Runs an admin fetch and turns a failure into an AdminQueryError carrying the user-facing message.
 * handleAdminApiError also leaves the admin area on a 403, as before.
 */
export async function adminQueryFn<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const status = (err as { status?: number } | null)?.status;
    throw new AdminQueryError(handleAdminApiError(err), status);
  }
}
