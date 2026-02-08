import cron from "node-cron";
import { supabase } from "../config/supabase";
import { generateDigest, getCategorizedEmails } from "../services/digest.service";
import { composeDigestEmail } from "../services/gemini.service";
import { sendEmail } from "../services/gmail.service";
import { DigestFrequency } from "../types";

// ─── Start the digest scheduler ──────────────────────────────────
// Runs every hour at minute :00 and checks which users are due for a digest.
export const startScheduler = (): void => {
  cron.schedule("0 * * * *", async () => {
    console.log(
      `⏰ [${new Date().toISOString()}] Scheduler tick — checking for pending digests`
    );
    await processScheduledDigests();
  });

  console.log("📅 Cron scheduler started (hourly check)");
};

// ─── Process all due digests ─────────────────────────────────────
const processScheduledDigests = async (): Promise<void> => {
  const now = new Date();

  // Fetch all active schedule preferences (with user timezone)
  const { data: schedules, error } = await supabase
    .from("schedule_preferences")
    .select("*, users(id, email, name, timezone)")
    .eq("is_active", true);

  if (error || !schedules || schedules.length === 0) return;

  for (const schedule of schedules) {
    try {
      const userTimezone =
        (schedule.users as any)?.timezone || "America/New_York";
      const userHour = getHourInTimezone(now, userTimezone);
      const targetHour = parseInt(schedule.delivery_time.split(":")[0], 10);

      // Only run if the current hour matches user's desired delivery time
      if (userHour !== targetHour) continue;

      // Check if digest is actually due based on frequency
      if (!isDigestDue(schedule)) continue;

      console.log(
        `📨 Generating ${schedule.frequency} digest for user ${schedule.user_id}`
      );

      const digest = await generateDigest(
        schedule.user_id,
        schedule.frequency as DigestFrequency
      );

      // Send digest email to the user
      const userEmail = (schedule.users as any)?.email;
      if (userEmail && digest.totalEmails > 0) {
        try {
          const emails = await getCategorizedEmails(schedule.user_id);
          const userName = (schedule.users as any)?.name || "there";
          const { subject, htmlBody } = await composeDigestEmail(
            emails,
            userName,
            digest.highlights,
            digest.actionItems
          );
          await sendEmail(userEmail, subject, htmlBody);
          console.log(`📧 Digest email sent to ${userEmail}`);
        } catch (emailErr) {
          console.error(`❌ Failed to send digest email to ${userEmail}:`, emailErr);
        }
      }

      // Mark as sent
      await supabase
        .from("schedule_preferences")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", schedule.id);
    } catch (err) {
      console.error(`❌ Digest failed for schedule ${schedule.id}:`, err);
    }
  }
};

// ─── Check if a digest is due based on frequency ─────────────────
const isDigestDue = (schedule: any): boolean => {
  const lastSent = schedule.last_sent_at
    ? new Date(schedule.last_sent_at)
    : null;
  const now = new Date();

  if (!lastSent) return true; // Never sent before → due now

  const hoursSince =
    (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

  switch (schedule.frequency) {
    case "daily":
      return hoursSince >= 23;
    case "weekly":
      return hoursSince >= 167;
    case "biweekly":
      return hoursSince >= 335;
    case "monthly":
      return hoursSince >= 719;
    default:
      return false;
  }
};

// ─── Get the current hour in a specific IANA timezone ────────────
const getHourInTimezone = (date: Date, timezone: string): number => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: timezone,
  });
  return parseInt(formatter.format(date), 10);
};
