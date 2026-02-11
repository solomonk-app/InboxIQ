Run a full dev environment check before starting work:

1. **Port check**: Run `lsof -i :3000 -i :8081 -i :19000 -i :19006` to find any stale processes. If any exist, report them and ask if I should kill them.

2. **Backend verification**:
   - Confirm `inboxiq-backend/src/server.ts` exists (the correct entry point)
   - Check that `inboxiq-backend/.env` exists and contains required vars: `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`
   - Do NOT print the values — just confirm presence

3. **Frontend verification**:
   - Check `inboxiq-frontend/package.json` exists
   - Run `cd inboxiq-frontend && npx expo --version` to confirm Expo CLI is available

4. **Emulator status**:
   - Run `xcrun simctl list devices booted` to check iOS simulators
   - Run `~/Library/Android/sdk/platform-tools/adb devices` to check Android emulators
   - If Android emulator is running, verify `adb reverse` is set up with `~/Library/Android/sdk/platform-tools/adb reverse --list`

5. **Git status**: Run `git status` to see the current branch and any uncommitted changes

Report all findings in a summary table before proceeding with any work.
