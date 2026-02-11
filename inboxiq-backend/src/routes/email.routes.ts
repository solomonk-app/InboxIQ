import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { getCategorizedEmails } from "../services/digest.service";

const router = Router();
router.use(authenticate);

// ─── GET /api/emails?category=financial&limit=50&filter=unread ────
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { category, limit, filter } = req.query;
    let emails = await getCategorizedEmails(
      req.userId!,
      category as string,
      parseInt(limit as string) || 50
    );

    // Apply optional filter
    if (filter === "unread") {
      emails = emails.filter((e) => !e.is_read);
    } else if (filter === "action_required") {
      emails = emails.filter((e) => e.action_required);
    }

    res.json({ emails, count: emails.length });
  } catch (err: any) {
    console.error("Fetch emails failed:", err);
    res.status(500).json({ error: "An internal error occurred" });
  }
});

// ─── GET /api/emails/stats ───────────────────────────────────────
// Returns email count per category for dashboard summary cards
router.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const emails = await getCategorizedEmails(req.userId!, "all", 200);

    const stats = emails.reduce(
      (acc, email) => {
        const cat = email.category || "other";
        acc[cat] = (acc[cat] || 0) + 1;
        acc.total++;
        if (!email.is_read) acc.unread++;
        if (email.action_required) acc.actionRequired++;
        return acc;
      },
      { total: 0, unread: 0, actionRequired: 0 } as Record<string, number>
    );

    res.json({ stats });
  } catch (err: any) {
    console.error("Fetch email stats failed:", err);
    res.status(500).json({ error: "An internal error occurred" });
  }
});

export default router;
