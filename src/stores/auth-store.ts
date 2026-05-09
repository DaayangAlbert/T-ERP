import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
  updateProfile: (patch: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  login: (user, accessToken) => set({ user, accessToken }),
  logout: () => set({ user: null, accessToken: null }),
  updateProfile: (patch) =>
    set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),
}));
