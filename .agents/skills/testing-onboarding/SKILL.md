---
name: testing-onboarding
description: Test PandaMarket seller onboarding, dashboard welcome dismissal, store-basics settings persistence, theme-selection onboarding, and KYC onboarding end-to-end.
---

## Devin Secrets Needed

None for local seeded testing. Use the project-local vendor test account: `vendor.pro@test.tn` / `Test123!`.

## Local setup

1. Start Docker services from the repo root: `npm run docker:up`.
2. Run backend from `backend`: `npm run dev`.
3. Run frontend from `frontend`: `npm run dev`.
4. If Next/Tailwind fail on missing Linux native optional packages, verify root optional dependencies are installed and clear `frontend/.next` before restarting the frontend. `npm install` at the repo root may be needed when optional dependencies are missing.
5. Open `http://localhost:3000/login/seller?next=%2Fhub%2Fdashboard` in Chrome.

## Seller onboarding store-basics test flow

1. Log in as `vendor.pro@test.tn` / `Test123!`.
2. On `/hub/dashboard`, dismiss the welcome modal and verify `/api/pd/auth/onboarding` returns `welcome.dismissed: true` with `dismissed_at` populated.
3. Refresh the dashboard and verify the welcome modal stays dismissed.
4. Verify the sidebar includes `Setup guide`, then open `/hub/dashboard/onboarding` and confirm the guide renders Store basics, Theme, KYC, First product, and Payments steps.
5. On the onboarding guide, verify Store basics contains name, subdomain, logo, and color tasks; compare the task state with `/api/pd/stores/me`.
6. Click `Sync progress` and verify `store_basics.metadata.store_name`, `subdomain`, `has_logo`, and `has_custom_colors` in `/api/pd/auth/onboarding`.
7. Follow Store task links to `/hub/dashboard/settings?tab=store`; assert the `Boutique` tab is visually active and fields such as `Nom de la boutique` and `Sous-domaine public` are visible.
8. Follow Color/Theme task links to `/hub/dashboard/settings?tab=theme`; assert the `Thème` tab is visually active and theme controls are visible.
9. Change the store name, save settings, sync onboarding again, and verify `store_basics.metadata.store_name` uses the changed value.
10. Use the authenticated browser session and CSRF cookie to PATCH `/api/pd/auth/onboarding` concurrently for two different steps, then confirm both steps remain in the returned JSON.
11. Patch `store_basics.completed` from `true` to `false` and confirm `completed_at` becomes `null`.
12. Clean up any temporary store name or QA metadata used during testing.

## Seller onboarding theme-selection test flow

1. Capture the seeded vendor's `pd_store.theme_id`, `settings.themeCustomization`, `subdomain`, and `pd_user.onboarding_state` from PostgreSQL before browser assertions.
2. Open `/hub/dashboard/onboarding#theme` and verify five launch steps plus Theme selection tasks: Theme template, Palette and layout, and Storefront preview.
3. Confirm the theme preview title matches the resolved persisted theme. Missing or unknown `theme_id` should resolve to `Classic`.
4. Confirm the reviewed count matches persisted state: template if `theme_id` exists, palette/layout if customization exists, preview if `subdomain` exists.
5. Click `Open theme settings` and verify `/hub/dashboard/settings?tab=theme` renders the active `Thème` tab.
6. Select a different visible theme template, save with `Appliquer le thème`, and verify `pd_store.theme_id` plus `onboarding_state.theme.completed=true` and metadata.
7. Save a visible color preset/customization and verify `settings.themeCustomization.colorPresetId` matches `onboarding_state.theme.metadata.color_preset_id`.
8. Return to `/hub/dashboard/onboarding#theme`, refresh, and verify the saved theme/customization remains reflected in the guide.
9. For regression coverage, temporarily set local `pd_store.theme_id = NULL` and `onboarding_state.theme.completed=true` in PostgreSQL, then force a fresh browser document before reloading `/hub/dashboard/onboarding#theme`.
10. Verify onboarding shows the `Classic` fallback and keeps the Theme selected wizard step complete; then verify settings selects `Classic`, not `Modern`.
11. Click `Sync theme` from onboarding and confirm it preserves `theme.completed=true` while writing fallback metadata `theme_id: classic`.
12. Open `/hub/dashboard` and verify the dashboard card plus sticky progress banner use five launch steps and respect persisted theme completion.
13. Restore the original store theme/settings/onboarding state in PostgreSQL and verify cleanup.

## Seller onboarding KYC test flow

1. Capture the seeded vendor's `pd_verification_documents`, `pd_store.is_verified/status`, and `pd_user.onboarding_state` before browser assertions.
2. For not-submitted coverage, delete the seeded store's verification row, set the store unverified, and clear `onboarding_state.kyc`.
3. Open `/hub/dashboard/onboarding#kyc` and verify KYC status is not submitted, progress is `0%`, the wizard card is incomplete, and `/hub/dashboard` does not complete `KYC approved`.
4. Open `/hub/dashboard/kyc`, upload dummy RC/CIN PDFs, enter a phone number, submit, and verify `pd_verification_documents.status='pending'` with both document URLs and phone saved.
5. Verify pending KYC writes onboarding metadata with `metadata.status='pending'` while `completed` stays false or absent.
6. Reload `/hub/dashboard/kyc` and confirm it leaves the skeleton promptly and renders pending details; the onboarding metadata PATCH on load must not block the page.
7. Open `/hub/dashboard/onboarding#kyc`, click `Sync KYC`, and verify progress is `67%`, document/phone tasks are complete, admin review is incomplete, and dashboard/sticky progress do not count KYC as complete.
8. For stale-completion coverage, update the verification row to `status='rejected'` with a rejection reason while intentionally setting `onboarding_state.kyc.completed=true`.
9. Verify onboarding, KYC page, dashboard setup item, and sticky progress all treat rejected KYC as incomplete and display the rejection reason.
10. For approved coverage, set the verification row to `status='approved'`, set `pd_store.is_verified=true/status='verified'`, and clear rejection reason.
11. Verify onboarding progress is `100%`, the wizard KYC card is complete, `/hub/dashboard/kyc` shows `Compte Vérifié ✓`, and the dashboard `KYC approved` item renders a `lucide-circle-check` icon.
12. Restore the original seeded KYC row, store verification status, and onboarding state in PostgreSQL. Verify no temporary document URLs, rejection reason, or QA-only KYC metadata remains.

## Known local caveats

- Dashboard load may log an existing `GET /api/pd/orders/store?limit=200&date_from=...` 400 while onboarding tests still pass; treat it as separate from onboarding unless it becomes visible to the user.
- Local rate limits can be triggered by many rapid UI/API checks. Keep endpoint checks to a small batch. A transient `Too many requests` banner does not fail a tab-deeplink check if the correct tab and form content still render.
- Theme and KYC onboarding browser runs can exceed the local `apiRateLimit` (`100` requests per `60s`) because dashboard/settings/KYC pages load many widgets. If protected routes unexpectedly show seller login or 429s after many rapid navigations, wait one full API limiter window or restart the local backend, then retry once before treating it as a feature failure.
- After direct PostgreSQL mutations used for edge-state testing, force a fresh document such as `about:blank` before loading the same onboarding route/hash. This avoids stale React state from the previous page instance.
- KYC page status-load sync is intentionally fire-and-forget. When verifying cleanup after KYC tests, navigate browser pages to `about:blank`, restore seed data in PostgreSQL, and verify cleanup directly if inline UI cleanup races with background sync.
- If Playwright screenshots hang on local fonts, capture evidence frames with X11/ffmpeg instead of expanding the browser test scope.
- Dashboard completed setup items use the rendered icon (`lucide-circle-check` versus `lucide-clock`) as the stable assertion; do not rely on color alone because some states share amber styling.
- If UI cleanup is rate-limited, restore local seed data directly in PostgreSQL and verify it. For the seeded vendor, reset the store name to `Atelier Médina` and remove QA-only onboarding metadata for `vendor.pro@test.tn`.
- Keep screenshots/recordings full-screen for user evidence.
