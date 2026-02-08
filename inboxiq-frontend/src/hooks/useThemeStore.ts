import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";
import {
  darkColors,
  lightColors,
  ThemeColors,
  getCategoriesForTheme,
  CategoryDef,
} from "../constants/theme";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  colors: ThemeColors;
  categories: CategoryDef[];
  statusBarStyle: "light" | "dark";

  setMode: (mode: ThemeMode) => Promise<void>;
  loadStoredTheme: () => Promise<void>;
}

const resolveMode = (mode: ThemeMode): "light" | "dark" => {
  if (mode === "system") {
    return Appearance.getColorScheme() || "dark";
  }
  return mode;
};

const getColorsForMode = (resolved: "light" | "dark"): ThemeColors =>
  resolved === "light" ? lightColors : darkColors;

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "dark",
  resolvedMode: "dark",
  colors: darkColors,
  categories: getCategoriesForTheme("dark"),
  statusBarStyle: "light",

  setMode: async (mode) => {
    const resolved = resolveMode(mode);
    await SecureStore.setItemAsync("theme_mode", mode);
    set({
      mode,
      resolvedMode: resolved,
      colors: getColorsForMode(resolved),
      categories: getCategoriesForTheme(resolved),
      statusBarStyle: resolved === "dark" ? "light" : "dark",
    });
  },

  loadStoredTheme: async () => {
    try {
      const stored = await SecureStore.getItemAsync("theme_mode");
      const mode = (stored as ThemeMode) || "dark";
      const resolved = resolveMode(mode);
      set({
        mode,
        resolvedMode: resolved,
        colors: getColorsForMode(resolved),
        categories: getCategoriesForTheme(resolved),
        statusBarStyle: resolved === "dark" ? "light" : "dark",
      });
    } catch {
      // Keep defaults (dark)
    }
  },
}));
