# InboxIQ Project

## Project Overview
- **Frontend**: `inboxiq-frontend/` — Expo SDK 52, React Native, TypeScript
- **Backend**: `inboxiq-backend/` — Express, TypeScript, Supabase, Google OAuth
- **Production**: https://inboxiq-lmfv.onrender.com (Render), https://getinboxiq.app

## Backend Setup
- The backend entry point is `src/server.ts` (NOT `src/index.ts`). Always verify the correct entry point before starting the server.
- Start with: `cd inboxiq-backend && npm run dev`
- Before starting any server, check for port conflicts with `lsof -i :3000` and kill existing processes if needed.
- The backend runs on port 3000 locally, port 10000 in production (Render).
- Required env vars: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`

## Mobile Testing
- Apple/iOS credentials require interactive input — do NOT attempt non-interactive EAS iOS builds or TestFlight submissions. Flag to user instead.
- For Android emulators: always run `adb reverse tcp:3000 tcp:3000` and `adb reverse tcp:8081 tcp:8081` before testing.
- Always verify Expo Go version matches the SDK version before attempting to run.
- When running Expo on emulators, use `--clear` flag to avoid stale Metro cache issues.
- iOS simulator uses `exp://127.0.0.1:8081` (NOT the LAN IP).
- Android emulator uses `exp://localhost:8081`.
- Simulator interaction via AppleScript/simctl tap is unreliable. Prefer programmatic testing (API calls, backend logs) over trying to click UI elements.

## Performance Optimization Policy
- Before attempting performance optimizations, identify the actual bottleneck first (e.g., external API calls like Gemini). If the bottleneck is an external service, do NOT refactor internal code — flag the constraint to the user.
- Always create a git checkpoint before any optimization attempt: `git stash` or `git checkout -b experiment/<description>`.
- If changes don't produce measurable improvement or introduce errors after 2 attempts, revert immediately rather than iterating further.

## Git & Deploy
- Before committing, always check `git status` to verify there are actually uncommitted changes.
- Before pushing, verify GitHub is reachable with a quick `git ls-remote` to avoid wasted time during outages.
- Never commit `.env` files or files containing secrets.
- Production deploys to Render via auto-deploy on push to main.
- New env vars must be added manually in the Render dashboard.

## Risky Changes — Checkpoint First
- Before multi-file refactors, optimization attempts, or multi-approach debugging, create a git branch: `git checkout -b experiment/<description>`.
- If after 2 attempts something isn't working, revert to the checkpoint and try a fundamentally different approach instead of iterating on the same path.

## UI Changes
- When user requests size/spacing adjustments (e.g., "reduce height a little"), make conservative changes (10-15% reduction) and describe the exact pixel/value change made so user can request further adjustment in one shot.
- Always state the before and after values when making UI tweaks.
