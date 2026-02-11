#!/bin/bash
# InboxIQ Security Audit — Headless Claude Script
# Usage: ./scripts/security-audit.sh [target_url]
#
# Runs a comprehensive security audit against the InboxIQ backend.
# Default target: https://inboxiq-lmfv.onrender.com

set -euo pipefail

TARGET_URL="${1:-https://inboxiq-lmfv.onrender.com}"
REPORT_FILE="security-audit-$(date +%Y%m%d-%H%M%S).json"

echo "=== InboxIQ Security Audit ==="
echo "Target: $TARGET_URL"
echo "Report: $REPORT_FILE"
echo ""

claude -p "Run a comprehensive security audit for the InboxIQ backend:

1. **Dependency Vulnerabilities**: Run \`npm audit\` in both inboxiq-frontend/ and inboxiq-backend/. Report any HIGH or CRITICAL findings.

2. **Code Security Review**:
   - Check for hardcoded secrets or API keys in source code (grep for patterns like API_KEY, SECRET, password, token in non-.env files)
   - Verify all error handlers return generic messages in production (no err.message leakage)
   - Verify CSP headers are set via Helmet
   - Verify CORS is not using wildcard origins
   - Verify rate limiting is configured
   - Verify JWT_SECRET is validated at startup with minimum length

3. **Token Security**: Verify Google OAuth tokens are encrypted at rest using AES-256-GCM (check crypto.ts utility and all read/write paths)

4. **Auth Security**:
   - Verify webhook endpoint rejects requests when secret is unset
   - Verify OAuth callback validates redirect URLs against an allowlist
   - Verify no open redirect vulnerabilities

5. **Production Endpoint Check**: Hit ${TARGET_URL}/health and verify it responds correctly.

Output a structured summary with:
- PASS/FAIL status for each check
- Details of any findings
- Overall security posture assessment
- Recommendations for any issues found" \
  --allowedTools "Bash(npm audit:*),Bash(curl:*),Read,Grep,Glob" \
  --output-format json > "$REPORT_FILE" 2>&1 || true

echo ""
echo "Audit complete. Results saved to: $REPORT_FILE"
