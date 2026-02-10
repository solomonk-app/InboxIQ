import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  generateDigest,
  getLatestDigest,
  getDigestHistory,
  getCategorizedEmails,
} from "../services/digest.service";
import { composeDigestEmail } from "../services/gemini.service";
import { sendEmail } from "../services/gmail.service";
import { checkDigestQuota, trackUsage, getUserTier } from "../services/subscription.service";
import { supabase } from "../config/supabase";
import { DigestFrequency } from "../types";

const router = Router();
router.use(authenticate);

const VALID_FREQUENCIES: DigestFrequency[] = ["daily", "weekly", "biweekly", "monthly"];

// ─── POST /api/digests/generate ──────────────────────────────────
// Manually trigger a digest (from the app's "Refresh" button)
router.post("/generate", async (req: AuthRequest, res: Response) => {
  try {
    const { frequency = "daily" } = req.body;

    if (!VALID_FREQUENCIES.includes(frequency)) {
      res.status(400).json({
        error: `Invalid frequency. Use: ${VALID_FREQUENCIES.join(", ")}`,
      });
      return;
    }

    // Check digest quota for free tier
    const quota = await checkDigestQuota(req.userId!);
    if (!quota.allowed) {
      res.status(403).json({
        error: "Daily digest limit reached",
        code: "DIGEST_LIMIT_REACHED",
        usage: { used: quota.used, max: quota.max },
      });
      return;
    }

    const digest = await generateDigest(req.userId!, frequency);

    // Track usage after successful generation
    await trackUsage(req.userId!, "digest_generate");

    res.json({ digest });
  } catch (err: any) {
    console.error("❌ Digest generation failed:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/digests/latest ─────────────────────────────────────
router.get("/latest", async (req: AuthRequest, res: Response) => {
  try {
    const digest = await getLatestDigest(req.userId!);
    if (!digest) {
      res.status(404).json({ error: "No digests found. Generate your first one!" });
      return;
    }
    res.json({ digest });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/digests/history?limit=10 ───────────────────────────
router.get("/history", async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const history = await getDigestHistory(req.userId!, limit);
    res.json({ history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/digests/send-email ───────────────────────────────
// AI-compose and send a digest summary email to the logged-in user
router.post("/send-email", async (req: AuthRequest, res: Response) => {
  try {
    // Check tier — only pro users can send digest emails
    const tier = await getUserTier(req.userId!);
    if (tier !== "pro") {
      res.status(403).json({
        error: "Pro subscription required to send digest emails",
        code: "PRO_REQUIRED",
      });
      return;
    }

    // Get user info
    const { data: user } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", req.userId!)
      .single();

    if (!user?.email) {
      res.status(400).json({ error: "User email not found" });
      return;
    }

    // Get all categorized emails for this user
    const emails = await getCategorizedEmails(req.userId!);

    if (emails.length === 0) {
      res.status(400).json({ error: "No categorized emails. Generate a digest first." });
      return;
    }

    // Get latest digest for highlights and action items
    const latestDigest = await getLatestDigest(req.userId!);

    // Use Gemini to compose the email
    const { subject, htmlBody } = await composeDigestEmail(
      emails,
      user.name || "there",
      latestDigest?.highlights || [],
      latestDigest?.action_items || []
    );

    // Send from nomo2606@gmail.com to the logged-in user
    await sendEmail(user.email, subject, htmlBody);

    res.json({ success: true, message: `Digest sent to ${user.email}` });
  } catch (err: any) {
    console.error("Send digest email failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
