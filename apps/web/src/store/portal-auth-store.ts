"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PortalCompany {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface PortalAuthState {
  accessToken: string | null;
  company: PortalCompany | null;
  email: string | null;
  setSession: (data: { accessToken: string; company: PortalCompany; email: string }) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      company: null,
      email: null,
      setSession: (data) => set({ accessToken: data.accessToken, company: data.company, email: data.email }),
      logout: () => set({ accessToken: null, company: null, email: null }),
    }),
    { name: "gecodis-portal-auth" },
  ),
);
