import { gmail_v1 } from "googleapis";
import { createGmailClient } from "../config/google";
import { supabase } from "../config/supabase";
import { ParsedEmail, DigestFrequency } from "../types";
import { safeDecryptToken } from "../utils/crypto";

// ─── Create Gmail client for a user ─────────────────────────────
const getGmailClient = async (userId: string) => {
  const { data: user, error } = await supabase
    .from("users")
    .select("google_access_token, google_refresh_token")
    .eq("id", userId)
    .single();

  if (error || !user) {
    console.error(`❌ User lookup failed for ${userId}:`, error);
    throw new Error("User not found or OAuth tokens missing");
  }

  console.log(`🔑 Tokens for user ${userId}: access=${user.google_access_token ? "present" : "MISSING"}, refresh=${user.google_refresh_token ? "present" : "MISSING"}`);

  const accessToken = safeDecryptToken(user.google_access_token);
  const refreshToken = safeDecryptToken(user.google_refresh_token);
  return createGmailClient(accessToken, refreshToken, userId);
};

// ─── List message IDs from Gmail ────────────────────────────────
export const listMessageIds = async (
  userId: string,
  maxResults: number = 50,
  query?: string
): Promise<{ gmail: gmail_v1.Gmail; messageIds: string[] }> => {
  const gmail = await getGmailClient(userId);
  const q = query || "newer_than:1d";
  console.log(`📧 Gmail query for user ${userId}: "${q}", maxResults: ${maxResults}`);

  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q,
    });

    const messages = listRes.data.messages || [];
    console.log(`📬 Gmail returned ${messages.length} messages for user ${userId}`);
    return { gmail, messageIds: messages.map((m) => m.id!) };
  } catch (gmailErr: any) {
    console.error(`❌ Gmail API error for user ${userId}:`, gmailErr.message, gmailErr.response?.data || "");
    throw gmailErr;
  }
};

// ─── Fetch a batch of messages by ID ────────────────────────────
export const fetchMessageBatch = async (
  gmail: gmail_v1.Gmail,
  ids: string[]
): Promise<ParsedEmail[]> => {
  const emails = await Promise.all(
    ids.map((id) => fetchSingleEmail(gmail, id))
  );
  return emails.filter((e): e is ParsedEmail => e !== null);
};

// ─── Fetch Emails from Gmail API (backward-compatible) ──────────
export const fetchEmails = async (
  userId: string,
  maxResults: number = 50,
  query?: string
): Promise<ParsedEmail[]> => {
  const { gmail, messageIds } = await listMessageIds(userId, maxResults, query);
  if (messageIds.length === 0) return [];
  return fetchMessageBatch(gmail, messageIds);
};

// ─── Parse a single Gmail message ────────────────────────────────
const fetchSingleEmail = async (
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<ParsedEmail | null> => {
  try {
    const res = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject", "Date"],
    });

    const headers = res.data.payload?.headers || [];
    const getHeader = (name: string): string =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const fromRaw = getHeader("From");
    const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);

    const snippet = res.data.snippet || "";

    return {
      messageId: res.data.id!,
      threadId: res.data.threadId!,
      from: fromMatch ? fromMatch[1].replace(/"/g, "") : fromRaw,
      fromEmail: fromMatch ? fromMatch[2] : fromRaw,
      to: getHeader("To"),
      subject: getHeader("Subject"),
      snippet,
      body: snippet, // Use snippet instead of full body — sufficient for AI categorization
      date: getHeader("Date"),
      labels: res.data.labelIds || [],
      isRead: !res.data.labelIds?.includes("UNREAD"),
    };
  } catch (err) {
    console.error(`Failed to fetch message ${messageId}:`, err);
    return null;
  }
};

// ─── Send an Email via SMTP (from nomo2606@gmail.com) ───────────
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> => {
  await transporter.sendMail({
    from: `"InboxIQ" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlBody,
  });
};

// ─── Build Gmail search query for a date range ──────────────────
export const buildDateQuery = (frequency: DigestFrequency): string => {
  switch (frequency) {
    case "daily":
      return "newer_than:1d";
    case "weekly":
      return "newer_than:7d";
    case "biweekly":
      return "newer_than:14d";
    case "monthly":
      return "newer_than:30d";
    default:
      return "newer_than:1d";
  }
};
