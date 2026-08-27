## Guide H · Install Missing `nodemailer` Dependency (P0-8)
**Files:** `backend/package.json`

```bash
npm install nodemailer -w backend
```

---

## Guide I · Enforce Webhook HMAC Signatures in All Environments (P0-9)
**Files:** `backend/src/api/payment.route.ts:216,247`

Remove `if (config.env === 'production')` guard so HMAC is validated unconditionally.

---

## Guide J · Sanitize Stored XSS Sinks (P0-10)
**Files:** `frontend/src/app/hub/dashboard/products/page.tsx:6923`, `frontend/src/app/(admin)/ai-costs/AiCostsDashboard.tsx:3080`

Wrap `__html` with `DOMPurify.sanitize(...)`.

---

## Guide K · Untrack `env-vars.json` and Rotate Secrets (P0-11)
```bash
git rm --cached env-vars.json
echo "env-vars.json" >> .gitignore
git commit -m "security: untrack sensitive environment variables file"
```
