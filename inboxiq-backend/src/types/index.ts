// ─── User ────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  timezone: string;
  google_access_token: string;
  google_refresh_token: string;
  token_expiry: string | null;
  expo_push_token: string | null;
  last_login: string;
  created_at: string;
  updated_at: string;
}

// ─── Email ───────────────────────────────────────────────────────
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

export interface ParsedEmail {
  messageId: string;
  threadId: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  labels: string[];
  isRead: boolean;
}

export interface CategorizedEmail {
  messageId: string;
  category: EmailCategory;
  confidence: number;
  summary: string;
  priority: Priority;
  actionRequired: boolean;
}

export interface StoredEmail {
  id: string;
  user_id: string;
  message_id: string;
  from_name: string;
  from_email: string;
  subject: string;
  snippet: string;
  category: EmailCategory;
  priority: Priority;
  ai_summary: string;
  confidence: number;
  action_required: boolean;
  is_read: boolean;
  email_date: string;
  created_at: string;
}

// ─── Digest ──────────────────────────────────────────────────────
export type DigestFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface CategorySummary {
  category: EmailCategory;
  count: number;
  summary: string;
  topEmails: { subject: string; from: string; priority: string }[];
}

export interface DigestSummary {
  totalEmails: number;
  unreadCount: number;
  categories: CategorySummary[];
  highlights: string[];
  actionItems: string[];
  generatedAt: string;
}

export interface DigestRecord {
  id: string;
  user_id: string;
  frequency: DigestFrequency;
  total_emails: number;
  unread_count: number;
  categories: CategorySummary[];
  highlights: string[];
  action_items: string[];
  generated_at: string;
}

// ─── Schedule ────────────────────────────────────────────────────
export interface SchedulePreference {
  id: string;
  user_id: string;
  frequency: DigestFrequency;
  delivery_time: string; // HH:MM
  is_active: boolean;
  last_sent_at: string | null;
  created_at: string;
  updated_at: string;
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
}

// ─── API Responses ───────────────────────────────────────────────
export interface EmailStats {
  total: number;
  unread: number;
  actionRequired: number;
  [category: string]: number;
}
