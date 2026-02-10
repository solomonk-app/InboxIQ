import { geminiModel } from "../config/google";
import {
  ParsedEmail,
  CategorizedEmail,
  EmailCategory,
  DigestSummary,
  CategorySummary,
  StoredEmail,
} from "../types";

// ─── Categorize Emails + Generate Digest in ONE Gemini Call ──────
export const categorizeAndSummarize = async (
  emails: ParsedEmail[]
): Promise<{ categorized: CategorizedEmail[]; digest: DigestSummary }> => {
  const emailSummaries = emails.map((e) => ({
    messageId: e.messageId,
    from: e.from,
    fromEmail: e.fromEmail,
    subject: e.subject,
    snippet: e.snippet,
  }));

  const prompt = `You are an expert email classifier and digest assistant. Analyze ALL emails below and return a single JSON response with two sections.

TASK 1 — Classify each email:
- category: One of "financial", "newsletters", "personal", "work", "social", "promotions", "updates", "other"
- confidence: Float 0-1
- summary: 1 sentence summary
- priority: "high", "medium", or "low"
- actionRequired: boolean

Classification rules:
- "financial": Banks, payments, invoices, billing
- "newsletters": Subscribed digests, editorial content
- "personal": Friends, family, personal conversations
- "work": Colleagues, project tools, meetings, HR
- "social": Social media notifications
- "promotions": Marketing, deals, sales
- "updates": Shipping, security, password resets, app updates
- "other": Anything else

TASK 2 — Generate a digest summary with categories overview, highlights, and action items.

Emails:
${JSON.stringify(emailSummaries)}

Return ONLY this JSON schema:
{
  "emails": [{ "messageId": string, "category": string, "confidence": number, "summary": string, "priority": string, "actionRequired": boolean }],
  "digest": {
    "categories": [{ "category": string, "count": number, "summary": string, "topEmails": [{ "subject": string, "from": string, "priority": string }] }],
    "highlights": [string],
    "actionItems": [string]
  }
}`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      categorized: parsed.emails as CategorizedEmail[],
      digest: {
        totalEmails: emails.length,
        unreadCount: emails.filter((e) => !e.isRead).length,
        categories: parsed.digest.categories as CategorySummary[],
        highlights: parsed.digest.highlights as string[],
        actionItems: parsed.digest.actionItems as string[],
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("Gemini combined analysis failed:", err);
    // Fallback: basic categorization without AI
    const categorized = emails.map((e) => ({
      messageId: e.messageId,
      category: "other" as EmailCategory,
      confidence: 0,
      summary: e.snippet,
      priority: "low" as const,
      actionRequired: false,
    }));
    return {
      categorized,
      digest: {
        totalEmails: emails.length,
        unreadCount: emails.filter((e) => !e.isRead).length,
        categories: [{ category: "other" as EmailCategory, count: emails.length, summary: `${emails.length} emails.`, topEmails: [] }],
        highlights: ["Digest generated with limited AI analysis."],
        actionItems: [],
        generatedAt: new Date().toISOString(),
      },
    };
  }
};

// Keep old exports for backward compatibility
export const categorizeEmails = async (emails: ParsedEmail[]): Promise<CategorizedEmail[]> => {
  const { categorized } = await categorizeAndSummarize(emails);
  return categorized;
};

export const generateDigestSummary = async (
  emails: ParsedEmail[],
  categorized: CategorizedEmail[]
): Promise<DigestSummary> => {
  // This is now only used as a no-op since we use the combined call
  return {
    totalEmails: emails.length,
    unreadCount: emails.filter((e) => !e.isRead).length,
    categories: [],
    highlights: [],
    actionItems: [],
    generatedAt: new Date().toISOString(),
  };
};

// ─── Compose Summary Email Body with Gemini ─────────────────────
export const composeDigestEmail = async (
  emails: StoredEmail[],
  userName: string,
  highlights: string[] = [],
  actionItems: string[] = []
): Promise<{ subject: string; htmlBody: string }> => {
  const grouped: Record<string, StoredEmail[]> = {};
  for (const email of emails) {
    if (!grouped[email.category]) grouped[email.category] = [];
    grouped[email.category].push(email);
  }

  const categoryData = Object.entries(grouped).map(([cat, items]) => ({
    category: cat,
    count: items.length,
    emails: items.map((e) => ({
      from: e.from_name || e.from_email,
      subject: e.subject,
      summary: e.ai_summary,
      priority: e.priority,
      actionRequired: e.action_required,
    })),
  }));

  const prompt = `You are an AI email assistant. Compose a polished HTML email that summarizes a user's inbox.

User name: ${userName}
Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Key Highlights:
${JSON.stringify(highlights, null, 2)}

Action Items:
${JSON.stringify(actionItems, null, 2)}

Categorized email data:
${JSON.stringify(categoryData, null, 2)}

Generate a JSON response with:
{
  "subject": "A short, engaging email subject line for the digest",
  "htmlBody": "Full HTML email body"
}

STRICT STYLE GUIDE for htmlBody:
- Use inline styles only (no <style> tags)
- Outer wrapper: background:#0a0a0f; color:#e5e7eb; padding:32px; font-family:'Helvetica Neue',Arial,sans-serif; max-width:600px; margin:0 auto;
- "Hello, {name}" greeting: use color:#6b7280 (muted gray), font-size:14px, font-weight:500
- App name "InboxIQ" header: color:#818cf8, font-size:28px, font-weight:800
- Section titles (Key Highlights, Action Items, Categories): color:#818cf8, font-size:18px, font-weight:700, margin-top:28px
- Card containers: background:#1a1a2e; border-radius:12px; padding:16px; margin-bottom:10px;
- Email sender name: color:#e5e7eb; font-weight:600; font-size:14px
- Email subject: color:#d1d5db; font-size:13px
- AI summary text: color:#9ca3af; font-size:12px
- Highlight bullets: use "•" with color:#818cf8
- Action items: use "☐" with color:#ef4444
- Category badges: display inline; background:#818cf820; color:#818cf8; padding:4px 10px; border-radius:8px; font-size:12px; font-weight:600
- Dividers: border-top:1px solid rgba(255,255,255,0.06)
- Footer: color:#4b5563; font-size:11px; text-align:center; margin-top:32px

STRUCTURE ORDER:
1) InboxIQ logo/header + greeting (Hello, {name} in muted gray) + date + stats overview
2) ⚡ Key Highlights section with bullet points
3) 🎯 Action Items section
4) 📂 Categories — each with header, email cards (from, subject, summary)
5) Footer with "Powered by InboxIQ & Gemini AI"

Return ONLY valid JSON.`;

  try {
    const result = await geminiModel.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini email composition failed:", err);
    // Fallback: build a styled HTML email
    const date = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    let html = `<div style="background:#0a0a0f;color:#e5e7eb;padding:32px;font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">`;
    html += `<h1 style="color:#818cf8;font-size:28px;font-weight:800;margin:0;">📬 InboxIQ</h1>`;
    html += `<p style="color:#6b7280;font-size:14px;font-weight:500;margin:8px 0 4px;">Hello, ${userName}</p>`;
    html += `<p style="color:#4b5563;font-size:12px;margin:0 0 20px;">${date} • ${emails.length} emails</p>`;
    if (highlights.length > 0) {
      html += `<h2 style="color:#818cf8;font-size:18px;font-weight:700;margin-top:28px;">⚡ Key Highlights</h2>`;
      for (const h of highlights) html += `<p style="margin:6px 0;font-size:14px;"><span style="color:#818cf8;">•</span> ${h}</p>`;
    }
    if (actionItems.length > 0) {
      html += `<h2 style="color:#818cf8;font-size:18px;font-weight:700;margin-top:28px;">🎯 Action Items</h2>`;
      for (const a of actionItems) html += `<p style="margin:6px 0;font-size:14px;"><span style="color:#ef4444;">☐</span> ${a}</p>`;
    }
    for (const [cat, items] of Object.entries(grouped)) {
      html += `<h2 style="color:#818cf8;font-size:18px;font-weight:700;margin-top:28px;text-transform:capitalize;">📂 ${cat} <span style="background:rgba(129,140,248,0.12);color:#818cf8;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;">${items.length}</span></h2>`;
      for (const e of items) {
        html += `<div style="background:#1a1a2e;padding:16px;border-radius:12px;margin-bottom:10px;">`;
        html += `<div style="color:#e5e7eb;font-weight:600;font-size:14px;">${e.from_name || e.from_email}</div>`;
        html += `<div style="color:#d1d5db;font-size:13px;margin-top:2px;">${e.subject}</div>`;
        html += `<div style="color:#9ca3af;font-size:12px;margin-top:6px;">${e.ai_summary}</div></div>`;
      }
    }
    html += `<p style="color:#4b5563;font-size:11px;text-align:center;margin-top:32px;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">Powered by InboxIQ & Gemini AI</p>`;
    html += `</div>`;
    return { subject: `InboxIQ Digest - ${date}`, htmlBody: html };
  }
};
