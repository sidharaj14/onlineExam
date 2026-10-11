import { create } from "zustand";
import type { UserProfile } from "../types/auth.types";
import { authService } from "../services/authService";

const DEFAULT_STUDENT_USER: UserProfile = {
  id: "student-demo-01",
  email: "student@example.com",
  full_name: "Alex Student",
  role: "student",
  is_active: true,
  is_verified: true,
  avatar_url: null,
  student_profile: {
    student_id_number: "CS2026-042",
    department: "Computer Science & Engineering",
    academic_year: 3,
  },
};

const DEFAULT_ADMIN_USER: UserProfile = {
  id: "admin-demo-01",
  email: "admin@example.com",
  full_name: "Dr. Sarah Vance",
  role: "admin",
  is_active: true,
  is_verified: true,
  avatar_url: null,
  admin_profile: {
    employee_code: "ADM-904",
    admin_level: "Chief Proctor",
  },
};

interface AuthState {
  user: UserProfile;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: UserProfile) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  // Test helper method to seed demo session
  loginAsDemo: (role: "student" | "admin") => void;
}

const getInitialUser = (): UserProfile => {
  const saved = localStorage.getItem("user_profile");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return DEFAULT_STUDENT_USER;
};

const getInitialToken = (): string | null => {
  return localStorage.getItem("access_token") || null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!localStorage.getItem("access_token") || true, // default active session for demo convenience
  isLoading: false,

  setAuth: (token: string, user: UserProfile) => {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user_profile", JSON.stringify(user));
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  loginAsDemo: (role: "student" | "admin") => {
    const demoUser = role === "admin" ? DEFAULT_ADMIN_USER : DEFAULT_STUDENT_USER;
    const demoToken = `demo-${role}-jwt-token`;
    localStorage.setItem("access_token", demoToken);
    localStorage.setItem("user_profile", JSON.stringify(demoUser));
    set({ token: demoToken, user: demoUser, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_profile");
    set({ token: null, user: DEFAULT_STUDENT_USER, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    if (token.startsWith("demo-")) {
      set({ isAuthenticated: true, isLoading: false });
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      // If token expired, clear session
      set({ isAuthenticated: false, isLoading: false });
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_profile");
    }
  },
}));
