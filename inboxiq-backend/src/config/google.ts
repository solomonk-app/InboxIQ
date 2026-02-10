import { google } from "googleapis";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// ─── Google OAuth2 Client ────────────────────────────────────────
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for Gmail read access + user profile
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// Generate the Google OAuth consent URL
export const getAuthUrl = (redirectUri?: string, state?: string): string => {
  const client = redirectUri
    ? new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      )
    : oauth2Client;
  return client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
    state,
  });
};

// Create an authenticated Gmail client for a specific user's tokens.
// Handles token refresh automatically and saves new tokens to the database.
export const createGmailClient = (accessToken: string, refreshToken: string, userId?: string) => {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // When the access token is refreshed, save the new token to the database
  if (userId) {
    auth.on("tokens", async (tokens) => {
      console.log("OAuth tokens refreshed for user", userId);
      const { supabase } = await import("./supabase");
      await supabase
        .from("users")
        .update({
          google_access_token: tokens.access_token,
          ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token }),
          ...(tokens.expiry_date && { token_expiry: new Date(tokens.expiry_date).toISOString() }),
        })
        .eq("id", userId);
    });
  }

  return google.gmail({ version: "v1", auth });
};

// ─── Gemini AI Client ────────────────────────────────────────────
if (!process.env.GEMINI_API_KEY) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    temperature: 0.3,
    topP: 0.8,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
  },
});
