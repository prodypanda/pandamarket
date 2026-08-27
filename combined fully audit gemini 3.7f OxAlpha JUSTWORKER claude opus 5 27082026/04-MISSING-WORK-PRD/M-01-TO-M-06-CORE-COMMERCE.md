# M-01 to M-06 · Core Commerce Infrastructure
### M-01 · Email delivery (blocks password reset, order confirmation, KYC result, everything)
**Status:** `PD_SMTP_*` and `PD_MAIL_FROM` are **not set on Render** (verified — only 16 env vars exist and none are SMTP). `email.worker.ts:618-644` correctly fails loudly with `email_not_delivered` in production rather than lying. Known blocker: Render's trial plan blocks outbound SMTP ports.

**How to finish**
1. Use an HTTP-API provider instead of SMTP — the code already supports `email_transport: 'brevo_api'` with `brevo_api_key` (`admin/smtp-config.routes.ts:28-29`). Brevo, Resend and Postmark all have free tiers and HTTP APIs that work on Render's trial.
2. Configure it through the standalone `/smtp-config` admin page (**not** the Settings→Email tab — see B-74, which would clobber it).
3. Fix B-49 (HTML escaping) before sending anything with vendor-controlled variables.
4. Send a real password reset end to end, and a real order confirmation once B-02 is fixed.
5. Add a delivery-outcome metric and an alert on `email_not_delivered > 0`.

---

### M-02 · Object storage (S3 → Cloudflare R2)
**Status:** deferred by you. Current state: `PD_S3_*` unset, so `publicBaseUrl` defaults to the relative path `/pd-product-images`, and `files.route.ts` + `main.ts:260-298` persist every upload into `pd_file_blobs` as a Postgres `bytea` column. Live: **547 blobs, 34 MB, the largest table in a 101 MB database**. Every cache miss after a deploy triggers a DB read + a disk write + possible `sharp` re-encode.

**How to finish (when you're ready)**
1. Create the R2 bucket + API token; set `PD_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, `PD_S3_ACCESS_KEY`, `PD_S3_SECRET_KEY`, `PD_S3_FORCE_PATH_STYLE=false`, `PD_S3_REGION=auto`, `PD_S3_PUBLIC_BASE_URL=https://cdn.<domain>`.
2. Write a one-shot migration script that streams `pd_file_blobs` → R2 and rewrites `pd_file_asset.url`, then drop the blob restore middleware at `main.ts:262-298`.
3. Fix B-52 (presigned size limits) in the same pass — R2 supports presigned POST with `content-length-range`.
4. Add `*.r2.cloudflarestorage.com` (already in the CSP `imgSrc` at `main.ts:165`) and the CDN host to `next.config.ts` `remotePatterns`.
5. Keep the `pd_file_blobs` table read-only for a rollback window, then drop it.

---

### M-03 · Meilisearch
**Status:** deferred by you. Note the finding that matters regardless of when you configure it: **the search query path never calls `searchService`** (B-77). Enabling Meili today would change nothing user-visible — it would index products that nothing queries. Decide the architecture before provisioning.

---

### M-04 · A real coupon system
**Status:** five hardcoded literals in `checkout-quote.service.ts:481-506`, duplicated in three other places (B-11), plus a `pd_seller_broadcast` lookup. The gamified spin mints `SPIN-XXXXXX` codes into `pd_gamified_lead` that **no redemption path reads** — they are decorative. Admin Settings has a "Gamified prizes" editor (`settings/page.tsx:1543-1585`) configuring prizes that the server-authoritative catalog (`cart.service.ts:59-64`) ignores.

**How to finish**
1. `pd_coupon`: `code` (unique, uppercase), `type` (`percentage|fixed|free_shipping`), `value`, `scope` (`order|store|product|category`), `store_id?`, `min_subtotal`, `max_discount`, `starts_at`, `expires_at`, `max_redemptions`, `max_per_customer`, `is_active`.
2. `pd_coupon_redemption`: `coupon_id`, `order_id` (unique together), `customer_id|storefront_customer_id`, `amount`, `redeemed_at`.
3. Resolve in `checkout-quote.service.calculateTotals` only; consume in `orderService.checkout` inside the transaction with a `FOR UPDATE` on the coupon row so `max_redemptions` can't be raced.
4. Migrate the 5 literals as seeded rows; point the gamified draw at `pd_coupon` so spin codes become real; make the admin prize editor the source of the catalog.
5. Delete the client-side and `cart.service.ts` coupon logic.

---

### M-05 · Withdrawal / payout approval workflow
**Status:** none (B-18). Business-model §3.2 specifies 7-day (Flouci/Konnect), 14-day (Mandat) and delivery-confirmed (COD) retention, plus a vendor choice between automatic and on-demand payout. Live wallets sit at `retention_days = 2` for 6 of 7 stores.

**How to finish**
1. `pd_withdrawal_request`: `store_id`, `amount`, `status` (`requested|approved|rejected|paid|failed`), `requested_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `payout_reference`, `idempotency_key` (unique).
2. Vendor `POST /wallet/me/withdrawals` creates a `requested` row and moves funds to a `reserved` bucket (so the balance can't be double-spent while pending).
3. Admin queue with approve/reject + typed confirmation; approval debits the wallet and writes the ledger row inside one transaction keyed by `idempotency_key`.
4. Rename the current admin page "Payout Ledger" and add the new queue beside it.
5. Implement per-gateway retention properly and stop `sync-retention` from flattening it.

---

### M-06 · Refund execution
See B-19. This is the single largest gap in the money flow: a seller can *request* a refund and nothing happens.

---
