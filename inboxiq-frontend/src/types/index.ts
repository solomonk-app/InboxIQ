// ─── Navigation ──────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  Welcome: undefined;
  Main: undefined;
  Category: { category: string; label: string };
  Paywall: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Digest: undefined;
  Settings: undefined;
};

// ─── API Types ───────────────────────────────────────────────────
export type EmailCategory =
  | "financial"
  | "newsletters"
  | "personal"
  | "work"
  | "social"
  | "promotions"
  | "updates"
  | "other";

export type Priority = "high" | "medium" | "low";
export type DigestFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

export interface StoredEmail {
  id: string;
  message_id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  ai_summary: string;
  category: EmailCategory;
  priority: Priority;
  action_required: boolean;
  is_read: boolean;
  email_date: string;
}

export interface CategorySummary {
  category: string;
  count: number;
  summary: string;
  topEmails: { subject: string; from: string; priority: string }[];
}

export interface Digest {
  id?: string;
  total_emails: number;
  unread_count: number;
  categories: CategorySummary[];
  highlights: string[];
  action_items: string[];
  generated_at: string;
  frequency?: string;
}

export interface SchedulePreference {
  id: string;
  user_id: string;
  frequency: DigestFrequency;
  delivery_time: string;
  is_active: boolean;
  last_sent_at: string | null;
}

export interface EmailStats {
  total: number;
  unread: number;
  actionRequired: number;
  [key: string]: number;
}

// ─── Subscription ───────────────────────────────────────────────
export type SubscriptionTier = "free" | "pro";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  expiresAt: string | null;
  limits: {
    maxDigestsPerDay: number;
    canSendEmail: boolean;
    canSchedule: boolean;
  };
  usage: {
    digestsToday: number;
    maxDigests: number;
  };
  trial: {
    isActive: boolean;
    startedAt: string | null;
    expiresAt: string | null;
    daysRemaining: number;
  };
}
