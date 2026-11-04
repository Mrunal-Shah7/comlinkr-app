import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthed, user } = useAuth();
  const location = useLocation();
  
  // If not authenticated at all, redirect to login
  if (!isAuthed) {
    return <Navigate to="/auth/login" replace />;
  }
  
  // If authenticated but onboarding not done and trying to access app routes, redirect to onboarding
  if (!user?.onboardingDone && location.pathname.startsWith("/app")) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}
