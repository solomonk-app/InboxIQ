# InboxIQ — Backend

Node.js/Express/TypeScript API server for the InboxIQ Gmail Summarizer.

## Architecture

```
src/
├── config/          # Supabase + Google API clients
├── middleware/       # Auth (JWT) + error handler
├── routes/          # Express route definitions
├── services/        # Business logic (Gmail, Gemini AI, Digest, Subscription)
├── jobs/            # Cron scheduler for automated digests
├── types/           # Shared TypeScript interfaces
└── server.ts        # Express app entry point

supabase/
└── migrations/      # SQL schema for PostgreSQL
```

## Prerequisites

- Node.js >= 18
- A [Supabase](https://supabase.com) project (free tier works)
- A Google Cloud project with:
  - **Gmail API** enabled
  - **Generative Language API** (Gemini) enabled
  - **OAuth 2.0 credentials** (Web application type)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with your keys

# 3. Run the Supabase migration
#    Option A: Via Supabase CLI
npx supabase db push

#    Option B: Paste supabase/migrations/001_initial_schema.sql
#    into the Supabase SQL Editor (Dashboard > SQL Editor)

# 4. Start development server
npm run dev
```

## Available Scripts

| Command         | Description                         |
|-----------------|-------------------------------------|
| `npm run dev`   | Start with hot-reload (ts-node-dev) |
| `npm run build` | Compile TypeScript to `dist/`       |
| `npm start`     | Run compiled production build       |

## API Endpoints

### Auth

| Method | Endpoint                        | Auth | Description                        |
|--------|---------------------------------|------|------------------------------------|
| GET    | `/api/auth/google`              | No   | Get Google OAuth consent URL       |
| GET    | `/api/auth/google/callback`     | No   | OAuth callback (browser redirect)  |
| POST   | `/api/auth/google/exchange`     | No   | Exchange auth code for token       |
| POST   | `/api/auth/push-token`          | No   | Register Expo push token           |

### Emails

| Method | Endpoint            | Auth | Description                          |
|--------|---------------------|------|--------------------------------------|
| GET    | `/api/emails`       | Yes  | List categorized emails (supports `category`, `limit`, `filter` query params) |
| GET    | `/api/emails/stats` | Yes  | Category count breakdown + total/unread/action stats |

### Digests

| Method | Endpoint                   | Auth | Description                          | Tier Gate |
|--------|----------------------------|------|--------------------------------------|-----------|
| POST   | `/api/digests/generate`    | Yes  | Trigger digest generation            | Free: 3/day, Pro: unlimited |
| GET    | `/api/digests/latest`      | Yes  | Get most recent digest               | — |
| GET    | `/api/digests/history`     | Yes  | Get past digests                     | — |
| POST   | `/api/digests/send-email`  | Yes  | AI-compose and send digest via email | Pro only |

### Settings

| Method | Endpoint                  | Auth | Description                          | Tier Gate |
|--------|---------------------------|------|--------------------------------------|-----------|
| GET    | `/api/settings/schedule`  | Yes  | Get schedule preferences             | Returns `tier_locked: true` for free |
| PUT    | `/api/settings/schedule`  | Yes  | Update schedule & delivery time      | Pro only |
| GET    | `/api/settings/profile`   | Yes  | Get user profile                     | — |

### Subscription

| Method | Endpoint                      | Auth | Description                     |
|--------|-------------------------------|------|---------------------------------|
| GET    | `/api/subscription`           | Yes  | Get tier, limits, and usage     |
| POST   | `/api/subscription/upgrade`   | Yes  | Upgrade tier (RevenueCat sync)  |

### Other

| Method | Endpoint  | Auth | Description  |
|--------|-----------|------|--------------|
| GET    | `/health` | No   | Health check |

## Subscription Tiers

| Feature            | Free          | Pro ($4.99/mo) |
|--------------------|---------------|----------------|
| Digest generation  | 3 per day     | Unlimited      |
| Send digest email  | Blocked       | Unlimited      |
| Auto scheduling    | Blocked       | Enabled        |
| Email categories   | All           | All            |

Usage is tracked in the `usage_tracking` table. The backend validates quotas on digest generation and gates email sending and scheduling behind the Pro tier.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable               | Description                          |
|------------------------|--------------------------------------|
| `PORT`                 | Server port (default: 3000)          |
| `SUPABASE_URL`         | Supabase project URL                 |
| `SUPABASE_SERVICE_KEY`  | Supabase service role key           |
| `GOOGLE_CLIENT_ID`     | Google OAuth 2.0 client ID           |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret       |
| `GOOGLE_REDIRECT_URI`  | OAuth callback URL                   |
| `GEMINI_API_KEY`       | Google Gemini AI API key             |
| `JWT_SECRET`           | Signing key for auth tokens          |
| `JWT_EXPIRES_IN`       | Token expiration (default: 7d)       |
| `SMTP_USER`            | Gmail sender address                 |
| `SMTP_APP_PASSWORD`    | Gmail app password for SMTP          |
| `EXPO_DEV_URL`         | Expo deep link URL for dev redirects |

## Android Emulator

When testing with an Android emulator, run this so the emulator can reach the backend on localhost:

```bash
adb reverse tcp:3000 tcp:3000
```
