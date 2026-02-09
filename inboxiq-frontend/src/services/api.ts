import axios, { AxiosInstance } from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Production backend on Render; fallback to localhost for dev
const PROD_URL = "https://inboxiq-lmfv.onrender.com/api";
const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const DEV_URL = `http://${host}:3000/api`;
const API_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEV_URL : PROD_URL);

// ─── Axios Instance ──────────────────────────────────────────────
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally (expired/invalid token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user_data");
      // The auth store listener will redirect to Login
    }
    return Promise.reject(error);
  }
);

// ─── Auth Endpoints ──────────────────────────────────────────────
export const authAPI = {
  getGoogleAuthUrl: () => api.get<{ url: string }>("/auth/google"),

  exchangeCode: (code: string, redirectUri: string) =>
    api.post("/auth/google/exchange", { code, redirect_uri: redirectUri }),

  registerPushToken: (userId: string, pushToken: string) =>
    api.post("/auth/push-token", { userId, pushToken }),
};

// ─── Email Endpoints ─────────────────────────────────────────────
export const emailsAPI = {
  getEmails: (category?: string, limit?: number, filter?: string) =>
    api.get("/emails", { params: { category, limit, filter } }),

  getStats: () => api.get("/emails/stats"),
};

// ─── Digest Endpoints ────────────────────────────────────────────
export const digestsAPI = {
  generate: (frequency: string) =>
    api.post("/digests/generate", { frequency }, { timeout: 120000 }),

  getLatest: () => api.get("/digests/latest"),

  getHistory: (limit?: number) =>
    api.get("/digests/history", { params: { limit } }),

  sendEmail: () =>
    api.post("/digests/send-email", {}, { timeout: 120000 }),
};

// ─── Subscription Endpoints ─────────────────────────────────────
export const subscriptionAPI = {
  getInfo: () => api.get("/subscription"),

  upgrade: (tier: string = "pro") =>
    api.post("/subscription/upgrade", { tier }),
};

// ─── Settings Endpoints ──────────────────────────────────────────
export const settingsAPI = {
  getSchedule: () => api.get("/settings/schedule"),

  updateSchedule: (data: {
    frequency?: string;
    delivery_time?: string;
    is_active?: boolean;
    timezone?: string;
  }) => api.put("/settings/schedule", data),

  getProfile: () => api.get("/settings/profile"),
};

export default api;
