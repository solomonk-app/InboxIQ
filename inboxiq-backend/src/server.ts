import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth.routes";
import emailRoutes from "./routes/email.routes";
import digestRoutes from "./routes/digest.routes";
import settingsRoutes from "./routes/settings.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import { startScheduler } from "./jobs/scheduler";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ─── Routes ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/digests", digestRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscription", subscriptionRoutes);

// ─── Health Check ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "inboxiq-backend",
    timestamp: new Date().toISOString(),
  });
});

// ─── Global Error Handler ────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 InboxIQ backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Start the automated digest scheduler
  startScheduler();
  console.log(`⏰ Digest scheduler initialized\n`);
});

export default app;
