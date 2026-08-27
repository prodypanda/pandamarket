# P0-09 · WEBHOOK-HMAC-BYPASS

### P0-9 · Webhook HMAC Signatures Bypassed Outside Production
- **Files:** `backend/src/api/payment.route.ts:216,247`
- **Evidence:** Non-production environments accept unsigned webhooks.
- **Fix Guide:** See [Guide H](../../06-IMPLEMENTATION-GUIDES/GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md).
