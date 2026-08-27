# 03 — High-Priority Bugs (P1)

> **Priority Standard:** Functional defects that compromise user experience, multi-tenant boundaries, or system predictability, but do not directly halt server boot or cause instant catastrophic money loss.

---

## 1. Realtime, Auth & Frontend Lifecycles

### [P1-1] Frontend Docker Build is Broken (Standalone Output Not Configured)
- **Forensic Evidence:** `frontend/Dockerfile:37` attempts to copy `.next/standalone`, and line 48 runs `node frontend/server.js`. However, `frontend/next.config.ts` never sets `output: 'standalone'`.
- **Impact:** Any automated container build for the frontend fails.
- **How to Fix:** In `frontend/next.config.ts`, add `output: 'standalone'`. Verify `docker build -f frontend/Dockerfile .` passes.

---

### [P1-2] Socket.IO Connection Dead for Users Who Log In After Page Load
- **Forensic Evidence:** In `frontend/src/contexts/SocketContext.tsx:43-60`:
  ```typescript
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithCsrf('/api/pd/auth/socket-token', { credentials: 'include' });
        const data = await res.json();
        if (data?.token) setToken(data.token);
      } catch { ... }
    })();
  }, []); // Only runs once on mount!
  ```
  `setToken` is exported by the context, but is never invoked by login forms (`RoleScopedLoginPage`, `/login/buyer`, `/login/seller`).
- **Impact:** If an anonymous shopper or merchant opens the site and logs in, no WebSocket connects. Real-time chat messages, order alerts, and notification bell updates remain silent until a hard browser refresh.
- **How to Fix:** 
  1. In `frontend/src/lib/api.ts` (inside `login` success handlers and `fetchWithCsrf` 401 refresh), trigger a custom event `window.dispatchEvent(new Event('pd_auth_state_changed'))`.
  2. In `SocketContext.tsx`, listen to this event and re-fetch `/api/pd/auth/socket-token`.
  3. On logout, call `socket.disconnect()` and reset `token` to `null`.

---

### [P1-3] `useSocket.on` Drops Listeners Registered Pre-Connection
- **Forensic Evidence:** In `frontend/src/hooks/useSocket.ts:138-151`:
  ```typescript
  const on = useCallback((event: string, handler: (payload: unknown) => void) => {
    const socket = socketRef.current;
    if (!socket) {
      // Return a no-op unsubscribe if socket isn't ready
      return () => {};
    }
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);
  ```
- **Impact:** React components registering event listeners on mount (e.g. Chat inbox, Order notification toast) call `on()` before the async WebSocket finishes handshaking. `socketRef.current` is null, so the listener is dropped permanently.
- **How to Fix:** Maintain a queue `pendingListenersRef.current: Array<{ event, handler }>` in `useSocket.ts`. When `socket.on('connect')` fires, drain the queue and attach all pending listeners. Ensure the returned unsubscribe function removes handlers from both the active socket and the pending queue.

---

## 2. Commerce & Checkout Invariants

### [P1-4] Hardcoded Client-Side Coupon Engine
- **Forensic Evidence:** `frontend/src/contexts/CartContext.tsx:81-94` and `181-206`:
  ```typescript
  if (cleanCoupon === 'CHANCE5DT') disc = Math.min(subtotal, 5.000);
  else if (cleanCoupon === 'LIVRAISON_ZERO') disc = baseShipping;
  else if (cleanCoupon === 'PANDA10') disc = Math.round(subtotal * 0.1 * 1000) / 1000;
  else if (cleanCoupon === 'SUPER15' && subtotal >= 80.000) disc = 15.000;
  else if (cleanCoupon === 'FIDELITE5') disc = Math.round(subtotal * 0.05 * 1000) / 1000;
  ```
  `checkout-quote.service.ts:481-506` repeats these exact strings. There is no `pd_coupon` table for seller-created promotions, usage limits, or start/expiry windows.
- **Impact:** No merchant can issue custom discount codes; coupons are public knowledge; discounts in cart can diverge from final order charge totals.
- **How to Fix:**
  1. Add a database migration for `pd_coupon` (`id`, `store_id`, `code`, `discount_type`, `discount_value`, `min_order_amount`, `max_uses`, `used_count`, `starts_at`, `expires_at`, `is_active`).
  2. Implement `checkoutQuoteService.applyCoupon` against the database table.
  3. Remove client-side calculation from `CartContext.tsx`. The client should only pass `coupon_code` to the server quote endpoint and display the server-returned discount.

---

### [P1-5] Hardcoded 7 TND Shipping Constant in UI Files
- **Forensic Evidence:** `frontend/src/app/store/[storeHost]/cart/page.tsx:20`:
  ```typescript
  const SHIPPING_PER_VENDOR = 7;
  ```
  `CartContext.tsx:72-74`:
  ```typescript
  const shippingSavings = storeCount > 1 ? (storeCount - 1) * 3.000 : 0;
  ```
- **Impact:** If an administrator changes default shipping rates in Superadmin settings or a vendor sets custom shipping rules, cart displays wrong amounts until checkout.
- **How to Fix:** Expose a public, cached endpoint `GET /api/pd/shipping/rates`. Refactor cart components to fetch shipping rates dynamically.

---

### [P1-6] Mandat Proof Upload Accepted for Any Payment Gateway
- **Forensic Evidence:** In `backend/src/api/payment.route.ts:185-208`:
  ```typescript
  const order = await orderService.getById(order_id);
  if (order.customer_id !== req.user!.id) {
    res.status(403).json({ error: { message: 'Forbidden' } });
    return;
  }
  const proof = await mandatService.uploadProof({ ... });
  ```
- **Impact:** A buyer who placed an order via Flouci or Konnect can upload a fake receipt to `/mandat/upload`. If an admin approves it, the order is marked paid without card payment.
- **How to Fix:** Add check: `if (order.payment_gateway !== PaymentGateway.ManualMandat) throw new PdValidationError('Order does not use manual mandat payment')`.

---

## 3. AI Workers & Billing Integrity

### [P1-7] AI Product Tagging Jobs Leak Tokens & Stick in `processing`
- **Forensic Evidence:** In `backend/src/workers/ai.worker.ts:223-228`:
  ```typescript
  if (jobType === 'product_tagging' || jobType === 'tag_product') {
    const productId = job.data.product_id || (job.data as any).productId;
    const taggingResult = await aiProductTaggerService.tagProduct(productId, { storeId: job.data.store_id });
    return taggingResult as any; // Early return before credit deduction and markCompleted!
  }
  ```
- **Impact:** Product tagging jobs marked `processing` at line 218 never transition to `completed`. Token consumption is skipped, and no completion event is emitted.
- **How to Fix:** Remove the early return. Set `output = taggingResult` and allow execution to fall through to lines 242-252 where credits are consumed and `aiService.markCompleted` is called.

---

### [P1-8] AI Credits Consumed After LLM Generation Finishes
- **Forensic Evidence:** `backend/src/workers/ai.worker.ts:244`:
  ```typescript
  await creditsService.consume(job.data.store_id, cost);
  ```
  Credits are consumed post-generation. Balance is only checked at queue time (`ai.service.ts:86`).
- **Impact:** If the worker crashes or restarts right after LLM generation, or if concurrent jobs run, tokens are never billed, driving credit balances negative.
- **How to Fix:** Implement a two-phase reservation pattern: call `creditsService.reserve(storeId, cost)` when queuing the job. On success, commit the reservation; on failure, release it.

---

## 4. Multi-Tenant & Security Controls

### [P1-9] Wallet `retention_days` Clobbered Globally Per Credit
- **Forensic Evidence:** `backend/src/services/wallet.service.ts:113-118`:
  ```typescript
  await c.query(
    `UPDATE pd_vendor_wallet
     SET pending_balance = pending_balance + $2,
         total_earned = total_earned + $2,
         retention_days = $3
     WHERE id = $1`,
    [wallet.id, amount, retentionDays],
  );
  ```
- **Impact:** When a transaction has a method-specific retention (e.g. 1-day for Mandat), the store's default wallet retention setting is overwritten for all future orders.
- **How to Fix:** Remove `retention_days = $3` from the `UPDATE pd_vendor_wallet` query. Store method-specific retention exclusively in `pd_wallet_transaction.available_at`.

---

### [P1-10] KYC Phone OTP Not Bound to Submitted Phone Number
- **Forensic Evidence:** In `backend/src/api/verification.route.ts:68-78`:
  ```typescript
  const valid = await smsService.verifyOtp(req.body.phone_number, req.body.otp);
  if (!valid) return res.status(400)...;
  const verification = await kycService.getByStore(req.user!.store_id!);
  if (verification) await kycService.markPhoneVerified(verification.id);
  ```
- **Impact:** A vendor can verify an OTP on any arbitrary phone number (e.g. burner phone), and the system marks the legal business KYC record as phone-verified.
- **How to Fix:** Assert that `req.body.phone_number` exactly matches `verification.submission.phone_number` (or the store's registered phone number) before marking verified.

---

### [P1-11] Subscription Expiry Warnings Spam Daily (No Deduplication)
- **Forensic Evidence:** In `backend/src/workers/subscription.worker.ts:107-155`:
  The query matches `subscription_expires_at BETWEEN 6_days_now AND 7_days_now` without checking whether a warning has already been sent.
- **Impact:** If the cron job triggers more than once per day or clock drifts, duplicate warning emails spam the merchant. Furthermore, 3-day and 1-day urgent warnings do not exist.
- **How to Fix:** Add a column `last_warning_sent_at` and `warning_bucket` (`7d`, `3d`, `1d`) on `pd_store_subscription`. Enforce one notification per bucket.

---

### [P1-12] `requireStore` Silent Fallback to First Store for Multi-Store Vendors
- **Forensic Evidence:** In `backend/src/middlewares/index.ts:234-249`:
  If neither cookie nor header provides a `store_id`, it falls back to `SELECT id FROM pd_store WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1`.
- **Impact:** Multi-store merchants inadvertently create products or modify settings on their oldest store without noticing.
- **How to Fix:** If the merchant owns > 1 store and no valid store context is provided, return `409 Conflict` with code `PD_STORE_SELECTION_REQUIRED`.

---

### [P1-13] Session Revocation Latency Up to 15 Minutes
- **Forensic Evidence:** Access tokens (`pd_at`) are stateless JWTs with 15-minute expiry. `auth.service.ts` validates sessions only during refresh (`pd_rt`).
- **Impact:** If an account is suspended or a user changes their password, revoked tokens remain valid for up to 15 minutes.
- **How to Fix:** Maintain a fast Redis check `pd:user_version:${userId}` on sensitive mutating routes (password change, 2FA toggle, withdrawal requests, admin actions).

---

### [P1-14] Rate-Limit Client IP Spoofing via Custom XFF
- **Forensic Evidence:** `backend/src/middlewares/index.ts:314-326`: `clientBucketKey` prefers `req.headers['x-forwarded-for']?.split(',')[0]`.
- **Impact:** An attacker can rotate spoofed `X-Forwarded-For` headers to bypass IP rate limits on auth and checkout endpoints.
- **How to Fix:** Use `req.ip` directly (guaranteed by Express `trust proxy` setting).

---

### [P1-15] CSRF Middleware Path Substring Bypass
- **Forensic Evidence:** In `backend/src/middlewares/csrf.middleware.ts:61-70`:
  ```typescript
  if (
    req.path.includes('/webhook/') ||
    req.path.includes('/callback') ||
    req.path.includes('/cart/sync')
  ) { return next(); }
  ```
- **Impact:** Any route with the substring `/callback` (e.g. `/api/pd/admin/settings/callback`) bypasses CSRF token checks completely.
- **How to Fix:** Replace `path.includes(...)` with strict route prefix matching (`path === prefix || path.startsWith(prefix + '/')`).

---

### [P1-16] Database TLS Without Certificate Validation
- **Forensic Evidence:** `backend/src/db/pool.ts:18` sets `ssl: { rejectUnauthorized: false }`.
- **Impact:** Vulnerable to Man-in-the-Middle (MITM) attacks between Render and Supabase.
- **How to Fix:** Pin the Supabase CA certificate via `PD_DATABASE_CA_CERT` and set `rejectUnauthorized: true`.

---

### [P1-17] Plaintext Fallback Returns Ciphertext as API Key on Decrypt Failure
- **Forensic Evidence:** In `backend/src/services/ai-config.service.ts:71-87`:
  If AES-GCM decryption fails and `trimmed.length >= 8`, it returns the raw encrypted string `iv:tag:ciphertext` as the provider API key.
- **Impact:** Upstream AI API calls fail with confusing 401 errors, masking key decryption errors.
- **How to Fix:** Throw `PdValidationError('Failed to decrypt AI provider key; re-enter key in admin console')` instead of returning ciphertext.

---

### [P1-18] SEO `metadataBase` / Canonical Falls Back to `garbage.team` in Production
- **Forensic Evidence:** `frontend/src/app/layout.tsx:69` and `frontend/src/lib/store-hosts.ts:150-165`.
- **Impact:** If environment variables are missing, canonical search engine indexing permanently targets the development domain.
- **How to Fix:** Enforce a build-time check in `next.config.ts`: throw an error during production builds if `NEXT_PUBLIC_HUB_URL` or `NEXT_PUBLIC_MARKETPLACE_DOMAIN` is unset.

---

### [P1-19] Hardcoded Production Backend URL + 48× `localhost:9000` Fallbacks
- **Forensic Evidence:** `LIVE_BACKEND_URL = 'https://pandamarket-backend-fjom.onrender.com'` in `frontend/src/lib/api.ts:10`. 48 occurrences of `http://localhost:9000` across 16 frontend files.
- **Impact:** Local development and test runners accidentally make API calls against production.
- **How to Fix:** Consolidate API base resolution into a single file `frontend/src/lib/backend-base.ts`. Add an ESLint rule banning raw `localhost:9000` string literals.

---

### [P1-20] Storefront ISR Revalidate Cross-Tenant Purge & Timing Attack
- **Forensic Evidence:** `frontend/src/app/api/storefront/revalidate/route.ts:60-72`:
  Allows any logged-in vendor to pass arbitrary hostnames and purge their ISR tags. Secret check uses `===` (vulnerable to timing attacks).
- **Impact:** A merchant can maliciously flush competitor storefront caches continuously.
- **How to Fix:** Query backend to assert that the authenticated seller owns the target hostnames. Use `crypto.timingSafeEqual` for secret validation.

---

### [P1-21] Duplicate Migration Prefixes in Database Migrations
- **Forensic Evidence:** `backend/src/migrations/sql/` has duplicate numbers for `025`, `026`, `027`, `028`, `029`, and `032`.
- **Impact:** Running migrations on a fresh database produces non-deterministic ordering.
- **How to Fix:** Renumber duplicate migration files sequentially and ensure new migrations adopt ISO timestamp prefixes.
