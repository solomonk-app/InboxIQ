import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { google } from "googleapis";
import { oauth2Client, getAuthUrl, GMAIL_SCOPES } from "../config/google";
import { supabase } from "../config/supabase";

const router = Router();

// ─── GET /api/auth/google ────────────────────────────────────────
// Returns the Google OAuth consent URL for the mobile app to open.
// Accepts optional query params:
//   callback_url - Override the OAuth callback URL (e.g. use Render HTTPS URL)
//   deep_link    - Deep link base URL to redirect to after auth (passed via state)
router.get("/google", (req: Request, res: Response) => {
  const callbackUrl = req.query.callback_url as string | undefined;
  const deepLink = req.query.deep_link as string | undefined;
  const url = getAuthUrl(callbackUrl, deepLink);
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
// Browser-redirect OAuth flow. Works on both localhost and production (Render).
// The redirect_uri for token exchange is determined from the request itself,
// so the same code works regardless of which host handles the callback.
// The `state` query param optionally carries the deep link base URL.
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  try {
    // Determine the callback URL from this request so token exchange works
    // whether the callback is on localhost or Render (behind a reverse proxy).
    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("host");
    const callbackUrl = `${proto}://${host}/api/auth/google/callback`;

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl
    );
    const { tokens } = await client.getToken(code as string);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
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

    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as string & jwt.SignOptions["expiresIn"] }
    );

    // Redirect back to mobile app via deep link
    const params = `token=${jwtToken}&name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}`;

    // Determine deep link target:
    // 1. If `state` was passed (from frontend), use it as the deep link base
    // 2. In production, use the custom scheme (inboxiq://)
    // 3. In development, use EXPO_DEV_URL if set (for Expo Go)
    let redirectTarget: string;
    // State is base64-encoded to avoid URL parsing issues with exp:// scheme
    let deepLinkBase: string | null = null;
    if (typeof state === "string" && state) {
      try {
        deepLinkBase = Buffer.from(state, "base64").toString("utf-8");
      } catch {
        deepLinkBase = state; // Fallback: use raw state if not base64
      }
    }

    if (deepLinkBase) {
      redirectTarget = `${deepLinkBase}/--/auth?${params}`;
    } else if (process.env.NODE_ENV === "production") {
      const ua = req.headers["user-agent"] || "";
      const isAndroid = /android/i.test(ua);
      if (isAndroid) {
        redirectTarget = `intent://auth?${params}#Intent;scheme=inboxiq;package=com.inboxiq.app;end`;
      } else {
        redirectTarget = `inboxiq://auth?${params}`;
      }
    } else if (process.env.EXPO_DEV_URL) {
      redirectTarget = `${process.env.EXPO_DEV_URL}/--/auth?${params}`;
    } else {
      redirectTarget = `inboxiq://auth?${params}`;
    }

    console.log("OAuth redirect target:", redirectTarget.substring(0, 80) + "...");

    // Use an HTML page with redirect methods.
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${redirectTarget}">
<title>InboxIQ</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff;text-align:center}a{color:#818cf8;font-size:18px;padding:16px 32px;border:2px solid #818cf8;border-radius:12px;text-decoration:none;display:inline-block;margin-top:20px}</style>
</head><body>
<div>
<p style="font-size:20px">Signing you in&hellip;</p>
<a id="link" href="${redirectTarget}">Tap here to open InboxIQ</a>
</div>
<script>
var target = ${JSON.stringify(redirectTarget)};
window.location.href = target;
</script>
</body></html>`);
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    res.removeHeader("Content-Security-Policy");
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html><html><head>
<meta charset="utf-8"><title>InboxIQ - Error</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0a0a0f;color:#fff;text-align:center}.err{color:#f87171;margin-top:12px}</style>
</head><body>
<div>
<p style="font-size:20px">Sign-in failed</p>
<p class="err">${(err?.message || String(err)).replace(/"/g, '&quot;')}</p>
<p style="color:#888">Please go back and try again.</p>
</div>
</body></html>`);
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
