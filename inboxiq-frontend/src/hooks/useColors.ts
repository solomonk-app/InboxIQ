import { useThemeStore } from "./useThemeStore";
import { ThemeColors } from "../constants/theme";

export const useColors = (): ThemeColors => useThemeStore((s) => s.colors);
