import { Router, Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getSubscriptionInfo, upgradeTier } from "../services/subscription.service";

const router = Router();

// ─── GET /api/subscription ──────────────────────────────────────
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const info = await getSubscriptionInfo(req.userId!);
    res.json({ subscription: info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscription/webhook ─────────────────────────────
// RevenueCat webhook endpoint. Validates webhook auth header.
// In production, only requests with the correct webhook secret are accepted.
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const authHeader = req.headers.authorization;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // RevenueCat sends event data with app_user_id and product info
    const event = req.body?.event;
    if (!event) {
      res.status(400).json({ error: "Missing event data" });
      return;
    }

    const userId = event.app_user_id;
    const eventType = event.type;

    if (!userId) {
      res.status(400).json({ error: "Missing app_user_id" });
      return;
    }

    // Handle relevant event types
    if (["INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION"].includes(eventType)) {
      await upgradeTier(userId, "pro");
    } else if (["EXPIRATION", "CANCELLATION"].includes(eventType)) {
      await upgradeTier(userId, "free");
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── POST /api/subscription/upgrade ─────────────────────────────
// Only available in development for testing. Blocked in production.
router.post("/upgrade", authenticate, async (req: AuthRequest, res: Response) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Use in-app purchase to upgrade" });
    return;
  }

  try {
    const { tier = "pro" } = req.body;
    if (tier !== "free" && tier !== "pro") {
      res.status(400).json({ error: "Invalid tier. Use: free, pro" });
      return;
    }
    await upgradeTier(req.userId!, tier);
    const info = await getSubscriptionInfo(req.userId!);
    res.json({ subscription: info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
