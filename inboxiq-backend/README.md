# 📬 InboxIQ — Backend

Node.js/Express/TypeScript API server for the InboxIQ Gmail Summarizer.

## Architecture

```
src/
├── config/          # Supabase + Google API clients
├── middleware/       # Auth (JWT) + error handler
├── routes/          # Express route definitions
├── services/        # Business logic (Gmail, Gemini AI, Digest, Notifications)
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
#    into the Supabase SQL Editor (Dashboard → SQL Editor)

# 4. Start development server
npm run dev
```

## Available Scripts

| Command         | Description                      |
|----------------|----------------------------------|
| `npm run dev`  | Start with hot-reload (ts-node-dev) |
| `npm run build`| Compile TypeScript to `dist/`    |
| `npm start`    | Run compiled production build    |

## API Endpoints

| Method | Endpoint                 | Auth | Description                          |
|--------|--------------------------|------|--------------------------------------|
| GET    | `/health`                | No   | Health check                         |
| GET    | `/api/auth/google`       | No   | Get Google OAuth consent URL         |
| GET    | `/api/auth/google/callback` | No | OAuth callback handler            |
| POST   | `/api/auth/push-token`   | No   | Register Expo push token             |
| GET    | `/api/emails`            | Yes  | List categorized emails              |
| GET    | `/api/emails/stats`      | Yes  | Category count breakdown             |
| POST   | `/api/digests/generate`  | Yes  | Manually trigger a digest            |
| GET    | `/api/digests/latest`    | Yes  | Get most recent digest               |
| GET    | `/api/digests/history`   | Yes  | Get past digests                     |
| GET    | `/api/settings/schedule` | Yes  | Get schedule preferences             |
| PUT    | `/api/settings/schedule` | Yes  | Update schedule preferences          |
| GET    | `/api/settings/profile`  | Yes  | Get user profile                     |

## Environment Variables

See `.env.example` for the full list. Key variables:

- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Supabase connection
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth 2.0
- `GEMINI_API_KEY` — Gemini AI for classification
- `JWT_SECRET` — Signing key for auth tokens
