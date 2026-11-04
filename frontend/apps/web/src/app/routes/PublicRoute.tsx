import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthed, user } = useAuth();
  
  // Only redirect if user is authenticated AND user object exists
  // This prevents redirect to onboarding when user is null during logout
  if (isAuthed && user) {
    if (user.onboardingDone) return <Navigate to="/app/feed" replace />;
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}
