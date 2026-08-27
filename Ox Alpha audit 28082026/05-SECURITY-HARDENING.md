# 05 — Security Hardening Checklist

> Posture is already strong (helmet+CSP+HSTS, CORS allowlist, raw-body HMAC, double-submit CSRF, brute-force lockout + TOTP 2FA with encrypted secrets & hashed recovery codes, refresh rotation + session binding, SSRF validation incl. DNS re-check & redirect blocking, parameterized SQL everywhere, signed-URL file uploads, global admin guard, RLS on all tables, 100% FK indexing). This file lists **what remains**.

---

## Secrets
- [ ] Untrack `env-vars.json` + purge git history + rotate all values inside ([P0-6](./01-BUGS-CRITICAL-P0.md)).
- [ ] Rotate `PD_JWT_SECRET`, `PD_COOKIE_SECRET` to 64-char random during pre-launch window (logs out users — schedule it). *(carried E7)*
- [ ] Rotate Supabase DB password (appeared in plaintext; also shared with S3 secret per Aug-3 report).
- [ ] `backend/.env` is committed and currently byte-equal to `.env.example` (no live values) — still remove from repo to kill the pattern: `git rm --cached backend/.env`.
- [ ] Add pre-commit secret scanning (gitleaks) in CI.

## Transport & headers
- [ ] DB TLS cert validation (`rejectUnauthorized:false` → pinned CA) [P1-16].
- [ ] CSP `script-src 'unsafe-inline'` (`frontend/src/lib/security-headers.ts:116`) — move to nonce/hash-based once Next supports it cleanly; keep report-only mode first.
- [ ] Wire CSP violations to existing `/api/csp-report` endpoint (`report-to`) and actually review reports. *(carried E8)*
- [ ] Broad image remotePatterns incl. plain-http wildcard tenant domains (`next.config.ts:42-110`) — drop http scheme for tenant domains.

## AuthN/AuthZ
- [ ] Session revocation check on sensitive routes [P1-13].
- [ ] Role-string comparisons duplicated across 3 layouts (`'admin'|'super_admin'|'Admin'|'SuperAdmin'`) — centralize one `isAdminRole()` helper.
- [ ] CSRF skip-list exact-match [P1-15]; keep X-PD-API-Key exemption only while CORS stays locked (document).
- [ ] KYC phone binding [P1-10].
- [ ] Revalidate endpoint scoping + timing-safe compare [P1-20].

## Payments integrity
- [ ] HMAC enforced in every env + real provider webhook secrets [P0-5].
- [ ] Gateway checks on mandat upload/review [P1-6] / [P0-2].
- [ ] Payment-state machine constraint (see E-2 idea) so raw SQL can't produce invalid transitions.

## Data protection
- [ ] AI provider key plaintext fallback removed [P1-17].
- [ ] `SELECT *` on PII tables → explicit column lists (gamified leads, storefront customers, verification docs). *(carried E9)*
- [ ] RLS: consider `FORCE ROW LEVEL SECURITY` for Supabase-facing roles if any non-owner role ever gets SQL access; today owner-connection bypass is intended.
- [ ] Log sanitization extension for PII/phone numbers in pino outputs. *(IDEAS I-series)*

## Abuse & fraud
- [ ] Rate-limit keying proxy contract asserted at boot [P1-14].
- [ ] Login lockout bypass when Redis down — add alert or DB fallback limiter (carried note from Aug-3 §4).
- [ ] Click-fraud dedup MVP for ads (fingerprint + sliding window, fail-open) *(IDEAS B3)*.
- [ ] Marketplace-order fraud queue [MW-20].

## Ops visibility
- [ ] Sentry alert rule [MW-45].
- [ ] Boot-time subsystem report ("configured/disabled — reason" per optional subsystem) *(E5)* — makes silent degradations visible.
- [ ] Synthetic monitoring of auth+checkout [MW-47].

---

### Verified-safe this audit (no action needed)
Webhook routes auth model · storefront receipt read scoping (`oi.store_id = $2 OR $3 = true`) · admin router global guard · files upload JWT purpose/content-type/size gating · socket handshake JWT auth · SSRF guards incl. DNS-recheck · parameterized SQL (no user-data interpolation found) · migration advisory locking · fail-open rate limiting design decision documented.
