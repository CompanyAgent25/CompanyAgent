import { create } from "zustand";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (teamName: string, email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.login(email, password);
    api.setToken(response.token);
    set({ user: response.user, isAuthenticated: true });
  },

  register: async (teamName, email, password, name) => {
    const response = await api.register(teamName, email, password, name);
    api.setToken(response.token);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  initialize: async () => {
    const token = api.getToken();
    if (token) {
      try {
        const user = await api.me();
        set({ user, isAuthenticated: true, isLoading: false });
        return;
      } catch {
        api.setToken(null);
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
    }

    set({ user: null, isAuthenticated: false, isLoading: false });
  },
}));
