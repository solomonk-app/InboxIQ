import { supabase } from "../config/supabase";
import { SubscriptionTier, SubscriptionInfo } from "../types";

const FREE_DAILY_DIGEST_LIMIT = 3;
const TRIAL_DURATION_DAYS = 5;

// ─── Trial status helper ────────────────────────────────────────
const getTrialStatus = (trialStartedAt: string | null) => {
  if (!trialStartedAt) {
    return { isActive: false, startedAt: null, expiresAt: null, daysRemaining: 0 };
  }

  const start = new Date(trialStartedAt);
  const expires = new Date(start);
  expires.setDate(expires.getDate() + TRIAL_DURATION_DAYS);

  const now = new Date();
  const msRemaining = expires.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isActive = msRemaining > 0;

  return {
    isActive,
    startedAt: trialStartedAt,
    expiresAt: expires.toISOString(),
    daysRemaining,
  };
};

// ─── Get user's subscription tier ────────────────────────────────
export const getUserTier = async (userId: string): Promise<SubscriptionTier> => {
  const { data } = await supabase
    .from("users")
    .select("subscription_tier, subscription_expires_at")
    .eq("id", userId)
    .single();

  if (!data) return "free";

  // If pro but expired, treat as free
  if (data.subscription_tier === "pro" && data.subscription_expires_at) {
    const expiresAt = new Date(data.subscription_expires_at);
    if (expiresAt < new Date()) return "free";
  }

  return (data.subscription_tier as SubscriptionTier) || "free";
};

// ─── Check digest generation quota ──────────────────────────────
export const checkDigestQuota = async (
  userId: string
): Promise<{ allowed: boolean; used: number; max: number; trialExpired?: boolean }> => {
  const tier = await getUserTier(userId);

  if (tier === "pro") {
    return { allowed: true, used: 0, max: -1 }; // unlimited
  }

  // Check trial status for free users
  const { data: userData } = await supabase
    .from("users")
    .select("trial_started_at")
    .eq("id", userId)
    .single();

  const trial = getTrialStatus(userData?.trial_started_at);
  if (!trial.isActive) {
    return { allowed: false, used: 0, max: 0, trialExpired: true };
  }

  // Trial active — apply daily limit
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", "digest_generate")
    .gte("used_at", todayStart.toISOString());

  const used = count || 0;
  return {
    allowed: used < FREE_DAILY_DIGEST_LIMIT,
    used,
    max: FREE_DAILY_DIGEST_LIMIT,
  };
};

// ─── Track a usage event ────────────────────────────────────────
export const trackUsage = async (userId: string, action: string): Promise<void> => {
  await supabase.from("usage_tracking").insert({
    user_id: userId,
    action,
  });
};

// ─── Get full subscription info ─────────────────────────────────
export const getSubscriptionInfo = async (userId: string): Promise<SubscriptionInfo> => {
  const tier = await getUserTier(userId);

  const { data } = await supabase
    .from("users")
    .select("subscription_expires_at, trial_started_at")
    .eq("id", userId)
    .single();

  const trial = getTrialStatus(data?.trial_started_at || null);

  const quota = await checkDigestQuota(userId);

  const trialExpiredFree = tier === "free" && !trial.isActive;

  return {
    tier,
    expiresAt: data?.subscription_expires_at || null,
    limits: {
      maxDigestsPerDay: tier === "pro" ? -1 : trialExpiredFree ? 0 : FREE_DAILY_DIGEST_LIMIT,
      canSendEmail: tier === "pro",
      canSchedule: tier === "pro",
    },
    usage: {
      digestsToday: quota.used,
      maxDigests: tier === "pro" ? -1 : trialExpiredFree ? 0 : quota.max,
    },
    trial,
  };
};

// ─── Upgrade tier (placeholder for RevenueCat) ──────────────────
export const upgradeTier = async (
  userId: string,
  tier: SubscriptionTier
): Promise<void> => {
  const updates: Record<string, any> = { subscription_tier: tier };

  if (tier === "pro") {
    // Set expiry to 30 days from now for testing
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    updates.subscription_expires_at = expiresAt.toISOString();
  }

  await supabase.from("users").update(updates).eq("id", userId);
};
