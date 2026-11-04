import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

/**
 * AdminRoute – protects admin-only routes.
 * 
 * Currently checks the `role` field on the user profile.
 * 
 * BACKEND TEAM: Replace the role check with your actual
 * authorization logic (e.g., JWT claims, /api/me endpoint, 
 * or a permissions array). The `role` field on UserProfile
 * should be set from the backend response during login.
 */
export default function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthed, user } = useAuth();

  if (!isAuthed) {
    return <Navigate to="/auth/login" replace />;
  }

  if (user?.role !== "admin") {
    // Non-admin users get redirected back to the app
    return <Navigate to="/app/feed" replace />;
  }

  return <>{children}</>;
}
