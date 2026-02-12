import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User } from "../types";
import { setMemoryToken } from "../services/api";

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewLogin: boolean;

  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  clearNewLogin: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  isNewLogin: false,

  setAuth: async (user, token) => {
    // Fill in missing user data from JWT payload
    const payload = decodeJwtPayload(token);
    const fullUser: User = {
      id: user.id || payload.userId || "",
      email: user.email || payload.email || "",
      name: user.name || "User",
      avatarUrl: user.avatarUrl || "",
    };
    setMemoryToken(token);
    try {
      await SecureStore.setItemAsync("auth_token", token);
      await SecureStore.setItemAsync("user_data", JSON.stringify(fullUser));
    } catch (e) {
      // SecureStore can fail on simulators — continue with in-memory auth
      console.warn("SecureStore write failed:", e);
    }
    set({ user: fullUser, token, isAuthenticated: true, isLoading: false, isNewLogin: true });
  },

  logout: async () => {
    setMemoryToken(null);
    try {
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user_data");
    } catch {
      // SecureStore unavailable — ignore
    }
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, isNewLogin: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const userData = await SecureStore.getItemAsync("user_data");

      if (token && userData) {
        const user: User = JSON.parse(userData);
        set({ user, token, isAuthenticated: true, isLoading: false, isNewLogin: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearNewLogin: () => set({ isNewLogin: false }),
}));
