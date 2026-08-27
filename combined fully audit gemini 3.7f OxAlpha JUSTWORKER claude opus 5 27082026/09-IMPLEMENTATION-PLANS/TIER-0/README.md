# 09 · Tier 0 Implementation Plans (Full Engineering Specifications)

> **Standard:** Production-grade engineering specifications including architectural root cause, exact line-by-line diffs, concurrency & security considerations, automated tests, manual cURL/probe verifications, and rollback procedures.
> **Scope:** 11 Immediate Critical Blockers (Days 1–2).

---

## 📋 Implementation Plans Index

| Plan | Target Bug / Area | Target Files | Effort |
|---|---|---|---|
| [**PLAN-P0-01**](./PLAN-P0-01-BACKEND-BUILD-FAILURE.md) | Backend TypeScript compilation & rewards lead validation | `main.ts`, `retention.route.ts`, `GamifiedRewardsWidget.tsx` | ⚡ 15 min |
| [**PLAN-P0-02**](./PLAN-P0-02-FINANCIAL-EVENT-BUS.md) | Financial event bus & vendor wallet credit on capture | `payment.service.ts`, `payment-reconciliation.service.ts`, `order.service.ts`, `order.subscriber.ts` | 🛠 2 h |
| [**PLAN-P0-03**](./PLAN-P0-03-STOREFRONT-TOKEN-BOUNDARY.md) | Storefront customer token isolation & room boundary | `storefront-auth.service.ts`, `jwt.ts`, `middlewares/index.ts`, `socket.gateway.ts` | 🛠 2.5 h |
| [**PLAN-P0-04**](./PLAN-P0-04-DOMAIN-TLS-HIJACKING.md) | Custom domain verification & TLS hijack prevention | `domain-verification.service.ts`, `store.route.ts`, `internal.route.ts` | 🛠 2 h |
| [**PLAN-P0-05**](./PLAN-P0-05-ADS-BALANCE-MINTING.md) | Ads auto-refill balance creation without payment | `ads.service.ts`, `ads.route.ts` | ⚡ 45 min |
| [**PLAN-P0-06**](./PLAN-P0-06-SETTINGS-SUPERADMIN-BYPASS.md) | Superadmin settings route permission guard bypass | `settings.routes.ts`, `platform-config.service.ts` | 🛠 1.5 h |
| [**PLAN-P0-07**](./PLAN-P0-07-MANDAT-RECEIPT-REVIEW.md) | Mandat receipt review bypasses `markPaidInTransaction` | `payment.route.ts`, `order.service.ts` | 🛠 2 h |
| [**PLAN-P0-08**](./PLAN-P0-08-NODEMAILER-DEPENDENCY.md) | Missing production dependency `nodemailer` | `backend/package.json` | ⚡ 15 min |
| [**PLAN-P0-09**](./PLAN-P0-09-WEBHOOK-HMAC-BYPASS.md) | Enforce webhook HMAC signatures unconditionally | `payment.route.ts` | ⚡ 30 min |
| [**PLAN-P0-10**](./PLAN-P0-10-STORED-XSS-SINKS.md) | Sanitize AI HTML descriptions & inspect drawer | `products/page.tsx`, `AiCostsDashboard.tsx` | ⚡ 45 min |
| [**PLAN-P0-11**](./PLAN-P0-11-SECRETS-FILE-LEAK.md) | Untrack `env-vars.json` & credential rotation plan | `env-vars.json`, `.gitignore` | ⚡ 30 min |
