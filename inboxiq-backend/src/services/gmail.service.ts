import { gmail_v1 } from "googleapis";
import { createGmailClient } from "../config/google";
import { supabase } from "../config/supabase";
import { ParsedEmail, DigestFrequency } from "../types";

// ─── Fetch Emails from Gmail API ─────────────────────────────────
export const fetchEmails = async (
  userId: string,
  maxResults: number = 50,
  query?: string
): Promise<ParsedEmail[]> => {
  // Retrieve stored OAuth tokens for this user
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

  const gmail = createGmailClient(user.google_access_token, user.google_refresh_token, userId);

  // List message IDs matching the query
  const q = query || "newer_than:1d";
  console.log(`📧 Gmail query for user ${userId}: "${q}", maxResults: ${maxResults}`);

  try {
    const listRes = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      q,
    });

    const messageIds = listRes.data.messages || [];
    console.log(`📬 Gmail returned ${messageIds.length} messages for user ${userId}`);
    if (messageIds.length === 0) return [];

    // Fetch message metadata in parallel batches of 30
    const emails: (ParsedEmail | null)[] = [];
    const FETCH_BATCH = 30;
    for (let i = 0; i < messageIds.length; i += FETCH_BATCH) {
      const batch = messageIds.slice(i, i + FETCH_BATCH);
      const batchResults = await Promise.all(
        batch.map((msg) => fetchSingleEmail(gmail, msg.id!))
      );
      emails.push(...batchResults);
    }

    return emails.filter((e): e is ParsedEmail => e !== null);
  } catch (gmailErr: any) {
    console.error(`❌ Gmail API error for user ${userId}:`, gmailErr.message, gmailErr.response?.data || "");
    throw gmailErr;
  }
};

// ─── Parse a single Gmail message (metadata only for speed) ─────
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

    return {
      messageId: res.data.id!,
      threadId: res.data.threadId!,
      from: fromMatch ? fromMatch[1].replace(/"/g, "") : fromRaw,
      fromEmail: fromMatch ? fromMatch[2] : fromRaw,
      to: getHeader("To"),
      subject: getHeader("Subject"),
      snippet: res.data.snippet || "",
      body: res.data.snippet || "", // Use snippet instead of full body
      date: getHeader("Date"),
      labels: res.data.labelIds || [],
      isRead: !res.data.labelIds?.includes("UNREAD"),
    };
  } catch (err) {
    console.error(`Failed to fetch message ${messageId}:`, err);
    return null;
  }
};

// ─── Extract body text from Gmail message payload ────────────────
const extractBody = (payload?: gmail_v1.Schema$MessagePart): string => {
  if (!payload) return "";

  // Direct body data
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  // Multipart — prefer text/plain, fallback to stripped text/html
  if (payload.parts) {
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, "base64").toString("utf-8");
    }

    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      const html = Buffer.from(htmlPart.body.data, "base64").toString("utf-8");
      return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }

    // Recurse into nested multipart sections
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
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
