# 06 — Enhancements, Improvements & New Ideas

> Split into: (A) engineering improvements for existing features, (B) product enhancements already scoped in repo docs (kept as backlog pointers), (C) **new ideas** from this audit not present in any planning doc.

---

## A. Engineering improvements

### E-1. Ledger-first wallet refactor ⭐ recommended before scaling
Every balance change becomes an immutable double-entry row; nightly job reconciles sum(ledger) vs wallet balance and alerts on drift. Catches entire bug classes like P0-1 automatically.
- Sketch: `pd_wallet_ledger(id, wallet_id, entry_type[debit|credit], amount, balance_after, ref_type, ref_id, idempotency_key UNIQUE)`; wallet balance becomes a cached/materialized value.

### E-2. Outbox-pattern domain events
`pd_outbox_event` table + poller already exist (built for revalidation). Route `PAYMENT_CAPTURED`, `ORDER_PAID`, `PRODUCT_PUBLISHED` through it so no code path can "forget" an emission; subscribers become consumers with at-least-once delivery.

### E-3. Payment-state machine enforcement
DB CHECK/trigger or service-level FSM: `payment_status ∈ {pending → requires_review → captured | failed | refunded}` with valid edges only. Structurally kills raw-SQL bypass bugs (P0-2 class).

### E-4. Webhook replay tool in superadmin
Re-process rows from `pd_payment_event` by id/range/date. Lifesaver during real Flouci/Konnect integration (MW-2) and reconciliation disputes.

### E-5. Idempotency keys on admin mutations
Mandat approve/reject, KYC approve/reject, withdrawal approve — accept `Idempotency-Key` header; store processed keys; double-clicks become no-ops.

### E-6. Cursor pagination on hot admin/hub lists *(carried E13)*
Products/orders admin lists + hub feed: keyset (`created_at,id`) pagination before catalog growth; offsets degrade linearly.

### E-7. Typed API client from Swagger *(carried E21)*
Generate `packages/api-client` from `/api/docs`; eliminates the 48-fallback URL class and route drift; pair with route-manifest test (E2).

### E-8. Feature-flag service
`pd_feature_flags(key, enabled, rollout_pct, stores[])` + admin UI — replaces env-var booleans for ads/AI rollouts (ads feature flag exists; generalize).

### E-9. Storefront health score
Nightly compute per store: custom-domain SSL status, DNS validity, page weight budget, 404 rate → shown in admin stores list + seller dashboard ("Your storefront health: 87/100").

### E-10. R2-ready storage abstraction *(prepares planned migration)*
Per-tenant presigned key prefixes (`stores/{store_id}/...`), public CDN base URL setting per environment → S3→R2 becomes a config flip. Also fixes the current `PD_S3_ENDPOINT=localhost` misconfig class.

### E-11. Cold-start mitigation while on Render free
Replace self-ping keep-alive with free external cron (e.g. Cloudflare Workers cron / cron-job.org) hitting `/health`; self-ping removal stays tied to worker split (MW-41).

## B. Product backlog already scoped in repo docs (do not re-spec — links)
| Theme | Source | Status |
|---|---|---|
| Loyalty PandaPoints (earn/redeem/expiry) | PLATFORM_IDEAS F1 / ENH §21 | idea — needs email verification first (MW-5) |
| Trust badges nightly compute feeding search ranking | IDEAS F2 | idea |
| Gamified spin/scratch with consent gating + caps | IDEAS F4 / ENH | partially built (spin fixed server-side) |
| Group buying (Pinduoduo) | IDEAS F5 / ENH §26-area | idea |
| Buyer PWA + Capacitor vendor app | IDEAS F6 / ENH §27 | idea |
| PandaClassifieds mode | IDEAS F7 | idea |
| Wholesale RFQ + MF/tax verification (tier pricing done) | IDEAS G1 | partial |
| Affiliate/influencer network w/ wallet commissions | IDEAS G2 | idea |
| Plugin mechanism + marketplace phases | ENH §13 / IDEAS H1 | idea |
| Signed theme import/export (.pmtheme) + theme marketplace | ENH §17 / IDEAS H2 | idea |
| Embeddable widget SDK | IDEAS H3 | idea |
| Email marketing add-on (audiences/campaigns/DKIM wizard) | ENH §14 | idea |
| Promotions engine (BOGO/bundles/tiered/stacking rules) | ENH §24 | blocked on real coupon engine MW-13-of-prior (P1-4 fix) |
| Multi-warehouse inventory | ENH §23 | idea |
| Header styles & mega-menu variants | ENH §16 | partial |
| Social auto-posting (Meta OAuth first) full build | IMP §3 / IDEAS C5 | missing except profile links/maps |
| Search synonyms FR/AR/EN, zero-result tracking | ENH §26 | idea (unlocks with Meilisearch MW-42) |
| Developer portal + sandbox tenant generator | ENH §32 | idea |

## C. New ideas (from this audit — not in any planning doc)

1. **WhatsApp order-status updates via the existing Evolution gateway** (infra already provisioned: `PD_WHATSAPP_GATEWAY_*` on Render): out-for-delivery/delivered/mandat-approved nudges with opt-in consent toggle at checkout. Tunisia-fit channel; complements SMS abstraction.
2. **Progressive Web Push notifications** for buyer order events (high mobile market; no app required). Service worker doubles as PWA foundation (IDEAS F6).
3. **Payment-state observability board** (superadmin): live funnel `checkout_started → payment_initialized → webhook_received → captured → credited` with per-gateway drop-off — would have surfaced P0-1 immediately.
4. **Seller "money flow" simulator**: in seller dashboard, show for each order exactly where its money is (gateway → retention → wallet → payout) with timestamps — builds trust and makes retention periods legible.
5. **AI output sanitization policy as a shared component** `<SafeAiHtml>`: single wrapper enforcing DOMPurify + size caps + provenance badge, used everywhere AI HTML renders (fixes P0-7 pattern permanently).
6. **Storefront uptime ping + status page**: platform pings each published store homepage daily; sellers see history; chronic failures trigger KYC/support review (fraud/dead-store hygiene).
7. **Admin "explain this metric" tooltips**: every analytics tile gets a one-line definition + SQL provenance — reduces support load and misreads during launch.
8. **Order-level commission ledger export** (CSV/PDF per period) for sellers' accountants — cheap differentiator vs local competitors.
9. **Rate-limit & CSRF contract tests**: small suite asserting limiter buckets increment per unique IP and CSRF rejects cross-origin POSTs — prevents regressions like P2-22-of-prior.
10. **Pre-launch "money drill"**: scripted end-to-end run — buy with sandbox Flouci → verify wallet credit → withdraw request → admin approve → payout marked paid — executed after Phase 0/1 fixes and before real credentials go live.

---

*Prioritization guidance: E-1/E-2/E-3 pair naturally with P0-1..P0-3 fixes (same files); E-4/E-5 are small and de-risk MW-2; Section C items 1–2 are high-impact/low-effort for the Tunisian market.*
