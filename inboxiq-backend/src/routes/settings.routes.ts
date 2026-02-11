import { Router, Response } from "express";
import { z } from "zod";
import { authenticate, AuthRequest } from "../middleware/auth";
import { supabase } from "../config/supabase";
import { getUserTier } from "../services/subscription.service";

const router = Router();
router.use(authenticate);

const scheduleUpdateSchema = z.object({
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]).optional(),
  delivery_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format").optional(),
  is_active: z.boolean().optional(),
  timezone: z.string().max(100).optional(),
});

// ─── GET /api/settings/schedule ──────────────────────────────────
router.get("/schedule", async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("schedule_preferences")
      .select("*")
      .eq("user_id", req.userId!)
      .single();

    if (error) throw error;

    // Add tier lock info for free users
    const tier = await getUserTier(req.userId!);
    const response: any = { schedule: data };
    if (tier === "free") {
      response.tier_locked = true;
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/settings/schedule ──────────────────────────────────
router.put("/schedule", async (req: AuthRequest, res: Response) => {
  try {
    const parsed = scheduleUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid input" });
      return;
    }

    const { frequency, delivery_time, is_active, timezone } = parsed.data;

    // Build partial update object
    const updates: Record<string, any> = {};
    if (frequency !== undefined) updates.frequency = frequency;
    if (delivery_time !== undefined) updates.delivery_time = delivery_time;
    if (is_active !== undefined) updates.is_active = is_active;

    // Timezone is stored on the user record
    if (timezone !== undefined) {
      await supabase
        .from("users")
        .update({ timezone })
        .eq("id", req.userId!);
    }

    const { data, error } = await supabase
      .from("schedule_preferences")
      .update(updates)
      .eq("user_id", req.userId!)
      .select()
      .single();

    if (error) throw error;
    res.json({ schedule: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/settings/profile ───────────────────────────────────
router.get("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, avatar_url, timezone, created_at")
      .eq("id", req.userId!)
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
