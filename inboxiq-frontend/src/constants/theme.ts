// ─── Dark Palette ───────────────────────────────────────────────
export const darkColors = {
  // Backgrounds
  bg: "#0a0a0f",
  bgCard: "rgba(255,255,255,0.04)",
  bgCardHover: "rgba(255,255,255,0.06)",
  bgElevated: "#0f0f14",
  border: "rgba(255,255,255,0.06)",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "#e5e7eb",
  textTertiary: "#d1d5db",
  textMuted: "#9ca3af",
  textSubtle: "#6b7280",
  textDim: "#4b5563",

  // Brand
  primary: "#818cf8",
  primaryBg: "rgba(129,140,248,0.12)",
  primaryDark: "#4f46e5",

  // Semantic
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  dangerBg: "rgba(239,68,68,0.1)",
  info: "#3b82f6",

  // Extra tokens (previously hardcoded)
  unreadBg: "rgba(129,140,248,0.06)",
  warningBg: "rgba(245,158,11,0.12)",
  actionItemBg: "rgba(239,68,68,0.06)",
  checkmark: "#ffffff",
  switchTrackFalse: "#374151",
  freqOptionActiveBg: "rgba(79,70,229,0.08)",
  modalOverlay: "rgba(0,0,0,0.6)",
  googleButtonBg: "#ffffff",
  googleButtonText: "#1f2937",
  tabBarBorder: "#1e1e2e",
} as const;

// ─── Type ───────────────────────────────────────────────────────
export type ThemeColors = typeof darkColors;

// ─── Light Palette ──────────────────────────────────────────────
export const lightColors: ThemeColors = {
  bg: "#f8f9fa",
  bgCard: "rgba(0,0,0,0.03)",
  bgCardHover: "rgba(0,0,0,0.05)",
  bgElevated: "#ffffff",
  border: "rgba(0,0,0,0.08)",

  textPrimary: "#111827",
  textSecondary: "#1f2937",
  textTertiary: "#374151",
  textMuted: "#6b7280",
  textSubtle: "#9ca3af",
  textDim: "#d1d5db",

  primary: "#6366f1",
  primaryBg: "rgba(99,102,241,0.10)",
  primaryDark: "#4f46e5",

  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  dangerBg: "rgba(220,38,38,0.08)",
  info: "#2563eb",

  unreadBg: "rgba(99,102,241,0.06)",
  warningBg: "rgba(217,119,6,0.10)",
  actionItemBg: "rgba(220,38,38,0.05)",
  checkmark: "#ffffff",
  switchTrackFalse: "#d1d5db",
  freqOptionActiveBg: "rgba(79,70,229,0.06)",
  modalOverlay: "rgba(0,0,0,0.4)",
  googleButtonBg: "#ffffff",
  googleButtonText: "#1f2937",
  tabBarBorder: "rgba(0,0,0,0.06)",
};

// Backward-compatible default (will be removed once all files migrated)
export const Colors = darkColors;

// ─── Category Definitions ────────────────────────────────────────
export interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

const DARK_CATEGORIES: CategoryDef[] = [
  { key: "financial",   label: "Financial",   icon: "💰", color: "#10b981", bg: "#064e3b" },
  { key: "newsletters", label: "Newsletters", icon: "📰", color: "#8b5cf6", bg: "#4c1d95" },
  { key: "personal",    label: "Personal",    icon: "💬", color: "#f59e0b", bg: "#78350f" },
  { key: "work",        label: "Work",        icon: "💼", color: "#3b82f6", bg: "#1e3a5f" },
  { key: "social",      label: "Social",      icon: "👥", color: "#ec4899", bg: "#831843" },
  { key: "promotions",  label: "Promos",      icon: "🏷️", color: "#f97316", bg: "#7c2d12" },
];

const LIGHT_CATEGORIES: CategoryDef[] = [
  { key: "financial",   label: "Financial",   icon: "💰", color: "#059669", bg: "#d1fae5" },
  { key: "newsletters", label: "Newsletters", icon: "📰", color: "#7c3aed", bg: "#ede9fe" },
  { key: "personal",    label: "Personal",    icon: "💬", color: "#d97706", bg: "#fef3c7" },
  { key: "work",        label: "Work",        icon: "💼", color: "#2563eb", bg: "#dbeafe" },
  { key: "social",      label: "Social",      icon: "👥", color: "#db2777", bg: "#fce7f3" },
  { key: "promotions",  label: "Promos",      icon: "🏷️", color: "#ea580c", bg: "#ffedd5" },
];

export const getCategoriesForTheme = (mode: "light" | "dark"): CategoryDef[] =>
  mode === "light" ? LIGHT_CATEGORIES : DARK_CATEGORIES;

// Keep static CATEGORIES for backward compat during migration
export const CATEGORIES = DARK_CATEGORIES;

export const CATEGORY_ICONS: Record<string, string> = {
  financial: "💰",
  newsletters: "📰",
  personal: "💬",
  work: "💼",
  social: "👥",
  promotions: "🏷️",
  updates: "🔔",
  other: "📧",
};

// ─── Schedule Options ────────────────────────────────────────────
export const FREQUENCIES = [
  { key: "daily",    label: "Daily",     desc: "Every morning" },
  { key: "weekly",   label: "Weekly",    desc: "Every Monday" },
  { key: "biweekly", label: "Bi-weekly", desc: "Every other Monday" },
  { key: "monthly",  label: "Monthly",   desc: "1st of each month" },
] as const;

export const DELIVERY_TIMES = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "12:00", "18:00", "20:00",
] as const;

// ─── Priority Colors ─────────────────────────────────────────────
export const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};
