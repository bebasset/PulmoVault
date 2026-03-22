import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, role: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  isAuthenticated: false,
  setAuth: (token, role) => set({ token, role, isAuthenticated: true }),
  clearAuth: () => set({ token: null, role: null, isAuthenticated: false }),
}));
