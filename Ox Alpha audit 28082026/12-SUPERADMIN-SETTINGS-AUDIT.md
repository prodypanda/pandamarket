# 12 — Superadmin Settings Page — Dedicated Deep Pass

> Owner report: *"a lot of duplication and missing settings and options and content arrangements."* **All three claims confirmed, and the duplication is worse than described.**

Surfaces: `frontend/src/app/(admin)/settings/page.tsx` (**6,245 lines / 336 KB**), `frontend/src/types/settings.ts` (519), `frontend/src/lib/admin-settings-save.ts` (95), `backend/src/api/admin/settings.routes.ts` (776), `backend/src/services/platform-config.service.ts` (1,127), table `pd_platform_config` (`004:58-76`).

Key counts: backend defaults **257** · zod `globalSettingsSchema` **238** · `PlatformSettings` interface **238** (×2 copies) · backend section slots **253** (238 distinct → **15 double-owned**) · frontend tab slots **250** (225 distinct → 10 duplicated, **13 missing**) · search index **92 of 238 (39%)**.

---

## 1. Tab map (11 tabs, `page.tsx:558-570`)

| Tab | Label | Keys | Sections | Notes |
|---|---|---|---|---|
`marketplace` | Marketplace & Hero | **87** | 8 (+shared) | ~1,700 lines of JSX in one tab |
`core_pages` | Pages Clés & Fiche Produit | 15 | 1 | only tab using `t()` |
`algorithm` | Algorithme & Flux Hub | 19 | 1 (**shared with marketplace**) | |
`commerce` | Commerce & Catalog | 25 | 5 | |
`finance` | Finance & Payments | 29 | 5 | SuperAdmin-gated server-side |
`shipping` | Shipping & Delivery | 15 | 1 | master switch lives in Commerce |
`security` | Security & Governance | 11 | 2 | includes admin's **personal** 2FA panel |
`operations` | Platform Operations | 23 | 5 | 13 of them unsavable |
`integrations` | Integrations & Webmaster | 11 | 2 | |
`plans` | Subscription Plans | — | embeds `/plans` route | Save shows "Use Plan Actions Below" |
`email` | Transactional Emails | — | separate state machine | missing `email_transport`/`brevo_api_key` |

All 11 tabs are mounted simultaneously and toggled with `hidden` (**32 occurrences**) → every keystroke re-renders 6,245 lines.

Full field-level map (key → control → line) is preserved in the source audit; the sections are: Marketplace §A theme picker, §B identity (20 fields), §C watermark (12), §D social (10), §E support links (6), §F hub homepage/catalog (12), §G homepage blocks, §H Alibaba hero (17); core_pages (15); algorithm/hub-feed (18); commerce (availability 10, rewards 3, moderation 5, order splitting 1, tax 5); finance (retention 4, financial 4+table, gateways 8, PayPal 9, mandat 4+5 copyables); shipping (14); security (11); operations (maintenance 7, uploads 4, image sizes 13, chat 6, notifications 6); integrations (7+4).

---

## 2. Duplication

### 2.1 Module-level

| Duplicate | Copy A | Copy B | Drift |
|---|---|---|---|
`interface PlatformSettings` (238 keys) | `page.tsx:28-267` | `types/settings.ts:1-240` | none in keys |
`DEFAULT_SETTINGS` (238 keys) | `page.tsx:296-535` | `types/settings.ts:269-508` | **5 values differ** |
`SettingsTab` union | `page.tsx:269` | `types/settings.ts:242` | member order differs |
SMTP types + `DEFAULT_SMTP_FORM` | `page.tsx:272-294,537-546` | `types/settings.ts:245-267,510-519` | both stale |
`SMTP_PROVIDER_PRESETS` | `page.tsx:548-556` | `smtp-config/page.tsx:51-58` | labels differ |
`SectionHeader` | `page.tsx:1388-1408` | `components/admin/SectionHeader.tsx` | **shared copy has 0 importers** |
Field renderers | `page.tsx:2338-2451` | `components/admin/settings/SettingsFormHelpers.tsx` | **shared copy has 0 importers and has per-field error slots** |
Tab metadata | `page.tsx:558-570` | server `PLATFORM_SETTING_SECTION_META` (already returned at `:1013`) | frontend ignores it |
Whole Email/SMTP UI | `settings/page.tsx:5869-6078` | `(admin)/smtp-config/page.tsx` (608 lines) | **different field sets** → data loss (§5-B4) |
Whole Plans UI | embedded `:5866` | `(admin)/plans/page.tsx` | same component on 2 routes |

**Default-value drift (page.tsx vs types/settings.ts vs backend):** `marketplace_address` `'123 Avenue Habib Bourguiba, Tunis'` vs `''` vs `''` · `marketplace_business_hours` `'Mon–Fri 09:00–18:00'` vs `''` · `marketplace_country` `'TN'` vs `'Tunisia'` · `marketplace_support_phone` `'+216 71 000 000'` vs `''` · `marketplace_support_whatsapp` `'+216 50 000 000'` vs `''`. → on partial load the admin sees **fabricated Tunisian contact details as if configured**.
Also 12 `hub_*` backend defaults are strings (`'true'`, `'5'`) while the UI treats them as boolean/number — only works because `coerceSettingValue` re-parses.

### 2.2 Duplicated controls for the same key
- `marketplace_theme` — visual picker at **:3226 AND :3373** (same tab, 150 lines apart).
- `hub_homepage_layout` — 6-card picker **:3753-3787** AND `<select>` **:3793-3804**, with disagreeing option labels.
- `hub_homepage_pagination_style` — control label vs search-index label disagree.
- Ambiguous duplicate labels: `'Flouci'`/`'Konnect'`/`'Mandat Minute'` appear as both retention and gateway toggles; `'City'` is both marketplace and mandat-recipient city.
- **18 hub-card/grid/search controls are rendered once but visible in TWO tabs** (`:4496` condition `activeTab === 'algorithm' || activeTab === 'marketplace'`).

### 2.3 Keys owned by two sections (15)
`hub_card_show_rating`, `hub_card_show_add_to_cart`, `hub_card_add_to_cart_style`, `hub_card_show_store_name`, `hub_card_show_store_verified`, `hub_card_show_store_score`, `hub_grid_columns`, `hub_grid_items_per_load`, `hub_search_grid_columns`, `hub_search_items_per_page`, `hub_search_sponsored_enabled`, `hub_search_sponsored_columns`, `hub_search_sponsored_count`, `catalog_featured_category_slugs`, `catalog_default_sort`.
Because `getSectionVersions` uses `MAX(updated_at)` per section, **saving Algorithm bumps Marketplace's version → the other tab 409s on its next save.** Self-inflicted optimistic-lock conflict.

### 2.4 Semantic overlaps
Commission global vs per-plan (UI table **hardcodes `'0%'`** instead of reading the plans API) · `catalog_default_sort` vs `hub_feed_base_sort` (both consumed, precedence never stated) · `hub_grid_columns` vs `hub_search_grid_columns` in one card with near-identical copy · 3 logo fields with no documented resolution rule (3 renderers pick differently) · `marketplace_support_whatsapp` (**no consumer**) vs `marketplace_whatsapp_url` (consumed) · `hub_hero_*` (17 keys) vs `hub_homepage_blocks` hero slides — two independent hero editors · `maintenance_enabled` vs `marketplace_enabled` — two kill switches, only one confirms · `shipping_enabled` rendered in Commerce but owned by Shipping · three payment mode switches that can contradict with no cross-validation.

---

## 3. Missing settings

### 3.1 Orphan backend keys — no UI anywhere (19)
15 `ads_*` keys (`platform-config.service.ts:226-240`) — editable only on the separate `/ads` page via a different route; and 🔴 **4 mandat/bank keys with no editor at all**: `mandat_bank_name`, `mandat_bank_rib`, `mandat_bank_iban`, `mandat_recipient_phone` (`:176-180`). The Settings page has a "Mandat Minute Recipient" section that edits name/CIN/city/email and **omits the bank details buyers actually need to send money** — defaults ship as placeholders and can only be changed with direct SQL.

### 3.2 UI controls that cannot persist (13)
All `image_size_*` (12) + `image_quality_webp` are rendered (`:5712-5748`) and in the *server* allowlist, but missing from `SETTINGS_TAB_KEYS.operations` **and** from `operationsSettingsSchema` → dirty flag never sets → Save stays disabled → edits silently dropped; if forced they'd 400 on `.strict()`.
Also `hub_feed_ab_testing_enabled` exists end-to-end with **no control rendered**.

### 3.3 Controls with no runtime consumer (15)
`product_moderation_required`, `product_auto_publish_verified`, `seller_type_change_auto_approval`, `price_rounding_mode`, `cart_enabled`, `vendor_registration_enabled`, `buyer_registration_enabled`, `auto_cancel_unpaid_enabled`, `auto_cancel_unpaid_minutes`, `payout_schedule`, `max_products_per_store_free`, `default_low_stock_threshold`, `max_product_images`, `hub_feed_ab_testing_enabled`, `marketplace_support_whatsapp`. `marketplace_enabled` is typed but never branched on. → **the superadmin can flip toggles that change nothing.**

### 3.4 Settings that don't exist but the platform needs
Per-plan commission in Settings + floor/ceiling + category overrides · payout anchor day, per-gateway minimums, payout fee · **COD surcharge, COD max order value, COD blocked governorates** · VAT number, invoice numbering series, invoice legal footer, tax classes, tax-inclusive rounding · **order-splitting configuration beyond one toggle (PRD F7.2 explicitly requires admin config)** · email identity (`email_transport`, `brevo_api_key`, reply-to, BCC archive, bounce address) · KYC requirements (document types, expiry, re-verification interval) · review moderation policy (min length, verified-only, edit window, profanity list, image policy) · currency/locale formatting (separators, symbol position, decimals) · shipping defaults (parcel weight/dims, handling time, cutoff hour, per-governorate matrix, carrier credentials) · session/security policy (session TTL, idle timeout, concurrent session cap, admin IP allowlist, password history) · rate-limit tuning (hardcoded in middleware today) · generic feature-flag registry · legal-page validation + CMS picker (see file 10) · announcement bar + scheduling windows · per-locale content variants · per-homepage SEO/JSON-LD · cache TTL config + "clear cache" action.

---

## 4. Content arrangement problems

1. **Marketplace tab is 3× overloaded** (87 keys / 8 sections / ~1,700 lines) while shipping, security and integrations hold 11-15 keys each.
2. **`plans` and `email` are not settings tabs** — one embeds another route and disables the global Save; the other uses a separate state machine. 2 of 11 tabs break the page's own contract.
3. **Settings in the wrong tab**: `shipping_enabled`→Commerce; `catalog_*`→Marketplace but owned by Commerce; 12 watermark keys→branding instead of media/operations; `chat_bubble_*` (a storefront widget)→Operations "Chat Security"; the admin's **personal 2FA enrolment** sits in platform Security; `security_*` keys appear in the `operations` zod pick too.
4. **Search doesn't filter fields** — it drives a separate results panel from a hand-written 92-entry index (39% coverage). **33 of the 92 entries have no matching `id="setting-<key>"` anchor**, so clicking them scrolls nowhere. `image_size_*` and `hub_feed_ab_testing_enabled` are unfindable.
5. **Search index mislabels tabs** — 8 entries point to a different tab than their sibling controls in the same DOM card.
6. **No deep links / no URL state** — zero `useSearchParams`/`router`/`hash`; tab and scroll aren't shareable; Back doesn't move between tabs.
7. **Arbitrary DOM order** — Maintenance renders before Marketplace Identity and 2,500 lines before the rest of Operations.
8. **Dangerous settings not segregated** — only `maintenance_enabled` has a DANGER badge + confirm. No badge/confirm on `marketplace_enabled`, registration toggles, `payment_*_enabled`, `payment_sandbox_mode`, `payment_platform_credentials_source`, `order_splitting_enabled`, `platform_commission_rate`, `security_custom_domains_enabled`, `watermark_copy_protection`. No Danger Zone, no factory reset.
9. **Help text inconsistent** — `renderTextInput`/`renderNumberInput` have **no description slot at all**; ~120 text/number fields are bare labels. 6 legal URLs + 10 social URLs have only placeholders.
10. **Mixed languages in one screen** — English section titles beside French bodies; only `core_pages` uses `t()`.
11. **Mobile/overflow** — long emoji labels; sticky header + a **second** floating save bar overlapping content on small viewports.

---

## 5. Data-safety bugs

### Already fixed (verified in code)
AS-01 per-section save with `If-Match` + advisory lock · AS-02 `beforeunload` + tab-switch dialog (**route-change interception still missing**) · AS-03 default colors · AS-04 asset pickers · AS-05 rewards editor · AS-08 banner preview · AS-09/AS-11 visual pickers (**both left duplicates behind**) · AS-10 maintenance confirm · AS-13 seller rail · AS-14 per-tab reset (**factory reset missing**) · AS-17 audit link · AS-19 copy buttons · AS-20 tab overflow · B3 failed-load gate · B4 awaited revalidate.

### Still open
| ID | Issue |
|----|-------|
**SET-B1** 🔴 | **13 Operations controls cannot be saved** (§3.2) — Save button stays disabled, values dropped on navigation |
**SET-B2** 🔴 | **Cross-tab 409 thrash** from the 15 double-owned keys (§2.3) |
**SET-B3** | `shipping_enabled` edited in Commerce is unsaveable from there; dirty dot appears on the Shipping tab; no warning on tab switch |
**SET-B4** 🔴 | **Saving Email from the Settings tab silently downgrades transport to `smtp`** — `SmtpFormData` has no `email_transport`, server defaults it and writes unconditionally → a Brevo-configured platform breaks with no warning |
**SET-B5** | Empty `smtp_pass` still transmitted; safety depends on one server-side `!== ''` check |
**SET-B6** 🔴 | **Invalid input silently coerced, never reported** — bad hex→default, bad GA4/GTM/Pixel IDs→`''` (**a typo deletes the previous working value**), invalid rewards JSON→factory default, unknown 2FA roles dropped. No toast, no field error |
**SET-B7** | No per-field validation feedback; server field errors flattened into one banner sentence (the unused shared helpers already implement error slots) |
**SET-B8** | No optimistic UI/rollback; on 409 the admin gets a sentence, not a diff of what changed |
**SET-B9** | **Audit records no diff** — body only, never previous values; `resource_id` scraped from URL = `'settings'`; the "View change in Audit Log" link goes to an unfiltered list |
**SET-B10** | **Multi-instance cache incoherence** — `invalidateCache` PUBLISHes to `pd:platform-config:invalidate` but **no subscriber exists**; peers serve stale settings up to 30s. Dead code |
**SET-B11** | No `Cache-Control` on the public settings endpoint (store settings endpoint sets one) |
**SET-B12** | **Authorization broader than "Superadmin"** — everything is `requireAdmin` (Admin **or** SuperAdmin); only `finance` and `security` sections are SuperAdmin-gated. A plain admin can rewrite branding, homepage layout, **maintenance mode**, commerce and operations |
**SET-B13** | Two competing Save buttons + two Reset buttons with different colors, labels and disabled logic |
**SET-B14** | Monolith: 6,245 lines, one flat 238-key state, 35 `useState`, all tabs mounted |
**SET-B15** | Dead code: `settingsLoadError` never populated/read, `createSettingsRequestId` never called, `renderTextAreaInput` never called, `pickSettingsKeys` exported unused |

---

## 6. Validation gaps

| Field | Frontend | Backend | Gap |
|---|---|---|---|
`hub_hero_carousel_slides` | visual editor | `string().max(10000)` | **no JSON validation** — any 10KB blob persists, consumers `JSON.parse` it |
`hub_homepage_blocks` | editor | parses JSON, requires object | shape/keys unvalidated; `{}` silently wipes every template |
`rewards_widget_prizes_json` | editor | `string().max(20000)` | **no server JSON validation**; client *replaces* invalid input with defaults instead of rejecting; prize `color` could be `javascript:` |
`single_product_reassurance_items` | builder + raw textarea | `coerce.string()` | **no max length, no JSON check**; raw textarea bypasses the builder |
3 logo URLs | text/picker | `string().max(2048)` | **no URL check** — accepts `javascript:alert(1)` (favicon/OG do use the link schema) |
6 legal URLs | text | relative-or-http(s) | no reachability check, no CMS picker; defaults point at `/hub/search` |
10 social URLs | text | url-or-empty | no domain check — Facebook field accepts any host |
2 brand colors | free-text half accepts anything | hex schema | client silently reverts to default before send → bad input never reported |
`default_currency` | free text | `min(3).max(3)` | `'XXX'`/`'123'` accepted; no ISO-4217 list |
`shipping_default_origin_country` | free text | `min(2).max(2)` | no ISO-3166 list |
`marketplace_supported_locales` | free text | `max(40)` | no CSV/enum validation; can desync from default locale |
`maintenance_allowed_ips` | textarea | `max(2000)` | **no IP/CIDR validation** — a typo locks the admin out of the bypass |
`maintenance_eta` | text | `max(100)` | no ISO-8601 validation |
`security_2fa_required_roles` | free text | `max(120)` | server accepts arbitrary strings |
custom-domain suffix lists | free text | `max(1000)` | no hostname validation |
`catalog_featured_category_slugs` | free text | `max(1000)` | no slug existence check, no picker |
shipping zone cities | free text | `max(2000)` | no validation, overlap undetected |
**PayPal 6 credentials** | `type="text"` | `max(500)` | 🔴 **secrets rendered in plaintext, no masking/reveal toggle** (SMTP password *is* masked) |
`payment_paypal_fx_rate` | max 10 | `max(1000)` | ranges disagree 100× |
`min_withdrawal_tnd` | no max | no max | unbounded |
`image_size_*` | per-preset min/max | only in global schema | unreachable (SET-B1); **AS-15 aspect-ratio validation still open** |
`commerceSettingsSchema` | — | `.passthrough()` | **only non-strict section**; also picks 15 `shipping_*` keys the service then discards with `200 OK` |
`operationsSettingsSchema` | — | — | picks 11 `security_*` keys, same silent drop |

Storage: all values are `TEXT`; `coerceSettingValue` **falls back to the default on any unparseable number** → a corrupted row silently reverts to factory value with no log.

---

## 7. Proposed information architecture (8 tabs + 2 links)

```
1. Brand & Identity      identity · logos&icons · colors · support contact ·
                         social profiles · legal&policy (CMS-page picker)
2. Appearance & Layout    theme (ONE picker) · homepage layout (ONE picker) ·
                         navigation · hero builder · homepage blocks ·
                         promo banner (+schedule) · product cards (moved here)
3. Catalog & Discovery    sorting (explicit precedence) · featured (picker) ·
                         home grid · search grid · sponsored ·
                         feed algorithm (+ ab_testing control) + simulator
4. Product Pages          = core_pages (15 keys, unchanged)
5. Commerce & Orders      availability · moderation · reviews(+new policy fields) ·
                         orders (splitting config, auto-cancel) ·
                         tax&pricing (+VAT/invoice/formatting) · modules
6. Money [SuperAdmin]     currency · commission (LIVE per-plan table) ·
                         payouts (+anchor day/fee) · gateways [DANGER] ·
                         PayPal (masked secrets) ·
                         Mandat/Bank (+4 recovered orphan keys, +COD fees)
7. Shipping               shipping_enabled (moved here) + 14 existing + new defaults
8. Operations & Media     maintenance [DANGER] · upload limits ·
                         image pipeline (FIX save + ratio warnings) ·
                         watermark (moved here) · chat · notifications
9. Security & Access [SuperAdmin]  login&password · 2FA policy · custom domains ·
                         NEW session/idle/concurrency/admin-IP/password-history/
                         rate-limit tuning   (personal 2FA → admin profile page)
10. Integrations          = integrations (11 keys, unchanged)

Links outside the tab strip: "Subscription Plans →" (/plans) ·
                            "Transactional Email →" (/smtp-config + templates)
```

### Duplicates to merge, concretely
| Action | Delete | Keep |
|---|---|---|
Theme picker | `page.tsx:3371-3374` | `:3220-3227` |
Layout selector | `:3791-3805` (`<select>`) | `:3750-3788` (cards) |
13 hub-card/grid/search keys | remove from `SETTINGS_TAB_KEYS.marketplace:877-884` + backend `:503-515` | keep in Catalog & Discovery |
`catalog_default_sort`, `catalog_featured_category_slugs` | remove from `commerce` (`:954-955`, `:585-586`) | keep in Catalog tab |
Shared section in 2 tabs | `:4496` dual condition | single tab |
Interface + defaults | `page.tsx:28-267`, `:296-535` | import from `types/settings.ts`, generated from backend defaults |
`SectionHeader` | `page.tsx:1388-1408` | `components/admin/SectionHeader.tsx` |
Field renderers | `page.tsx:2338-2451` | `SettingsFormHelpers.tsx` (has error slots) |
Tab metadata | `page.tsx:558-570` | server `section_meta` (already returned) |
Email editor | `settings/page.tsx:5869-6078` | `(admin)/smtp-config/page.tsx` (has Brevo) — link to it |
Plans editor | `settings/page.tsx:5865-5867` | `(admin)/plans/page.tsx` — link to it |
SMTP presets | `page.tsx:548-556` | one shared constant |

### Structural fixes
- `?tab=<id>&field=<key>` URL state + `id="setting-<key>"` on **all 238** controls; derive the search index from a single **field registry** `{key, tab, section, control, label, description, validate}` so tab lists, search index, zod picks and DOM cannot drift.
- Give text/number renderers `description` + `error` props.
- Split each tab into a lazily-rendered component (`{activeTab === x && <Tab/>}`).
- Explicit `<DangerZone>` with typed confirmation + factory reset.

---

## 8. Tests

Existing: `admin-settings-save.test.ts` (pure helpers, 6 cases) · `admin-settings-algorithm.test.tsx` (29 KB, 19 tests that **define and test their own component** — zero coverage of the real page, and reference a nonexistent key) · `platform-config.service.test.ts` (~7 tests) · `hub-feed-settings.test.ts` (re-implements logic in the test) · e2e smoke `goto('/settings')` + `toBeVisible()`.

Missing (each would have caught a finding above):
1. **Invariant suite (pure, no DB):** defaults↔zod↔allowlist parity (catches the 19 orphan keys); zod pick ⊇ section allowlist (catches SET-B1 and the 26 validate-then-drop keys); **section key sets disjoint** (catches SET-B2).
2. **Route suite:** 9 × happy path, unknown-key rejection, `If-Match` matrix (`'0'`/absent/`W/"…"` parsing untested), 403 matrix for finance/security as plain admin (SET-B12).
3. **JSON-field validation tests** for blocks/rewards/carousel/reassurance.
4. **Frontend parity tests:** every key in exactly one tab list; tab lists ↔ backend sections; **triple defaults parity** (catches the 5 drifted values); search-index tab ownership + anchor existence (catches the 33 dead links).
5. `buildSettingsPayload` unit tests per coercion branch (160 lines, 0 tests).
6. Component tests per extracted tab: dirty state, per-tab payload, reset, 409 recovery.
7. Playwright: save-and-verify per tab + concurrent-edit 409.
8. Contract test: `PUBLIC_PLATFORM_SETTING_KEYS` never leaks a credential-bearing key (correct today, nothing enforces it).
9. Redis pub/sub test (missing subscriber = SET-B10 went unnoticed).
10. SMTP tests: saving without `email_transport` preserves `brevo_api`; empty `smtp_pass` preserves the secret.

---

## 9. Fix checklist — Settings

### Tier A — data safety (this week)
- [ ] Add the 13 `image_size_*`/`image_quality_webp` keys to `SETTINGS_TAB_KEYS.operations` + `operationsSettingsSchema` — **SET-B1**
- [ ] Make section key ownership disjoint (move 13 hub keys + 2 catalog keys to one owner each) — **SET-B2**
- [ ] Fix Email save clobbering `email_transport` (add fields or PATCH semantics) — **SET-B4**
- [ ] Omit empty `smtp_pass` client-side — **SET-B5**
- [ ] Replace silent coercion with per-field validation errors + toast — **SET-B6/SET-B7**
- [ ] Mask PayPal secrets with reveal toggle — **§6**
- [ ] ⚡ Add the 4 mandat/bank keys to the UI (`mandat_bank_name/rib/iban`, `mandat_recipient_phone`) — **§3.1**
- [ ] Decide the authorization model: gate the whole page (or at least maintenance/commerce/operations) behind `requireSuperAdmin` — **SET-B12**
- [ ] Route-change interception for unsaved changes (Next router) — **AS-02 remainder**

### Tier B — deduplicate
- [ ] Delete the duplicate theme picker + duplicate layout `<select>` — **§2.2**
- [ ] Delete `page.tsx` interface/defaults; import from `types/settings.ts` (generated from backend defaults) — **§2.1**
- [ ] Adopt the shared `SectionHeader` + `SettingsFormHelpers`; delete local copies
- [ ] Consume server `section_meta` instead of local tab metadata
- [ ] Replace embedded Email/Plans editors with links to their canonical pages
- [ ] Single shared `SMTP_PROVIDER_PRESETS`
- [ ] Resolve semantic overlaps: live per-plan commission table, documented sort precedence, documented logo resolution rule, merge whatsapp keys, one hero editor, one kill switch (or clearly differentiated)

### Tier C — content arrangement
- [ ] Implement the 8-tab IA from §7; move misfiled settings; move personal 2FA to the admin profile
- [ ] Field registry + `id="setting-<key>"` on all 238 controls + `?tab=&field=` deep links; regenerate the search index from the registry
- [ ] Danger Zone with typed confirms + factory reset
- [ ] Add descriptions/help text to all text/number fields
- [ ] i18n the whole page (EN/FR/AR)
- [ ] Lazy-render tabs; split the monolith per tab
- [ ] Remove dead code (`settingsLoadError`, `createSettingsRequestId`, `renderTextAreaInput`, `pickSettingsKeys`)
- [ ] Single Save + single Reset control

### Tier D — new settings & platform plumbing
- [ ] Add missing domains from §3.4 (COD fees, VAT/invoice, KYC policy, review policy, currency formatting, shipping defaults, session/security policy, rate-limit tuning, order-splitting config per PRD F7.2, announcement bar, scheduling, per-locale content, per-page SEO/JSON-LD, cache controls)
- [ ] Remove or implement the 15 no-consumer toggles — **§3.3**
- [ ] Add the missing `hub_feed_ab_testing_enabled` control (or delete the key)
- [ ] Typed/jsonb storage + write-time validation; audit-log diffs; Redis invalidation **subscriber**; `Cache-Control` on the public endpoint — **SET-B9/B10/B11**
- [ ] Aspect-ratio warnings for image presets — **AS-15**
- [ ] Full test suite per §8
