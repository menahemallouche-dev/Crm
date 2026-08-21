"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "MANAGER" | "COMMERCIAL" | "LECTURE_SEULE";
  googleLinked?: boolean;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  setSession: (data: { accessToken: string; refreshToken: string; user?: SessionUser }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (data) =>
        set((state) => ({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user ?? state.user,
        })),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: "gecodis-auth" },
  ),
);
