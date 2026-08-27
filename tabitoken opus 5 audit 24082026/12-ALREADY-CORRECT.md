# 12 — Already Correct (Do Not Regress)

The commerce core is genuinely solid. This document records what is **done right**, so that a future change — or a
future audit — does not "fix" something that isn't broken. Treat each item as an invariant to preserve.

Back to [README](./README.md) · [Verification Gaps](./11-VERIFICATION-GAPS.md)

---

## Authentication

| Invariant | Evidence |
| --- | --- |
| **No JWT in `localStorage`.** Tokens live only in httpOnly cookies. | frontend auth flow |
| `pd_at` access token = **15 min**; `pd_rt` refresh token = **7 days**, both httpOnly. | cookie config |
| Socket auth uses a **short-lived token** from `/api/pd/auth/socket-token`, verified server-side. | `socket-gateway.ts:38` |
| Refresh flow is deduplicated, single-retry, and excludes auth endpoints. | `lib/api.ts:56-79` |

> [!CAUTION]
> Do not move tokens to `localStorage` for convenience. The httpOnly cookie model is the reason an XSS in the CMS
> render path (see [P1-5](./03-BUGS-P1-HIGH.md)) cannot trivially steal a session.

---

## Payments

| Invariant | Evidence |
| --- | --- |
| Webhook HMAC verified with a **length-check before `timingSafeEqual`**. | payment webhook handler |
| `rawBody` preserved for signature verification. | `main.ts:206` |
| Idempotency keyed by `(gateway, gateway_reference)`. | payment service |
| `payment.service.ts` **throws** on `signatureValid === false` — defence in depth behind the route guard. | `payment.service.ts:789-795` |
| PayPal `verifyWebhookSignature` **fails closed** on a missing `webhookId`. | `paypal.provider.ts:224-227` |
| Shipping webhooks require `rawBody` and verify HMAC per carrier adapter before accepting events. | shipping adapters |

> [!IMPORTANT]
> The payment webhook stack is the strongest part of the codebase. When splitting `admin.route.ts` or refactoring
> services, keep `rawBody` preservation (`main.ts:206`) intact — moving body-parsing middleware ahead of it would
> silently break every signature check.

---

## Authorization & data exposure

| Invariant | Evidence |
| --- | --- |
| `router.use(requireAuth, requireAdmin)` covers **all 225 admin routes**. Verified live: `401` without auth. | `admin.route.ts:66` |
| Every `pd_*` table has a **primary key**. | DB introspection |
| Supabase PostgREST is **not publicly readable** (401 without a key). | live probe |

> [!NOTE]
> The single blanket `requireAuth, requireAdmin` at the router root is exactly the right pattern — it means a newly
> added admin route is protected by default. Preserve this when splitting the file per [E15](./07-ENHANCEMENTS.md):
> each sub-router must re-apply the guard, or mount under a parent that does.

---

## Build & quality signals

| Invariant | Evidence |
| --- | --- |
| Backend type-check clean. | `npm run type-check -w backend` → 0 errors |
| Frontend type-check clean. | `tsc --noEmit` → 0 errors |
| 417 frontend tests green. | `vitest run` |
| `robots.txt` and `sitemap.xml` serve correctly. | live probe `200` |

---

## Corrected non-issues

Two earlier concerns were investigated and found to be **fine** — do not "fix" them (full detail in
[11-VERIFICATION-GAPS.md](./11-VERIFICATION-GAPS.md)):

1. **No migration drift.** 95 up-migrations, 95 `pd_migrations` rows, empty set-difference. Schema fully applied.
2. **`platformConfigService.getSettings()` is properly cached** (30 s memory + 60 s Redis). The `wishlist.route.ts`
   per-request concern was unfounded.

---

> [!TIP]
> Before merging any refactor that touches auth, payments, or the admin router, re-run the four probes in
> [10-EVIDENCE-AND-METHOD.md](./10-EVIDENCE-AND-METHOD.md) that returned `401`/`403`. If any now returns `200`
> unauthenticated, a guard was lost.
