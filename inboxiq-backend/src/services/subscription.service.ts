import { supabase } from "../config/supabase";
import { SubscriptionTier, SubscriptionInfo } from "../types";

const FREE_DAILY_DIGEST_LIMIT = 3;

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
): Promise<{ allowed: boolean; used: number; max: number }> => {
  const tier = await getUserTier(userId);

  if (tier === "pro") {
    return { allowed: true, used: 0, max: -1 }; // unlimited
  }

  // Count today's digest generations
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
  const quota = await checkDigestQuota(userId);

  const { data } = await supabase
    .from("users")
    .select("subscription_expires_at")
    .eq("id", userId)
    .single();

  return {
    tier,
    expiresAt: data?.subscription_expires_at || null,
    limits: {
      maxDigestsPerDay: tier === "pro" ? -1 : FREE_DAILY_DIGEST_LIMIT,
      canSendEmail: tier === "pro",
      canSchedule: tier === "pro",
    },
    usage: {
      digestsToday: quota.used,
      maxDigests: quota.max,
    },
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
