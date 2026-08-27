# 01 · Technical Security Hardening
# 06 — Security Hardening & Regulatory Compliance

> **Context:** PandaMarket already exhibits strong security fundamentals (parameterized queries, bcrypt hashing, HTTP-only JWT cookies, CSRF protection, and RLS). This document details the remaining hardening steps and regulatory compliance requirements.

---

## 1. Secrets Management & Pre-Launch Rotation

- [ ] **Git History Secret Purge:**
  - Root file `env-vars.json` contains production tokens. Execute git purge and rotate all values:
    ```bash
    git rm --cached env-vars.json
    echo "env-vars.json" >> .gitignore
    ```
- [ ] **Pre-Launch Secret Rotation:**
  - Rotate `PD_JWT_SECRET` and `PD_COOKIE_SECRET` to 64-character cryptographically random strings.
  - Rotate Supabase PostgreSQL production password.
  - Rotate Redis production authorization key.
  - Rotate WhatsApp Evolution API token.
- [ ] **Automated Secret Scanning in CI:**
  - Add Gitleaks workflow in `.github/workflows/security.yml` to prevent accidental credential commits.

---

## 2. Network & Transport Security

- [ ] **Database TLS Pinning:**
  - Replace `ssl: { rejectUnauthorized: false }` in `backend/src/db/pool.ts:18` with the pinned Supabase root certificate authority (`PD_DATABASE_CA_CERT`) to eliminate MITM attack vectors.
- [ ] **CSP Header Hardening:**
  - In `frontend/src/lib/security-headers.ts`, transition `script-src` from `'unsafe-inline'` to nonce-based Content Security Policy once Next.js dynamic routing allows seamless nonce injection.
- [ ] **Proxy IP Whitelist Verification:**
  - Ensure Render/Vercel edge proxies overwrite rather than append to `X-Forwarded-For` headers so that `req.ip` cannot be spoofed by external callers.

---

## 3. Authentication & Access Control

- [ ] **Realtime Session Revocation Check:**
  - Maintain a lightweight Redis counter `pd:user_version:${userId}` checked on sensitive operations (password reset, 2FA modification, withdrawal submission, admin operations). Incrementing this key instantly invalidates all existing 15-minute access tokens.
- [ ] **Strict CSRF Route Matching:**
  - Replace substring matching (`req.path.includes('/callback')`) in `csrf.middleware.ts` with strict prefix matching against known external webhook routes.
- [ ] **Storefront ISR Purge Ownership Guard:**
  - Ensure `POST /api/storefront/revalidate` verifies that the requesting vendor owns the target store hostname before triggering ISR cache purges.

---

## 4. Payments & Financial Protection

- [ ] **Enforce Webhook HMAC in All Environments:**
  - Remove the `config.env === 'production'` condition in `backend/src/api/payment.route.ts`. Webhook requests with invalid signatures must be rejected with HTTP 401 across all environments.
- [ ] **Mandat Gateway Verification:**
  - Enforce that `order.payment_gateway === PaymentGateway.ManualMandat` on receipt upload and review, preventing cash-on-delivery or card orders from being approved via receipt spoofing.
- [ ] **Database Constraint Payment State Machine:**
  - Enforce valid transitions on `pd_order.payment_status` (`pending` ➔ `requires_review` ➔ `captured` ➔ `refunded`). Invalid raw SQL state skips will trigger a database constraint violation.

---

## 5. Regulatory Compliance: Tunisian Law n° 2004-63 (PDP)

PandaMarket processes merchant and buyer data within the Tunisian territory. Compliance with **Loi organique n° 2004-63 du 27 juillet 2004** (Protection des données à caractère personnel) is mandatory:

### A. Consent & Information Obligation (Articles 6 to 12)
- [ ] **Cookie Consent Banner:**
  - Visitors must provide explicit opt-in consent before tracking scripts (Meta Pixel, Google Tag Manager) load in the browser.
  - Provide granular toggles: *Essentiels* (always active), *Analytiques*, *Marketing*.

### B. Rights of Access, Rectification & Deletion (Articles 32 to 38)
- [ ] **Self-Service Data Export (DSAR):**
  - Add a "Télécharger mes données personnelles" button in `/hub/profile` exporting an encrypted JSON package containing profile info, address history, and order logs.
- [ ] **Automated Anonymization Worker:**
  - When an account is deleted, personal identifying information (email, phone, exact address, IP logs) must be scrubbed or pseudonymized while retaining aggregated financial totals for tax/VAT accounting.

### C. Declaration to INPDP (Instance Nationale de Protection des Données Personnelles)
- [ ] Ensure official processing declarations are submitted to the INPDP prior to launching live commercial processing of merchant identity documents (CIN, Registre de Commerce) in production.
