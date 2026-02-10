import { supabase } from "../config/supabase";
import { fetchEmails, buildDateQuery } from "./gmail.service";
import { categorizeEmails, generateDigestSummary } from "./gemini.service";
import { sendPushNotification } from "./notification.service";
import { DigestFrequency, DigestSummary } from "../types";

// ─── Generate and store a full digest for a user ─────────────────
export const generateDigest = async (
  userId: string,
  frequency: DigestFrequency
): Promise<DigestSummary> => {
  console.log(`📬 Generating ${frequency} digest for user ${userId}`);

  // 1. Fetch emails from Gmail based on frequency window
  const query = buildDateQuery(frequency);
  const emails = await fetchEmails(userId, 100, query);

  console.log(`📨 Fetched ${emails.length} emails from Gmail for user ${userId}`);

  if (emails.length === 0) {
    console.log(`⚠️ No emails found for user ${userId} with query: ${query}`);
    const emptySummary: DigestSummary = {
      totalEmails: 0,
      unreadCount: 0,
      categories: [],
      highlights: ["No new emails in this period."],
      actionItems: [],
      generatedAt: new Date().toISOString(),
    };
    return emptySummary;
  }

  // 2. Categorize all emails with Gemini AI
  const categorized = await categorizeEmails(emails);
  console.log(`🏷️ Categorized ${categorized.length} emails for user ${userId}`);

  // 3. Clear previous emails and store only the current batch
  const { error: deleteError } = await supabase
    .from("email_categories")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Failed to clear old email categories:", deleteError);
  }

  const emailRecords = categorized.map((cat) => {
    const email = emails.find((e) => e.messageId === cat.messageId);
    return {
      user_id: userId,
      message_id: cat.messageId,
      from_name: email?.from || "",
      from_email: email?.fromEmail || "",
      subject: email?.subject || "",
      snippet: email?.snippet || "",
      category: cat.category,
      priority: cat.priority,
      ai_summary: cat.summary,
      confidence: cat.confidence,
      action_required: cat.actionRequired,
      is_read: email?.isRead || false,
      email_date: email?.date || new Date().toISOString(),
    };
  });

  const { error: insertError } = await supabase
    .from("email_categories")
    .insert(emailRecords);

  if (insertError) {
    console.error("Failed to insert email categories:", insertError);
  }

  // 4. Generate the overall digest summary with Gemini
  const digest = await generateDigestSummary(emails, categorized);

  // 5. Clear old digests and store the latest one
  await supabase.from("digest_history").delete().eq("user_id", userId);

  const { error: digestError } = await supabase.from("digest_history").insert({
    user_id: userId,
    frequency,
    total_emails: digest.totalEmails,
    unread_count: digest.unreadCount,
    categories: digest.categories,
    highlights: digest.highlights,
    action_items: digest.actionItems,
    generated_at: digest.generatedAt,
  });

  if (digestError) {
    console.error("Failed to store digest:", digestError);
  }

  // 6. Send push notification to the user
  await sendPushNotification(userId, {
    title: `📬 Your ${frequency} inbox digest`,
    body: `${digest.totalEmails} emails summarized • ${digest.actionItems.length} action items`,
    data: { type: "digest", frequency },
  });

  console.log(`✅ Digest complete: ${digest.totalEmails} emails categorized for user ${userId}`);
  return digest;
};

// ─── Get latest digest for a user ────────────────────────────────
export const getLatestDigest = async (userId: string) => {
  const { data, error } = await supabase
    .from("digest_history")
    .select("*")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
};

// ─── Get digest history ──────────────────────────────────────────
export const getDigestHistory = async (userId: string, limit: number = 10) => {
  const { data } = await supabase
    .from("digest_history")
    .select("id, frequency, total_emails, unread_count, highlights, generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(limit);

  return data || [];
};

// ─── Get categorized emails (optionally filtered) ────────────────
export const getCategorizedEmails = async (
  userId: string,
  category?: string,
  limit: number = 50
) => {
  let query = supabase
    .from("email_categories")
    .select("*")
    .eq("user_id", userId)
    .order("email_date", { ascending: false })
    .limit(limit);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data } = await query;
  return data || [];
};
