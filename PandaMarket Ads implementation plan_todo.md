# PandaMarket Ads implementation plan

## Foundation
- [x] Document PandaMarket Ads architecture and requirements.
- [x] Add Ads implementation checklist.
- [x] Add Ads account, transaction, campaign, creative, placement, event, statistics, review, and conversion tables.
- [x] Add default marketplace placements.
- [x] Implement transactional Ads account creation and immutable ledger credits.
- [x] Implement seller campaign creation, listing, detail, update, submit, pause, resume, and cancel operations.
- [x] Enforce store ownership and campaign state transitions server-side.
- [x] Register the Ads API router.
- [x] Add seller Ads dashboard navigation and initial management page.

## Seller experience
- [x] Implement the initial campaign creation workflow.
- [x] Expand campaign creation with creative, objective, pricing, scheduling, targeting, and preview sections.
- [x] Convert campaign creation into a guided multi-step wizard with saved progress.
- [x] Add creative upload and media-library selection.
- [x] Add shared Sponsored Brand/Content creative editor and live card preview.
- [x] Add format-specific advanced creative editors.
- [x] Add full placement and template previews.
- [x] Add targeting controls for locale, category, and device.
- [x] Enforce locale, category, and device targeting during delivery.
- [x] Add audience and behavioral targeting controls.
- [x] Add schedule, daily budget, total budget, pricing model, and bid controls.
- [x] Add delivery estimates and budget recommendations.
- [x] Add product/service Sponsor or Boost action to the seller product list.
- [x] Add Sponsor or Boost actions to remaining seller product surfaces.
- [x] Add seller campaign performance summaries and date filters.
- [x] Add campaign analytics time-series charts.
- [x] Add Ads transaction ledger UI.
- [x] Add in-dashboard low-balance warnings and campaign-state actions.
- [x] Add email and notification-center low-balance/campaign alerts.
- [x] Add RTL-aware layout behavior to the seller Ads dashboard.
- [ ] Replace remaining hard-coded Ads labels with full French, English, and Arabic translation keys.

## Refill and billing
- [x] Implement Ads refill intents independent of commerce orders.
- [x] Integrate Flouci Ads refill checkout and verification.
- [x] Integrate Konnect Ads refill checkout and verification.
- [x] Implement signed idempotent asynchronous refill webhooks.
- [x] Implement idempotent authenticated return-path settlement.
- [x] Implement optional admin-approved mandat refills.
- [ ] Implement reserved funds and atomic campaign debits.
- [x] Implement atomic CPC charging.
- [x] Implement atomic CPM charging.
- [x] Implement idempotent fixed-daily campaign charging.
- [x] Implement idempotent debit refunds, promotional credits, and admin adjustments.
- [x] Add refill records to the Ads transaction history.
- [x] Add downloadable tax receipts and dedicated refill history UI.
- [ ] Add optional auto-refill.

## Admin
- [x] Add the super-admin Ads dashboard and navigation.
- [x] Add campaign moderation queue and persisted review history.
- [x] Add advertiser account inspection.
- [x] Add advertiser suspension/reactivation controls with automatic campaign pausing.
- [x] Add safe idempotent balance adjustment controls.
- [x] Add refund APIs and promotional-credit controls.
- [x] Add transaction-detail UI for selecting individual debit refunds.
- [x] Add placement enable/disable management.
- [x] Add placement-level pricing model and rate management.
- [x] Add global pricing defaults and bulk updates.
- [x] Add global enable, refill, budget, duration, moderation, frequency-cap, and attribution configuration.
- [x] Enforce moderation mode, frequency cap, and attribution-window settings at runtime.
- [x] Persist and correctly coerce all Ads boolean and numeric platform settings.
- [x] Remove hard-coded refill limits from API and seller controls; enforce admin-configured limits in the service.
- [x] Add automatic-approval lifecycle regression coverage.
- [x] Add campaign-type availability configuration and creation-time enforcement.
- [x] Add configurable creative URL, image, description-length, and prohibited-term controls.
- [x] Add promotional credit and coupon management.
- [x] Add platform 30-day Ads revenue and performance analytics API data.
- [x] Add admin time-series visualization for platform Ads analytics.
- [ ] Add fraud review and blocked-content management.

## Delivery and rendering
- [x] Implement eligible campaign selection and bid-weighted ranking.
- [x] Implement daily/total campaign budget enforcement and account balance enforcement.
- [x] Automate scheduled activation, end-date completion, and budget exhaustion.
- [x] Implement advanced time-distributed campaign pacing.
- [x] Implement initial per-campaign browser-session frequency caps.
- [x] Implement separate sponsored product placements above organic search results.
- [x] Implement category-targeted sponsored product placements above organic category results.
- [x] Implement category-aware sponsored recommendations on product-detail pages without replacing organic recommendations.
- [x] Add paid sponsored-brand campaigns to the shared Hub homepage flow.
- [x] Add paid sponsored-content/banner campaigns across all Hub homepage templates.
- [ ] Remove template-local organic placeholder sponsored-brand sections after visual regression review.
- [x] Add accessible Sponsored labels to the initial Hub sponsored-products rail.
- [x] Add visible Sponsored labels to product, brand, and banner formats.
- [x] Preserve organic homepage content while rendering paid placements as separate sections.

## Measurement and safety
- [x] Implement signed, expiring ad event tokens.
- [x] Implement 50%-visible-for-one-second impression tracking.
- [x] Implement initial click tracking.
- [x] Implement server-owned safe redirect endpoints restricted to platform destinations.
- [x] Implement idempotent event-key duplicate suppression.
- [x] Implement session-window duplicate impression/click suppression.
- [x] Implement initial user-agent bot/crawler filtering.
- [ ] Add advanced behavioral bot and anomaly detection.
- [x] Implement authenticated seller self-click exclusion.
- [x] Hash IP identifiers and apply retention limits.
- [x] Implement order conversion attribution for verified recent sponsored interactions.
- [x] Implement seven-day click and one-day view attribution windows.
- [x] Move conversion recognition from order creation to captured payment for prepaid gateways.
- [x] Define and implement conversion recognition policy for COD and approved manual-mandat payments.
- [x] Implement daily analytics aggregation and raw-event retention.
- [x] Add dedicated public Ads delivery and event rate limits.
- [ ] Implement suspicious activity reporting dashboard and automated blocking.

## Quality and rollout
- [x] Add initial ledger idempotency test coverage.
- [ ] Add concurrent ledger atomicity integration tests.
- [x] Add initial campaign lifecycle, validation, and authorization service tests.
- [x] Enforce product ownership, published status, placement validity, and Ads-account status in campaign operations.
- [x] Add Ads campaign and analytics tenant-isolation unit tests.
- [x] Add Ads route-level tenant-isolation integration tests.
- [x] Add delivery, pacing, and budget tests.
- [x] Add event deduplication and fraud tests.
- [x] Add attribution tests.
- [ ] Add seller and admin UI tests. (Seller campaign wizard and performance chart coverage added; admin coverage remains.)
- [x] Add RTL tests.
- [ ] Add end-to-end refill, campaign, moderation, delivery, and conversion tests.
- [ ] Run migrations in staging and verify rollback strategy.
- [ ] Run full backend, frontend, and E2E pipelines.
- [x] Deploy Ads runtime behavior behind an admin-controlled feature flag.
- [ ] Monitor spend accuracy, delivery latency, errors, and fraud indicators.
