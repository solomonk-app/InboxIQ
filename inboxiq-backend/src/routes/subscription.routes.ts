import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getSubscriptionInfo, upgradeTier } from "../services/subscription.service";

const router = Router();
router.use(authenticate);

// ─── GET /api/subscription ──────────────────────────────────────
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const info = await getSubscriptionInfo(req.userId!);
    res.json({ subscription: info });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/subscription/upgrade ─────────────────────────────
// Placeholder for future RevenueCat webhook. For testing, upgrades to pro.
router.post("/upgrade", async (req: AuthRequest, res: Response) => {
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
