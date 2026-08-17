"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  theme: "light" | "dark";
  sidebarCollapsed: boolean;
  aiPanelOpen: boolean;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiPanelOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      sidebarCollapsed: false,
      aiPanelOpen: false,
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),
    }),
    { name: "gecodis-ui" },
  ),
);
