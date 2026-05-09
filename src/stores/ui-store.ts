import { create } from "zustand";

interface UiState {
  sidebarCompact: boolean;
  mobileSidebarOpen: boolean;
  toggleSidebarCompact: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCompact: false,
  mobileSidebarOpen: false,
  toggleSidebarCompact: () => set((s) => ({ sidebarCompact: !s.sidebarCompact })),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
}));
