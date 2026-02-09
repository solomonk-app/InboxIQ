import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { oauth2Client, getAuthUrl, GMAIL_SCOPES } from "../config/google";
import { supabase } from "../config/supabase";

const router = Router();

// ─── GET /api/auth/google ────────────────────────────────────────
// Returns the Google OAuth consent URL for the mobile app to open
// Accepts an optional redirect_uri query param for mobile OAuth flow
router.get("/google", (req: Request, res: Response) => {
  const redirectUri = req.query.redirect_uri as string | undefined;
  const url = getAuthUrl(redirectUri);
  res.json({ url });
});

// ─── POST /api/auth/google/exchange ─────────────────────────────
// Mobile OAuth flow: frontend sends the auth code, backend exchanges it
async function handleExchange(code: string, redirectUri: string, res: Response) {
  // Create a client with the mobile app's redirect URI
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Get user profile info from Google
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.email) {
    res.status(400).json({ error: "Unable to retrieve email from Google" });
    return;
  }

  // Upsert user in Supabase
  const { data: user, error } = await supabase
    .from("users")
    .upsert(
      {
        email: profile.email,
        name: profile.name || "",
        avatar_url: profile.picture || "",
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        last_login: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error || !user) {
    console.error("User upsert failed:", error);
    res.status(500).json({ error: "Failed to create or update user" });
    return;
  }

  // Create default schedule preferences for new users
  await supabase.from("schedule_preferences").upsert(
    {
      user_id: user.id,
      frequency: "daily",
      delivery_time: process.env.DEFAULT_DIGEST_TIME || "08:00",
      is_active: true,
    },
    { onConflict: "user_id" }
  );

  // Generate JWT for the mobile app
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string & jwt.SignOptions["expiresIn"] }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
    },
  });
}

router.post("/google/exchange", async (req: Request, res: Response) => {
  const { code, redirect_uri } = req.body;

  if (!code || !redirect_uri) {
    res.status(400).json({ error: "Missing code or redirect_uri" });
    return;
  }

  try {
    await handleExchange(code, redirect_uri, res);
  } catch (err) {
    console.error("OAuth exchange error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// ─── GET /api/auth/google/callback ───────────────────────────────
// Legacy browser-redirect flow (still works for iOS/web)
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      res.status(400).json({ error: "Unable to retrieve email from Google" });
      return;
    }

    const { data: user, error } = await supabase
      .from("users")
      .upsert(
        {
          email: profile.email,
          name: profile.name || "",
          avatar_url: profile.picture || "",
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          token_expiry: tokens.expiry_date
            ? new Date(tokens.expiry_date).toISOString()
            : null,
          last_login: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error || !user) {
      console.error("User upsert failed:", error);
      res.status(500).json({ error: "Failed to create or update user" });
      return;
    }

    await supabase.from("schedule_preferences").upsert(
      {
        user_id: user.id,
        frequency: "daily",
        delivery_time: process.env.DEFAULT_DIGEST_TIME || "08:00",
        is_active: true,
      },
      { onConflict: "user_id" }
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string & jwt.SignOptions["expiresIn"] }
    );

    // Redirect back to mobile app via deep link
    const params = `token=${token}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;

    // In production, always use the custom scheme (inboxiq://)
    // In development, use EXPO_DEV_URL if set (for Expo Go)
    let deepLink: string;
    if (process.env.NODE_ENV === "production") {
      deepLink = `inboxiq://auth?${params}`;
    } else if (process.env.EXPO_DEV_URL) {
      deepLink = `${process.env.EXPO_DEV_URL}/--/auth?${params}`;
    } else {
      deepLink = `inboxiq://auth?${params}`;
    }

    console.log("OAuth callback redirecting to:", deepLink.substring(0, 60) + "...");

    // Use an HTML page with meta-refresh + JS redirect instead of 302.
    // Android Chrome Custom Tabs often block 302 redirects to custom
    // URI schemes (inboxiq://) and show "connection is not secure".
    // Remove CSP header so the inline script and meta-refresh work.
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${deepLink}">
  <title>Signing in...</title>
</head>
<body>
  <p style="font-family:sans-serif;text-align:center;margin-top:40px">Signing you in&hellip;</p>
  <p style="font-family:sans-serif;text-align:center"><a href="${deepLink}">Tap here if not redirected</a></p>
  <script>window.location.href="${deepLink}";</script>
</body>
</html>`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// ─── POST /api/auth/push-token ───────────────────────────────────
router.post("/push-token", async (req: Request, res: Response) => {
  const { userId, pushToken } = req.body;

  if (!userId || !pushToken) {
    res.status(400).json({ error: "Missing userId or pushToken" });
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({ expo_push_token: pushToken })
    .eq("id", userId);

  if (error) {
    res.status(500).json({ error: "Failed to save push token" });
    return;
  }

  res.json({ success: true });
});

export default router;
