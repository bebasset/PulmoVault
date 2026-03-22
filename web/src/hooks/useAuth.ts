import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  hasBiometric: boolean;
  isAuthenticated: boolean;
  setAuth: (token: string, role: string, userId?: string) => void;
  clearAuth: () => void;
  setBiometric: (has: boolean) => void;
}

// Simple in-memory auth store (no localStorage for PHI compliance)
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  userId: null,
  hasBiometric: false,
  isAuthenticated: false,
  setAuth: (token, role, userId) =>
    set({ token, role, userId: userId ?? null, isAuthenticated: true }),
  clearAuth: () =>
    set({ token: null, role: null, userId: null, hasBiometric: false, isAuthenticated: false }),
  setBiometric: (has) => set({ hasBiometric: has }),
}));
