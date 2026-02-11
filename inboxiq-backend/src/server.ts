import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

// ─── Startup Env Validation ─────────────────────────────────────
const REQUIRED_ENV_VARS = [
  "JWT_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
] as const;

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

if (process.env.JWT_SECRET!.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long");
}

import authRoutes from "./routes/auth.routes";
import emailRoutes from "./routes/email.routes";
import digestRoutes from "./routes/digest.routes";
import settingsRoutes from "./routes/settings.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import { startScheduler } from "./jobs/scheduler";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

// ─── Middleware ───────────────────────────────────────────────────
app.set("trust proxy", 1); // Trust first proxy (Render's load balancer)

// HTTPS enforcement in production
if (isProd) {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      return res.redirect(`https://${req.header("host")}${req.url}`);
    }
    next();
  });
}

app.use(
  helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    frameguard: { action: "deny" },
  })
);
app.use(
  cors({
    origin: isProd
      ? ["https://inboxiq-lmfv.onrender.com", "https://getinboxiq.app"]
      : ["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(morgan(isProd ? "combined" : "dev"));

// ─── Rate Limiting ──────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts, please try again later." },
});

const digestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many digest requests, please slow down." },
});

app.use("/api/", globalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/digests/", digestLimiter);

// ─── Routes ──────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/digests", digestRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/subscription", subscriptionRoutes);

// ─── Static Files (privacy policy, support page) ────────────────
app.use(express.static(path.join(__dirname, "..", "public")));

// ─── Health Check ────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "inboxiq-backend",
    timestamp: new Date().toISOString(),
  });
});

// ─── Debug Config (dev only) ────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.get("/debug/config", (_req, res) => {
    res.json({
      NODE_ENV: process.env.NODE_ENV,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      EXPO_DEV_URL: process.env.EXPO_DEV_URL || "(not set)",
      deepLinkScheme: process.env.EXPO_DEV_URL
        ? `${process.env.EXPO_DEV_URL}/--/auth?...`
        : "inboxiq://auth?...",
    });
  });
}

// ─── 404 Handler ────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
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
