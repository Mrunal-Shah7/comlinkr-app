import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearToken, getToken, setToken, getProfile, setProfile } from "../../shared/lib/storage";

export type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  handle: string;
  city?: string;
  bio?: string;
  role?: UserRole;
  preferences?: {
    cuisine?: string;
    housing?: string[];
    lifestyle?: string[];
  };
  onboardingDone?: boolean;
};

type AuthContextValue = {
  user: UserProfile | null;
  isAuthed: boolean;
  login: (email: string, password: string) => Promise<{ onboardingDone: boolean }>;
  signup: (name: string, email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const LS_KEY = "comlinkr_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(next: UserProfile | null) {
    setUser(next);
    try {
      if (!next) {
        localStorage.removeItem(LS_KEY);
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(next));
        // Also store user data by email for future logins
        if (next.email) {
          localStorage.setItem(`comlinkr_user_${next.email}`, JSON.stringify(next));
        }
      }
    } catch {}
  }

  const login = async (email: string, password: string): Promise<{ onboardingDone: boolean }> => {
    if (!email || !password) throw new Error("Missing credentials");
    setToken(`token_${Date.now()}`);
    
    // Check if user has an existing profile from previous signup/onboarding
    const existingUser = localStorage.getItem(`comlinkr_user_${email}`);
    const existingProfile = localStorage.getItem(`comlinkr_profile_${email}`);
    
    if (existingUser) {
      // User has logged in before, restore their data
      const userData = JSON.parse(existingUser) as UserProfile;
      // BACKEND TEAM: Replace this with actual role from your API response
      // e.g., const { role } = await api.login(email, password);
      persist({ ...userData, role: userData.role ?? "user" });
      
      // Also restore their profile if it exists
      if (existingProfile) {
        setProfile(JSON.parse(existingProfile));
      }
      
      return { onboardingDone: userData.onboardingDone ?? false };
    } else {
      // New login, create user object
      const profile = getProfile();
      const isOnboardingDone = !!profile;
      // BACKEND TEAM: Set role from your API response instead of hardcoding
      persist({
        id: "u_" + Date.now(),
        name: profile?.name ?? "ComLinkr User",
        email,
        handle: "comlinkr_user",
        city: profile?.city ?? "",
        role: "user",
        onboardingDone: isOnboardingDone,
      });
      
      return { onboardingDone: isOnboardingDone };
    }
  };

  const signup = async (name: string, email: string, password: string, username?: string) => {
    if (!name || !email || !password) throw new Error("Missing fields");
    setToken(`token_${Date.now()}`);
    const handle = username || name.toLowerCase().replace(/\s+/g, "_");
    const newUser = {
      id: "u_" + Date.now(),
      name,
      email,
      handle,
      city: "",
      role: "user" as UserRole,
      onboardingDone: false,
    };
    persist(newUser);
    // Store in registered users list for admin access
    try {
      const stored = localStorage.getItem("comlinkr_all_users");
      const allUsers = stored ? JSON.parse(stored) : [];
      allUsers.push({ ...newUser, joinDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), posts: 0, status: "active" });
      localStorage.setItem("comlinkr_all_users", JSON.stringify(allUsers));
    } catch {}
  };

  const logout = () => {
    clearToken();
    // Clear all comlinkr related storage
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem('comlinkr_profile');
    localStorage.removeItem('comlinkr_token');
    localStorage.removeItem('comlinkr_saved');
    localStorage.removeItem('comlinkr_interested');
    persist(null);
  };

  const updateProfile = (partial: Partial<UserProfile>) => {
    if (!user) return;
    if (partial.city || partial.name) {
      const existingProfile = getProfile();
      const newProfile = {
        name: partial.name ?? existingProfile?.name ?? user.name,
        city: partial.city ?? existingProfile?.city ?? "",
        culture: existingProfile?.culture ?? [],
        interests: existingProfile?.interests ?? [],
      };
      setProfile(newProfile);
      
      // Also save profile per email for future logins
      if (user.email) {
        localStorage.setItem(`comlinkr_profile_${user.email}`, JSON.stringify(newProfile));
      }
    }
    // Update user state with explicit onboardingDone flag
    const updatedUser = { 
      ...user, 
      ...partial, 
      onboardingDone: partial.onboardingDone ?? user.onboardingDone ?? !!getProfile() 
    };
    persist(updatedUser);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthed: !!user && !!getToken(),
      login,
      signup,
      logout,
      updateProfile,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
