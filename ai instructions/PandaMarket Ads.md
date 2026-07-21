# PandaMarket Ads

PandaMarket Ads is a prepaid advertising platform integrated with seller listings, marketplace placements, analytics, and super-admin moderation.

## Advertising formats

- **Sponsored Product/Service:** promotes an existing seller listing.
- **Sponsored Brand:** promotes a store using its logo, headline, banner, and CTA.
- **Sponsored Content:** custom image, title, description, destination, and CTA.

Every advertisement must visibly display a **Sponsored** label.

## Campaign lifecycle

`draft → pending_review → approved → scheduled → active → paused → completed`

Alternative endings: `rejected`, `cancelled`, and `exhausted`.

1. Seller refills the Ads account.
2. Seller creates a campaign.
3. Seller selects content, placements, targeting, dates, and budget.
4. PandaMarket estimates delivery.
5. Admin reviews content when moderation is enabled.
6. The campaign runs only while approved, funded, and within schedule.
7. Delivery stops at daily or total budget limits.

## Billing

- CPC for valid clicks.
- CPM per 1,000 qualified impressions.
- Optional fixed daily sponsorship for premium placements.

Ads funds remain separate from seller revenue. The immutable ledger supports refills, promotional credit, campaign debit, refunds, admin adjustments, and expired credits. Monetary updates use database transactions and idempotency keys.

## Data model

- `pd_ads_account`: store balance, reserved balance, currency, status.
- `pd_ads_transaction`: immutable refill, debit, credit, refund, and adjustment ledger.
- `pd_ads_campaign`: campaign type, status, objective, pricing, budgets, schedule, and targeting.
- `pd_ads_creative`: linked product/store or custom creative content.
- `pd_ads_placement`: placement format, dimensions, pricing, and availability.
- `pd_ads_campaign_placement`: campaign-to-placement relation.
- `pd_ads_event`: impressions, clicks, and fraud metadata.
- `pd_ads_daily_stat`: aggregated reporting.
- `pd_ads_review`: moderation history.
- `pd_ads_conversion`: attributed orders and revenue.

## Backend

Use dedicated Ads API, campaign, billing, delivery, analytics, and worker modules. Seller endpoints manage accounts, refills, campaigns, creatives, lifecycle actions, and analytics. Public endpoints resolve eligible ads and record signed impression/click/conversion events. Admin endpoints moderate campaigns, inspect advertisers and transactions, configure placements/pricing, adjust balances, and manage fraud controls.

## Seller dashboard

Add `/hub/dashboard/ads` with:

- Ads balance and refill action.
- Spend, impressions, clicks, CTR, CPC, conversions, and ROAS.
- Campaign wizard and campaign history.
- Transaction ledger and filters.
- Product/service selection, placements, targeting, budget, schedule, previews, and submission.

Every seller-owned product page and row includes a **Sponsor / Boost** action linking to `/hub/dashboard/ads/new?product_id=...`.

## Refills

Reuse Flouci and Konnect through a dedicated Ads refill intent. A signed, idempotent webhook credits the Ads ledger after confirmed payment. Manual mandat refills may be enabled with admin approval.

## Super-admin dashboard

Add `/ads` with Overview, Moderation, Advertisers, Transactions, Placements, Pricing, Fraud, and Configuration tabs. Configuration controls availability, campaign types, minimum amounts, CPC/CPM rates, campaign duration, moderation, creative constraints, prohibited content, event limits, attribution, tax, refunds, and promotional credits.

## Marketplace delivery

Replace placeholder sponsored-brand logic with active campaigns. Placements include homepage hero, brand/product rails, search and category results, product recommendations, native template cards, and banners. Eligibility considers approval, funds, schedule, placement, locale, category, product/store status, frequency caps, pacing, bid, and relevance.

## Tracking, fraud, and attribution

A viewable impression requires at least 50% visibility for one second. Use signed event tokens, idempotency, bot filtering, duplicate windows, IP/session limits, self-click exclusion, rate limits, server-side budget enforcement, and salted IP hashes. Default attribution is seven days after click and one day after view, with the last eligible interaction winning.

## Localization and accessibility

Provide French, English, and Arabic translations, RTL layouts and charts, keyboard-accessible campaign creation, accessible sponsored labels, localized money/dates, and clear validation/moderation messages.

## Testing

Cover tenant isolation, ledger atomicity, webhook idempotency, state transitions, budget pacing, delivery eligibility, event deduplication, attribution, authorization, ownership, RTL, and Boost deep links. E2E covers refill through conversion and campaign exhaustion.

## Recommended enhancements

- Automatic campaign mode.
- Multi-template preview studio.
- Low-balance alerts and optional auto-refill.
- Promotional credits and coupons.
- Creative A/B tests.
- Traffic-based budget recommendations.
- Frequency caps and advertiser eligibility rules.
- Strict separation of organic and sponsored results.

## Delivery order

1. Database, ledger, campaign state machine, and permissions.
2. Refill payment flow and webhooks.
3. Seller campaign manager and Boost actions.
4. Admin moderation, pricing, placements, and adjustments.
5. Marketplace delivery, rendering, tracking, and attribution.
6. Analytics, fraud controls, localization, tests, and deployment.
