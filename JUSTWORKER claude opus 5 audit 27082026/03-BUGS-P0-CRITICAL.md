# 03 · Bugs — P0 Critical

[← Index](./00-README.md) · Prev: [02 Architecture](./02-ARCHITECTURE-AND-LIVE-STATE.md) · Next: [04 P1 High](./04-BUGS-P1-HIGH.md)

**Definition of P0:** blocks deployment, or allows an attacker to cross a tenant boundary, create
money, or escalate privilege. Six findings.

| # | Title | Effort | Guide |
| --- | --- | --- | --- |
| [B-00](#b-00) | Backend does not compile — `retentionRouter` mounted, never imported | ⚡ 5 min | [A](./09-IMPLEMENTATION-GUIDES.md#guide-a) |
| [B-01](#b-01) | Storefront customer tokens are marketplace user tokens with the vendor's `store_id` | ~3 h | [B](./09-IMPLEMENTATION-GUIDES.md#guide-b) |
| [B-02](#b-02) | Seven core domain events subscribed but never emitted | ~4 h | [C](./09-IMPLEMENTATION-GUIDES.md#guide-c) |
| [B-03](#b-03) | A seller can self-verify any custom domain and obtain TLS for it | ~2 h | [D](./09-IMPLEMENTATION-GUIDES.md#guide-d) |
| [B-04](#b-04) | Ads auto-refill credits account balance with no payment | ⚡ 30 min | [E](./09-IMPLEMENTATION-GUIDES.md#guide-e) |
| [B-05](#b-05) | `PUT /admin/settings` bypasses the SuperAdmin finance/security guard | ~1 h | [F](./09-IMPLEMENTATION-GUIDES.md#guide-f) |

---

## B-00

### The backend does not compile right now (uncommitted work in your tree)

**Severity:** P0 blocker · **Discovered by:** running the type-checker

```
$ npx tsc --noEmit          # in backend/
src/api/retention.route.ts(12,24): error TS6133: 'validate' is declared but its value is never read.
src/api/retention.route.ts(17,7):  error TS6133: 'rewardsLeadSchema' is declared but its value is never read.
src/main.ts(345,31):               error TS2304: Cannot find name 'retentionRouter'.
```

`git status` shows `backend/src/api/retention.route.ts` as **untracked** and `backend/src/main.ts`
as modified. `main.ts:345` adds:

```ts
apiRouter.use('/retention', retentionRouter);
```

…but no `import retentionRouter from './api/retention.route';` was added to the import block.

The new route file also defines `rewardsLeadSchema` and imports `validate`, then never applies
either:

```ts
// backend/src/api/retention.route.ts:32-43
router.post(
  '/rewards-lead',
  asyncHandler(async (req: Request, res: Response) => {   // ← no validate(rewardsLeadSchema)
    const result = await cartService.recordGamifiedLead({ … });
```

**Second, independent defect in the same feature.** Live probe:

```
POST https://pandamarket-backend-fjom.onrender.com/api/pd/retention/rewards-lead
     {"email":"probe@example.com","game_type":"scratch_card"}
→ 403
```

The consumer at `frontend/src/components/retention/GamifiedRewardsWidget.tsx:334` posts
fire-and-forget without a CSRF header, and `/retention/` is not in the exemption list at
`middlewares/csrf.middleware.ts:61-71`. So even once it compiles, it returns 403 for every caller.

**Impact.** CI (`.github/workflows/ci.yml` → `npm run type-check` in `backend/`) fails. The Render
deploy fails. Nothing ships until this is fixed.

**Do not** solve the 403 by adding a CSRF exemption. The previous P0 in this exact feature area
(`/cart/gamified-spin`) was caused by an explicit CSRF exemption.

**Fix →** [Guide A](./09-IMPLEMENTATION-GUIDES.md#guide-a)

**Acceptance criteria**
- [ ] `npx tsc --noEmit` in `backend/` exits 0
- [ ] `node scripts/api-contract-audit.cjs` still passes
- [ ] `POST /api/pd/retention/rewards-lead` from the widget returns `201`, and a malformed body returns `400`
- [ ] `POST /api/pd/retention/rewards-lead` with no CSRF header still returns `403`

---

## B-01

### Storefront customer tokens are indistinguishable from marketplace user tokens, and carry the vendor's `store_id`

**Severity:** P0 — tenant boundary
**Files:** `backend/src/services/storefront-auth.service.ts:585-591` · `backend/src/middlewares/index.ts:64-104` · `backend/src/realtime/socket-gateway.ts:30-56` · `backend/src/services/chat.service.ts:988-1007` · `backend/src/api/files.route.ts:390-400`

#### The root cause

```ts
// storefront-auth.service.ts:585
issueAccessToken(customer: PublicStorefrontCustomer): string {
  return signAccessToken({
    sub: customer.id,
    role: UserRole.Customer,
    store_id: customer.store_id,     // ← the VENDOR's store id
  });
}
```

`signAccessToken` (`utils/jwt.ts:47-50`) uses `config.jwt.secret` — the same key as every
marketplace user token — and the payload has **no discriminating claim**. `AccessTokenPayload`
supports `session_id`, and storefront tokens don't even set that.

`requireAuth` (`middlewares/index.ts:83-104`) accepts it: `extractAccessToken` reads
`Authorization: Bearer` **or** the `pd_at` cookie, and the Bearer path is shared. It then calls
`verifyAccessToken` and populates `req.user` from the payload — **it never confirms `sub` exists in
`pd_user`**.

So a storefront customer holds a token that authenticates them as a marketplace `Customer` whose
`store_id` is the vendor's.

#### Consequence 1 — the vendor's realtime room

```ts
// socket-gateway.ts:48-56
this.io.on('connection', (socket: Socket) => {
  const userId  = socket.data.user_id as string;
  const storeId = socket.data.store_id as string | null;   // straight from the JWT
  const role    = socket.data.role as UserRole;

  socket.join(`user:${userId}`);
  if (storeId) socket.join(`store:${storeId}`);            // ← NO ownership check
  if (role === UserRole.Admin || role === UserRole.SuperAdmin) socket.join('admin');
```

There is no `SELECT … FROM pd_store WHERE id = $1 AND owner_id = $2`. A storefront customer joins
`store:<vendor>` and receives:

| Event | Emitted at | Payload |
| --- | --- | --- |
| `new_order` | `order.subscriber.ts:136` | `{ order_id, total }` |
| `payment_received` | `order.subscriber.ts:205` | `{ order_id, amount, commission }` |
| `payout_completed` | `wallet.subscriber.ts:18` | `{ store_id, amount }` |
| `chat_message` | `chat.service.ts:948` | full message body, any conversation in that store |

Order totals, net payouts, **the platform commission**, and other buyers' private messages.

> Note: those four emitters are currently unreachable because of [B-02]. Fixing B-02 without
> fixing B-01 turns a latent leak into an active one. **Fix B-01 first, or in the same change.**

#### Consequence 2 — chat attachments across buyers

```sql
-- chat.service.ts:988-1007 (canAccessAttachmentKey)
WHERE m.attachments @> $1::jsonb
  AND ( cp.user_id = $2
        OR ($3::varchar IS NOT NULL AND c.admin_scope = true)
        OR ($4::varchar IS NOT NULL AND c.store_id = $4) )   -- ← store match alone
```

The third branch grants anyone whose `store_id` matches the conversation's store access to **every**
attachment in that store — including `buyer_seller` threads belonging to other buyers.
`/api/pd/files/access` uses `requireAuth` (`files.route.ts:374`), so the storefront token passes.

Compare `report.service.ts:696-702`, which does this correctly by additionally requiring
`actor.role === UserRole.Vendor`.

#### Consequence 3 — the whole `requireAuth`-only surface

Any endpoint guarded by `requireAuth` alone is reachable by a storefront customer acting as a
marketplace user. Two examples found: `POST /api/pd/cart/quote` (`cart.route.ts:153-167`, creates a
hub quote as `owner_user_id: req.user!.id` — a storefront customer id in a user column) and
`GET /api/pd/files/access`.

**Fix →** [Guide B](./09-IMPLEMENTATION-GUIDES.md#guide-b)

**Acceptance criteria**
- [ ] A storefront access token rejected by `requireAuth` with `401`
- [ ] A marketplace access token rejected by `requireStorefrontCustomer` with `401`
- [ ] Socket handshake with a storefront token rejected
- [ ] Socket handshake with a vendor token joins `store:<id>` **only** after a DB ownership check
- [ ] `GET /files/access` for a chat attachment in store X, using a store-X *customer* token, returns `403`
- [ ] Regression tests added for all five (see [E-07](./07-ENHANCEMENTS.md#e-07))

---

## B-02

### Seven core domain events are subscribed but never emitted

**Severity:** P0 — silent, platform-wide feature loss
**Verified two independent ways:** static analysis of every `eventBus.emit` / `eventBus.on` call, and production data.

#### The evidence

I enumerated every emit and subscribe site in `backend/src` (excluding tests) and normalised
`PdEvent.*` constants to their string values:

| Event | Subscribed at | Emitted at |
| --- | --- | --- |
| `pd.order.placed` | `order.subscriber.ts:37`, `stock-low.subscriber.ts:21`, `webhook.subscriber.ts:54` | **— none —** |
| `pd.order.fulfilled` | `order.subscriber.ts:55`, `webhook.subscriber.ts:63` | **— none —** |
| `pd.order.cancelled` | `webhook.subscriber.ts:72` | **— none —** |
| `pd.order.delivered` | `webhook.subscriber.ts:81` | **— none —** |
| `pd.product.created` | `webhook.subscriber.ts:102` | **— none —** |
| `pd.verification.approved` | `kyc.subscriber.ts:10` | **— none —** |
| `pd.verification.rejected` | `kyc.subscriber.ts:24` | **— none —** |

Confirmations:

- `orderService.checkout` (`order.service.ts:374-878`) — no emit. The transaction commits, logs
  `'Order created'` at `:869`, and returns.
- `orderService.fulfill` (`:1613`), `markStoreFulfillmentDelivered` (`:1646`), `cancel` (`:1914`),
  `cancelStoreFulfillment` (`:1755`) — no emits.
- `paymentService` — **does not import the event bus at all**. Grep for `event-bus` in
  `backend/src` returns 14 files; `payment.service.ts` is not one of them.
- `kycService` — same, no event-bus import.
- `productService` emits `PRODUCT_PUBLISHED` (`:647`, `:1923`) but never `PRODUCT_CREATED`.
- The only `pd.payment.captured` emitter in the entire codebase is `mandat.service.ts:149`.

#### Production data confirms it

```sql
SELECT type, count(*) FROM pd_notifications GROUP BY 1;
  ads_campaign_state  5
  mandat_pending      4
  payment_captured    2     ← both from the single mandat-approved order, 2026-05-07

SELECT count(*) FROM pd_webhook_subscription;   →  0
SELECT count(*) FROM pd_order;                  →  15
```

Fifteen orders exist. **Zero `order_placed` or `new_order` notifications have ever been created.**
The two `payment_captured` rows are timestamped 2026-05-07 17:33, seconds apart — the vendor and
customer notifications from the one order that went through the mandat path, which is the only
path that emits.

#### What is silently dead

| Capability | Implemented at | Reachable? |
| --- | --- | --- |
| Buyer order-confirmation email | `order.subscriber.ts:96-110` → `email.worker.ts` `order_confirmed` | ❌ |
| Buyer order-placed in-app notification | `order.subscriber.ts:87-95` | ❌ |
| Vendor "🛍️ Nouvelle commande" notification | `order.subscriber.ts:129-135` | ❌ |
| Vendor new-order socket push | `order.subscriber.ts:136-139` | ❌ |
| Vendor new-order email | `order.subscriber.ts:140-144` | ❌ |
| Low-stock alert to vendor | `stock-low.subscriber.ts:21-60` | ❌ (keyed on `ORDER_PLACED`) |
| Shipping-notification email | `order.subscriber.ts:326-366` | ❌ |
| KYC approved / rejected notification + email | `kyc.subscriber.ts:10-35`, `email.worker.ts:229-247` | ❌ |
| **All outgoing vendor webhooks for order + product events** | `webhook.subscriber.ts:54-128` → `webhook.worker.ts` | ❌ |
| Wallet credit on payment capture | `order.subscriber.ts:179-196` | ⚠️ mandat path only |
| Commission calculation | `order.subscriber.ts:182-183` | ⚠️ mandat path only |

The last two are the reason this is P0 rather than P1: **for Flouci, Konnect, PayPal and COD
orders, the vendor's wallet is never credited and no commission is ever computed.** Live data is
consistent with that — the only funded wallet
(`pd_store_6hA7WWUBufUDF5ga`, `total_earned 5555.000`) received exactly one `sale` transaction, on
2026-05-07, from the mandat order.

The webhook consequence is why the ERP-integration value proposition (PRD §F5.2, "Webhooks
sortants") has never functioned and why `pd_webhook_subscription` is empty — a seller who
configured one would receive nothing.

#### Why it wasn't noticed

The in-process bus is a plain `EventEmitter`. `eventBus.emit()` on an event with no listeners
returns `false` and does nothing — and `eventBus.on()` for an event nobody emits is equally silent.
There is no wiring assertion anywhere.

**Fix →** [Guide C](./09-IMPLEMENTATION-GUIDES.md#guide-c)

**Acceptance criteria**
- [ ] A test asserts every `eventBus.on` key has ≥ 1 emitter ([E-06](./07-ENHANCEMENTS.md#e-06))
- [ ] Placing an order creates a buyer notification + a vendor notification per store, and enqueues emails
- [ ] Capturing a Flouci/Konnect/COD payment credits `pending_balance` with the correct commission deducted
- [ ] Fulfilling an order enqueues the shipping email
- [ ] Approving KYC notifies the vendor
- [ ] With a webhook subscription registered, `pd.order.placed` produces a delivery attempt
- [ ] Verified against live data: a test order produces rows in `pd_notifications` and `pd_wallet_transaction`

---

## B-03

### A seller can self-verify any custom domain, then obtain a TLS certificate for it

**Severity:** P0
**Files:** `backend/src/services/domain-verification.service.ts:103-109, 174-199, 293-311` · `backend/src/api/store.route.ts:1191-1200, 1228-1240` · `backend/src/services/store.service.ts:910-933` · `backend/src/api/internal.route.ts:42-47`

Four defects stack into one exploit.

#### Defect 1 — the plaintext token is returned to the caller

```ts
// domain-verification.service.ts:82-109
const rawToken  = `pd-verify-${randomHex(16)}`;
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
…
return {
  ...rows[0],
  verification_token: rawToken,            // ← handed to whoever called addDomain
  expected_txt_value: rawToken,
};
```

#### Defect 2 — that token is accepted back as proof

```ts
// domain-verification.service.ts:174-199
if (mockToken) {
  const expectedHash = crypto.createHash('sha256').update(mockToken).digest('hex');
  if (expectedHash === domain.verification_token_hash) verified = true;
}
…
// again, unconditionally, at :194-199
if (mockToken) {
  const mockHash = crypto.createHash('sha256').update(mockToken).digest('hex');
  if (mockHash === domain.verification_token_hash) verified = true;
}
```

No DNS proof. No `config.env` guard. And the route that reaches it has **no zod schema at all**:

```ts
// store.route.ts:1228-1240
router.post('/me/domains/:id/verify', requireStore, asyncHandler(async (req, res) => {
  const domain = await domainVerificationService.verifyDomain(
    req.user!.store_id!, req.params.id, req.body.mock_token,   // ← untyped, unvalidated
  );
```

On success (`:201-226`) it sets `verification_status='verified'`, `ssl_status='active'`,
`verified_at=NOW()`, and if the store has no primary domain, calls `makePrimary` — which writes
`pd_store.custom_domain` (`:258-261`).

#### Defect 3 — the TXT path accepts any `pd-verify-` record

```ts
// :182
if (hash === domain.verification_token_hash || txt.startsWith('pd-verify-')) {
```

The second clause ignores **whose** token it is. A stale `pd-verify-…` TXT left by a previous
tenant verifies the domain for a different store.

#### Defect 4 — a completely ungated second path, plus a legacy TLS fallback

```ts
// store.route.ts:1191-1200
router.put('/me/domain', requireStore, validate(updateDomainSchema),
  asyncHandler(async (req, res) => {
    const store = await storeService.updateCustomDomain(req.user!.store_id!, req.body.domain);
```

`storeService.updateCustomDomain` (`store.service.ts:910-933`) checks the policy suffix list and
uniqueness — and **never calls `subscriptionService.assertCanUseCustomDomain`**. Only the
`POST /me/domains` path does (`domain-verification.service.ts:45`). So the plan gate is bypassed by
the exact UI sellers actually use (`online-store/domains/page.tsx:44`) → also [B-13].

Then:

```ts
// domain-verification.service.ts:303-311
if (rows.length > 0) return true;
// Legacy fallback check in pd_store
const legacyStore = await query('SELECT id FROM pd_store WHERE custom_domain = $1', [norm]);
return Boolean(legacyStore.rowCount && legacyStore.rowCount > 0);
```

So `PUT /me/domain` alone — no verification of any kind — is sufficient to pass
`isDomainTlsAllowed`, which is Caddy's on-demand-TLS gate (`internal.route.ts:42-47`).

#### Chain

```
seller → POST /me/domains {hostname:"victim.com"}      → 201 + verification_token
       → POST /me/domains/:id/verify {mock_token:<that token>}
                                                        → verified + ssl_active + primary
       → pd_store.custom_domain = "victim.com"
       → storeService.getByCustomDomain("victim.com")   → this seller's store
       → GET /internal/tls-allowed?domain=victim.com    → 200 → Caddy requests a cert
```

Or, shorter: `PUT /me/domain {domain:"victim.com"}` → same end state via the legacy fallback.

**Live state:** `pd_store_domain` has one row — `titasos.com`, `verification_status='pending'`,
`attempts=0`. Not yet exploited.

Also note `attempts` is incremented at `:143` and **never read** anywhere — there is no attempt cap.

**Fix →** [Guide D](./09-IMPLEMENTATION-GUIDES.md#guide-d)

**Acceptance criteria**
- [ ] `POST /me/domains` response contains no `verification_token`
- [ ] `POST /me/domains/:id/verify` with a body-supplied token fails in production
- [ ] A foreign `pd-verify-…` TXT record does not verify a domain
- [ ] `PUT /me/domain` with an unverified hostname returns `400`
- [ ] `PUT /me/domain` on a Free plan returns `403` (quota)
- [ ] `isDomainTlsAllowed` returns `false` for a hostname present only in `pd_store.custom_domain`
- [ ] `/internal/tls-allowed` requires a secret header ([B-20](./04-BUGS-P1-HIGH.md#b-20))
- [ ] `attempts` enforced with a cap and a rate limiter on the verify route

---

## B-04

### Ads auto-refill credits account balance with no payment — and simultaneously breaks ad charging

**Severity:** P0 · **File:** `backend/src/services/ads.service.ts:175-203`, called from `:720`

```ts
private async checkAndTriggerAutoRefill(client: PoolClient, storeId: string, accountId: string) {
  const res = await client.query(
    `SELECT auto_refill_enabled, auto_refill_threshold, auto_refill_amount, balance
     FROM pd_ads_account WHERE id = $1 FOR UPDATE`, [accountId]);
  const account = res.rows[0];
  if (account && account.auto_refill_enabled
      && Number(account.balance) < Number(account.auto_refill_threshold)) {
    const amount = Number(account.auto_refill_amount);
    if (amount > 0) {
      const updated = await client.query(
        `UPDATE pd_ads_account SET balance = balance + $2, updated_at = NOW()
         WHERE id = $1 RETURNING balance`, [accountId, amount]);          // ← money from nothing
      const refId = pdId('adrfl');
      await client.query(
        `INSERT INTO pd_ads_refill_intent (id, account_id, store_id, gateway, amount, status, captured_at)
         VALUES ($1,$2,$3,'auto_refill',$4,'captured',NOW())`, …);
      await client.query(
        `INSERT INTO pd_ads_transaction (…, type, amount, balance_after, payment_reference, description)
         VALUES ($1,$2,'refill',$3,$4,$5,'Automatic account auto-refill')`, …);
      await this.allocateReservations(storeId, client);
    }
  }
}
```

**No payment provider is contacted.** And the vendor controls the amount:

```ts
// api/ads.route.ts:111-130 — vendor-writable
auto_refill_enabled:   z.boolean().optional(),
auto_refill_threshold: z.number().min(0).max(100000).optional(),
auto_refill_amount:    z.number().min(0).max(100000).optional(),
```

#### Why it hasn't happened yet — and why that's worse

`migrations/sql/026_ads_refill_intents.sql:6` created the table with:

```sql
gateway VARCHAR(20) NOT NULL CHECK (gateway IN ('flouci','konnect')),
```

`041_ads_manual_mandat_refills.sql` widened it to include `'manual_mandat'` — but **never
`'auto_refill'`**. So the `INSERT` throws a check-constraint violation.

That INSERT runs **inside `recordEvent`'s transaction** (`ads.service.ts:647` opens it; the
auto-refill call is at `:720`). The violation therefore **rolls back the entire ad event** — the
impression/click is not recorded, not charged, and the API returns an error.

So the actual current behaviour is: with auto-refill enabled, **ad delivery accounting silently
breaks** instead of leaking money. Widen that CHECK constraint for any reason and it becomes money
creation.

**Live state:** all 4 `pd_ads_account` rows have `auto_refill_enabled = false`. Neither path has
fired.

**Compare the correct implementation.** `adsRefillService.captureVerifiedIntent`
(`ads-refill.service.ts:99-110`) is genuinely idempotent: it re-locks the intent, re-checks
`status` inside the transaction, locks the account row, and writes a ledger row with a deterministic
`idempotency_key`. That is the only function that should ever increase `balance`.

**Fix →** [Guide E](./09-IMPLEMENTATION-GUIDES.md#guide-e)

**Acceptance criteria**
- [ ] `checkAndTriggerAutoRefill` no longer mutates `balance`
- [ ] `recordEvent` no longer calls any refill path
- [ ] `PATCH /ads/account/settings` with `auto_refill_enabled: true` returns a clear "not available yet" error, or creates a `pending` intent charged against a stored payment method
- [ ] `balance` is only ever increased by `captureVerifiedIntent`, `credit`, or an audited admin adjustment
- [ ] A test asserts an ad event still records when the account is below its refill threshold

---

## B-05

### `PUT /admin/settings` bypasses the SuperAdmin guard on finance and security settings

**Severity:** P0 — privilege escalation
**File:** `backend/src/api/admin/settings.routes.ts:671-693` vs `:695-710`

The sectioned route guards correctly:

```ts
// :695-710
router.put('/settings/:section', validate(settingsSectionParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { section } = req.params as { section: PlatformSettingSection };

    // Privileged Section Authorization Guard (SO-02)
    if (['finance', 'security'].includes(section) && req.user?.role !== UserRole.SuperAdmin) {
      res.status(403).json({ error: { code: 'PD_FORBIDDEN', message: `Modifying ${section} settings requires SuperAdmin privileges` } });
      return;
    }
```

Its unsectioned sibling does not:

```ts
// :671-693
router.put('/settings',
  validate(globalSettingsSchema),                    // ← accepts EVERY key
  asyncHandler(async (req, res) => {                 // ← no role check at all
    const updatedKeys = await platformConfigService.updateSettings(req.body, req.user!.id);
```

`globalSettingsSchema` (`:61-317`) is the union of every section. It includes, among others:

| Key | Line | Effect if changed by a non-SuperAdmin |
| --- | --- | --- |
| `payment_paypal_live_client_secret` | `:257` | rotate live PayPal credentials |
| `payment_flouci_app_secret` | (finance block) | rotate live Flouci credentials |
| `platform_commission_rate` | `:246` | change platform revenue |
| `min_withdrawal_tnd` | `:245` | change payout floor |
| `security_password_min_length` | `:300` | weaken password policy |
| `security_2fa_required_roles` | `:305` | disable mandatory 2FA |
| `maintenance_enabled` | `:309` | take the whole platform offline |

Both routes sit under `router.use(requireAuth, requireAdmin)` (`admin.route.ts:31`), so **any user
with role `admin`** can call the unsectioned route.

Two aggravating factors:

1. `requireSuperAdmin` is defined at `middlewares/index.ts:183` and used **zero times** in the
   entire backend. This route's inline check is the only role granularity that exists → [M-07].
2. `PUT /settings` also skips the `If-Match` optimistic-concurrency check and section versioning
   that `updateSectionSettings` implements, so two admins can silently overwrite each other.

**Related, same shape.** `PATCH /admin/ads/config` (`admin/ads.routes.ts:56`) calls
`platformConfigService.updateSettings` directly. The `ads_*` keys belong to no section (verified by
diffing `PLATFORM_SETTING_DEFAULTS` against `PLATFORM_SETTING_SECTION_KEYS`), so they escape
versioning, `If-Match`, and any future ACL.

**Fix →** [Guide F](./09-IMPLEMENTATION-GUIDES.md#guide-f)

**Acceptance criteria**
- [ ] A user with role `admin` calling `PUT /admin/settings` with `platform_commission_rate` gets `403`
- [ ] Same for any `security_*` or `payment_*_secret` key
- [ ] The authorization decision lives in `platformConfigService`, not in a route handler
- [ ] `ads_*` keys belong to a section and go through `updateSectionSettings`
- [ ] The frontend Settings save path still works for all 10 tabs
- [ ] A test asserts that for every section, a non-SuperAdmin is rejected on `finance` and `security` via **both** routes
