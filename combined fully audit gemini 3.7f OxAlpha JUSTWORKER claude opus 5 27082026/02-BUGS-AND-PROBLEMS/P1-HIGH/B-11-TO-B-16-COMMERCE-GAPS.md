# B-11 to B-16 · Cart, Onboarding, Gating & Commission
#### B-11 · Cart totals and the coupon catalogue are implemented four times
**Severity:** P1 · **Files:** `frontend/src/contexts/CartContext.tsx:65-97, 181-206`; `frontend/src/app/hub/cart/page.tsx:35, 91-93`; `frontend/src/app/store/[storeHost]/cart/page.tsx:20, 93`; `backend/src/services/cart.service.ts:104-165`; `backend/src/services/checkout-quote.service.ts:473-543`

The same five hardcoded literals (`CHANCE5DT`, `LIVRAISON_ZERO`, `PANDA10`, `SUPER15` with its 80 DT threshold, `FIDELITE5`) plus the combined-shipping rebate `(storeCount-1) * 3.000` and a hardcoded `SHIPPING_PER_VENDOR = 7` are duplicated across the client context, the hub cart page, the storefront cart page, and two backend services. Checkout uses the authoritative quote; the cart pages do not. They will disagree for any store not on 7 TND flat shipping.

The authoritative implementation already exists (`POST /api/pd/cart/quote`, `useCheckoutQuote`).

**How to fix**
1. Drive the cart summary from `POST /api/pd/cart/quote` (address omitted) via the same hook; delete `recalculateDiscounts`, the local coupon table, and `SHIPPING_PER_VENDOR` from both cart pages and `CartContext`.
2. Make `applyCoupon` a thin server call returning the server's discount and message.
3. Delete the coupon block from `cart.service.ts:113-165` — `checkout-quote.service.ts` is the single source of truth.
4. Then replace the literals with a real `pd_coupon` table (see M-04).

---

#### B-12 · Seller onboarding: three of seven steps cannot be completed
**Severity:** P1 · **File:** `frontend/src/app/hub/dashboard/onboarding/page.tsx`

| Step | Defect |
| --- | --- |
| Branding (logo) | `:881, 923` call `handleFileUpload(file, 'store_logo')`; `presignUploadSchema.purpose` (`backend/src/validators/index.ts:337-350`) is a closed enum with no `store_logo` → **every logo upload 400s** and shows "Failed to upload logo image". |
| Payments & Shipping | `:439-443` PUTs `/stores/me/shipping` with `{ shipping_flat_fee }`; `updateShippingSchema` (`store.route.ts:98-100`) is `z.object({ shipping_mode: z.nativeEnum(ShippingMode) })` — `shipping_mode` is **required** and `shipping_flat_fee` is stripped. Step 6 can never complete. |
| Publish Storefront | `:648, 1302-1309` compare `store?.status === 'published'`. `StoreStatus` (`packages/types/src/enums.ts:20-25`) is `unverified \| verified \| suspended \| maintenance`. The button always reads "🔴 Offline / Private" and always sends `enabled:false`, so a live store can never be taken offline from the wizard. |

Plus: **KYC is marked complete on submission, not approval** (`:335-343, 362-366` write `completed:true` when status is `pending`), and `layout.tsx:220` treats that flag as proof of verification while the same page's checklist (`:498`) requires `approved` — three different truths for one step. And steps are freely skippable (`:718-743` sets `currentStep` with no guard), so a seller can jump to step 7 and hit Publish with nothing configured.

**How to fix**
1. Logo: use `purpose: 'store_asset'` with `folder: 'branding'` (already supported at `files.route.ts:152-166`).
2. Shipping: save the flat fee via `PUT /me/settings` `{ settings: { shipping_flat_fee } }`; send `shipping_mode` only when the seller changes mode.
3. Publish: compare against `'verified'`, and derive the label from the response.
4. KYC: persist `completed` only on `approved`; store `submitted_at` in metadata for wizard resume.
5. Gate step navigation on `getResumeStep`.
6. Extract one shared `computeLaunchProgress(store, onboardingState)` helper — there are currently three formulas (`layout.tsx:241`, `dashboard/page.tsx:293-324`, `onboarding/page.tsx:502`) producing different percentages on the same screen.

---

#### B-13 · Feature gating exists in the backend but not in the UI
**Severity:** P1 · Free/Starter users get raw 403s on buttons the UI happily renders.

| Feature | Backend gate | UI gate |
| --- | --- | --- |
| AI SEO / compression | `ai.route.ts:403-418` `assertAiFeature`, applied at 10 call sites | **none** in `ai/AiToolsStudio.tsx`; **none** on the 8 AI buttons in `products/page.tsx` (`:2840, 1254, 1304, 1462, 1507, 1549, 1602, 1670, 2196`) |
| Custom domain | `domain-verification.service.ts:45` on `POST /me/domains` | `online-store/domains/page.tsx:44` uses the **ungated** `PUT /me/domain` — gate bypassed entirely (see B-03) |
| Premium themes | `store.service.ts:782-796` 403 "Theme purchase required" | `online-store/themes/page.tsx:75` renders all themes clickable with no lock (the settings Theme tab does it correctly at `settings/page.tsx:1404-1452`) |
| API keys / webhooks | **none** — `vendor.route.ts:174, 194, 235` only `requireAuth + requireStore`, and `PLAN_DEFAULTS` has no `has_api_access` flag | none — buttons always shown, docs say Agency+ |
| Direct payment | `payment-config/page.tsx:139-159` wall ✅ | correct, but `dashboard/page.tsx:318-323` adds a launch-readiness step pointing at it, so non-Pro sellers are stuck at 80% forever |

**How to fix:** fetch `/api/pd/subscriptions/current` once in `hub/dashboard/layout.tsx`, put `limits` in context, and lock/badge each surface the way `page-builder/page.tsx:540-564` already does (that one is the reference implementation). Decide the API-keys policy: either add `has_api_access` to `pd_subscription_limits` + `PLAN_DEFAULTS` and assert it, or correct the doc.

---

#### B-14 · Commission rate is corrupted for any value ≤ 1 %
**Severity:** P1, financial · **File:** `backend/src/api/admin/stats.routes.ts:104-107, 158-161`

```ts
const commissionRate = Number(req.body.commission_rate) > 1
  ? Number(req.body.commission_rate) / 100
  : Number(req.body.commission_rate);
```
The UI sends percent (`plans/page.tsx:641`, a `%` field, min 0 max 100). `15` → `0.15` ✅. `1` → stored `1` = **100 %**. `0.5` → stored `0.5` = **50 %**. The read path confirms the ambiguity: `normalizePlan` (`plans/page.tsx:137`) does `commission <= 1 ? commission * 100 : commission`.

**How to fix:** make the wire format explicitly percent; divide by 100 unconditionally on write, multiply by 100 unconditionally on read; add a boundary test at 0 / 0.5 / 1 / 1.5 / 15 / 100.

---

#### B-15 · Buyers and sellers are shown placeholder bank details
**Severity:** P1, customer-facing · **Verified by diffing defaults against section keys**

Four config keys belong to **no settings section**, so no admin screen can save them, and they are frozen at their development defaults:

| Key | Frozen value | Served to users by |
| --- | --- | --- |
| `mandat_bank_name` | `'STB (Société Tunisienne de Banque)'` | `subscription.route.ts:54`, `ads.route.ts:104` |
| `mandat_bank_rib` | `'10 000 0000000000000 00'` | `subscription.route.ts:55`, `ads.route.ts:105`, `subscription-payment.service.ts:1075` |
| `mandat_bank_iban` | `'TN59 1000 0000 0000 0000 0000'` | `subscription.route.ts:56`, `ads.route.ts:106` |
| `mandat_recipient_phone` | `'+216 71 000 000'` | `subscription.route.ts:57`, `ads.route.ts:107` |

These are the payment instructions shown to anyone paying by Mandat Minute. (`ads_prohibited_terms` is also orphaned but harmless.)

**How to fix:** add the four keys to the `finance` section in `PLATFORM_SETTING_SECTION_KEYS`, add them to `financeSettingsSchema`, and render them in `(admin)/settings/page.tsx` next to the existing `mandat_recipient_*` fields (~`:5624`).

---

#### B-16 · Thirteen image-size settings render inputs that are never submitted
**Severity:** P1 · **Verified by comparing the two key lists**

`(admin)/settings/page.tsx:5703-5754` renders 13 controls for `image_size_{thumbnail,small,medium,large}_{w,h,crop}` and `image_quality_webp`. The backend `operations` section accepts all 13. The frontend `SETTINGS_TAB_KEYS.operations` array contains **none** of them (I diffed both: backend 36 keys, frontend 23, the 13 missing are exactly the image keys). `handleSave` builds its payload via `pickChangedSettings(..., SETTINGS_TAB_KEYS[section])` (`:2585`), so edits are dropped and the Save button never even enables. The page then tells the operator the changes "only affect future uploads" — implying they were saved.

**How to fix:** add the 13 keys to `SETTINGS_TAB_KEYS.operations`, and to `NUMBER_SETTING_KEYS`/`TEXT_SETTING_KEYS` so `buildSettingsPayload` normalises them. Add a test asserting `SETTINGS_TAB_KEYS[s] ⊇ backend section keys[s]` for every section — this is a whole class of dead-control bugs.

---
