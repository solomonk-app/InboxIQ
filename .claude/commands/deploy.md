Run a phased deployment pipeline with verification gates between each step.

## Phase 1: Pre-flight Checks
- Run `git status` to verify there are changes to commit (if not, skip to Phase 4)
- Run `npx tsc --noEmit` in `inboxiq-backend/` to verify TypeScript compiles
- Run `npm audit` in both `inboxiq-frontend/` and `inboxiq-backend/` to check for vulnerabilities
- **STOP and report if any check fails**

## Phase 2: Commit
- Stage relevant files (never stage `.env` or credential files)
- Create a descriptive commit message summarizing the changes
- **Report the commit before proceeding**

## Phase 3: Push
- Verify GitHub is reachable: `git ls-remote origin HEAD`
- Push to main
- **STOP and report if push fails**

## Phase 4: Production Verification
- Wait 30 seconds for Render auto-deploy to trigger
- Hit `https://inboxiq-lmfv.onrender.com/health` to verify the backend is healthy
- Report the health check response
- If new env vars were added, remind the user to add them in the Render dashboard

## Phase 5: Summary
- Report: what was committed, what was pushed, production health status
- Flag any warnings or manual steps needed
