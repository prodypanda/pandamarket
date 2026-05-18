---
name: testing-onboarding
description: Test PandaMarket seller onboarding, dashboard welcome dismissal, and store-basics settings persistence end-to-end.
---

## Devin Secrets Needed

None for local seeded testing. Use the project-local vendor test account: `vendor.pro@test.tn` / `Test123!`.

## Local setup

1. Start Docker services from the repo root: `npm run docker:up`.
2. Run backend from `backend`: `npm run dev`.
3. Run frontend from `frontend`: `npm run dev`.
4. If Next/Tailwind fail on missing Linux native optional packages, verify root optional dependencies are installed and clear `frontend/.next` before restarting the frontend. `npm install` at the repo root may be needed when optional dependencies are missing.
5. Open `http://localhost:3000/login/seller?next=%2Fhub%2Fdashboard` in Chrome.

## Seller onboarding test flow

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

## Known local caveats

- Dashboard load may log an existing `GET /api/pd/orders/store?limit=200&date_from=...` 400 while onboarding tests still pass; treat it as separate from onboarding unless it becomes visible to the user.
- Local rate limits can be triggered by many rapid UI/API checks. Keep endpoint checks to a small batch. A transient `Too many requests` banner does not fail a tab-deeplink check if the correct tab and form content still render.
- If UI cleanup is rate-limited, restore local seed data directly in PostgreSQL and verify it. For the seeded vendor, reset the store name to `Atelier Médina` and remove QA-only onboarding metadata for `vendor.pro@test.tn`.
- Keep screenshots/recordings full-screen for user evidence.
