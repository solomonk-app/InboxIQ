import { supabase } from "../config/supabase";
import { listMessageIds, fetchMessageBatch, buildDateQuery } from "./gmail.service";
import { categorizeBatch, buildDigestSummary } from "./gemini.service";
import { sendPushNotification } from "./notification.service";
import { DigestFrequency, DigestSummary, ParsedEmail, CategorizedEmail, StoredEmail } from "../types";

const PIPELINE_CHUNK_SIZE = 20;

// ─── Reconstruct ParsedEmail[] from cached DB records ────────────
const cachedToEmails = (cached: StoredEmail[]): ParsedEmail[] =>
  cached.map((r) => ({
    messageId: r.message_id,
    threadId: "",
    from: r.from_name,
    fromEmail: r.from_email,
    to: "",
    subject: r.subject,
    snippet: r.snippet,
    body: r.snippet,
    date: r.email_date,
    labels: [],
    isRead: r.is_read,
  }));

// ─── Reconstruct CategorizedEmail[] from cached DB records ───────
const cachedToCategorized = (cached: StoredEmail[]): CategorizedEmail[] =>
  cached.map((r) => ({
    messageId: r.message_id,
    category: r.category,
    confidence: r.confidence,
    summary: r.ai_summary,
    priority: r.priority,
    actionRequired: r.action_required,
  }));

// ─── Generate and store a full digest for a user ─────────────────
export const generateDigest = async (
  userId: string,
  frequency: DigestFrequency
): Promise<DigestSummary> => {
  const t0 = Date.now();
  console.log(`📬 Generating ${frequency} digest for user ${userId}`);

  // 1. List message IDs from Gmail
  const query = buildDateQuery(frequency);
  const { gmail, messageIds } = await listMessageIds(userId, 100, query);

  console.log(`📨 Found ${messageIds.length} message IDs for user ${userId}`);

  if (messageIds.length === 0) {
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

  // 2. Check cache: query ALL email_categories for this user
  const gmailIdSet = new Set(messageIds);
  const { data: allCached } = await supabase
    .from("email_categories")
    .select("*")
    .eq("user_id", userId);

  const cachedRecords = (allCached || []) as StoredEmail[];

  // Partition: cached (still in Gmail results) vs stale (no longer in results)
  const cached: StoredEmail[] = [];
  const stale: StoredEmail[] = [];
  const cachedIdSet = new Set<string>();

  for (const record of cachedRecords) {
    if (gmailIdSet.has(record.message_id)) {
      cached.push(record);
      cachedIdSet.add(record.message_id);
    } else {
      stale.push(record);
    }
  }

  // New IDs = in Gmail but not in cache
  const newIds = messageIds.filter((id) => !cachedIdSet.has(id));

  console.log(`🗂️ Cache: ${cached.length} hit, ${newIds.length} new, ${stale.length} stale`);

  // 3. Reconstruct cached data
  const cachedEmails = cachedToEmails(cached);
  const cachedCategorized = cachedToCategorized(cached);

  // 4. Pipeline fetch+categorize only NEW emails (skip if none)
  let newEmails: ParsedEmail[] = [];
  let newCategorized: CategorizedEmail[] = [];

  if (newIds.length > 0) {
    const idChunks: string[][] = [];
    for (let i = 0; i < newIds.length; i += PIPELINE_CHUNK_SIZE) {
      idChunks.push(newIds.slice(i, i + PIPELINE_CHUNK_SIZE));
    }

    console.log(`🚀 Pipeline: ${idChunks.length} chunk(s) of ≤${PIPELINE_CHUNK_SIZE} new emails`);

    const chunkResults = await Promise.all(
      idChunks.map(async (ids, idx) => {
        const fetched = await fetchMessageBatch(gmail, ids);
        console.log(`  📦 Chunk ${idx + 1}: fetched ${fetched.length}, categorizing...`);
        const categorized = await categorizeBatch(fetched);
        console.log(`  🏷️ Chunk ${idx + 1}: categorized ${categorized.length}`);
        return { emails: fetched, categorized };
      })
    );

    newEmails = chunkResults.flatMap((r) => r.emails);
    newCategorized = chunkResults.flatMap((r) => r.categorized);
  } else {
    console.log(`⚡ 100% cache hit — skipping fetch & categorize`);
  }

  // 5. Merge cached + new
  const allEmails = [...cachedEmails, ...newEmails];
  const allCategorizedEmails = [...cachedCategorized, ...newCategorized];

  console.log(`🏷️ Total: ${allEmails.length} emails (${cached.length} cached + ${newEmails.length} new)`);

  // 6. Build digest summary
  const digest = buildDigestSummary(allEmails, allCategorizedEmails);

  // 7. DB writes in parallel: upsert new records, delete stale, update digest_history
  const dbPromises: PromiseLike<any>[] = [];

  // Upsert new email records
  if (newCategorized.length > 0) {
    const newRecords = newCategorized.map((cat) => {
      const email = newEmails.find((e) => e.messageId === cat.messageId);
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

    dbPromises.push(
      supabase
        .from("email_categories")
        .upsert(newRecords, { onConflict: "user_id,message_id" })
        .then(({ error }) => {
          if (error) console.error("Failed to upsert email categories:", error);
        })
    );
  }

  // Delete stale records
  if (stale.length > 0) {
    const staleIds = stale.map((r) => r.message_id);
    dbPromises.push(
      supabase
        .from("email_categories")
        .delete()
        .eq("user_id", userId)
        .in("message_id", staleIds)
        .then(({ error }) => {
          if (error) console.error("Failed to delete stale email categories:", error);
        })
    );
  }

  // Clear old digests and store the latest one
  dbPromises.push(
    supabase
      .from("digest_history")
      .delete()
      .eq("user_id", userId)
      .then(() =>
        supabase.from("digest_history").insert({
          user_id: userId,
          frequency,
          total_emails: digest.totalEmails,
          unread_count: digest.unreadCount,
          categories: digest.categories,
          highlights: digest.highlights,
          action_items: digest.actionItems,
          generated_at: digest.generatedAt,
        })
      )
      .then(({ error }: any) => {
        if (error) console.error("Failed to store digest:", error);
      })
  );

  await Promise.all(dbPromises);

  // 8. Send push notification
  await sendPushNotification(userId, {
    title: `📬 Your ${frequency} inbox digest`,
    body: `${digest.totalEmails} emails summarized • ${digest.actionItems.length} action items`,
    data: { type: "digest", frequency },
  });

  console.log(`✅ Digest complete: ${digest.totalEmails} emails in ${Date.now() - t0}ms for user ${userId}`);
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
