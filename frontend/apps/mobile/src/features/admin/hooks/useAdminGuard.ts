// src/features/admin/hooks/useAdminGuard.ts
// SPRINT-41: Admin gate + register 403 leave-admin handler.

import { useEffect } from "react"; // SPRINT-41:
import { Alert } from "react-native"; // SPRINT-41:
import { router } from "expo-router"; // SPRINT-41:
import { useAuthStore } from "../../../store/auth.store"; // SPRINT-41:
import { setAdminForbiddenHandler } from "../api/handleAdminError"; // SPRINT-41:
import { appAlert } from '../../../shared/ui/Dialogs';

export const useAdminGuard = () => {
  const user = useAuthStore((s: any) => s.user);
  const isAuthed = useAuthStore((s: any) => s.isAuthed);

  // SPRINT-41: isAdmin only for role admin | superadmin (backend ADMIN mapping).
  // SPRINT-41: MODERATOR must NOT map to admin anymore (see auth.store profileToAppUser).
  const isAdmin = // SPRINT-41:
    isAuthed && // SPRINT-41:
    user !== null && // SPRINT-41:
    (user.role === "admin" || user.role === "superadmin"); // SPRINT-41:

  useEffect(() => {
    if (!isAuthed) {
      router.replace("/(auth)/login");
    } else if (!isAdmin) {
      router.replace("/(tabs)/feed");
    }
  }, [isAuthed, isAdmin]);

  // SPRINT-41: On mount, register forbidden handler — Alert + leave admin to feed.
  useEffect(() => { // SPRINT-41:
    setAdminForbiddenHandler(() => { // SPRINT-41:
      appAlert( // SPRINT-41:
        "Access denied", // SPRINT-41:
        "You no longer have admin access. Returning to the feed.", // SPRINT-41:
      ); // SPRINT-41:
      router.replace("/(tabs)/feed"); // SPRINT-41:
    }); // SPRINT-41:
    return () => { // SPRINT-41:
      setAdminForbiddenHandler(() => {}); // SPRINT-41:
    }; // SPRINT-41:
  }, []); // SPRINT-41:

  return { isAdmin, user };
};
