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
4. On `/hub/dashboard/settings`, verify the Store basics card reflects name, read-only subdomain, logo status, and color status.
5. Change the store name, save settings, and verify `store_basics.metadata.store_name`, `subdomain`, `has_logo`, and `has_custom_colors` in `/api/pd/auth/onboarding`.
6. Use the Theme tab's advanced customization to select a color preset, save, refresh, and verify the Store basics color task persists.
7. For endpoint-level validation, use the authenticated browser session and CSRF cookie to PATCH `/api/pd/auth/onboarding` concurrently for two different steps, then confirm both steps remain in the returned JSON.
8. Patch `store_basics.completed` from `true` to `false` and confirm `completed_at` becomes `null`.
9. Clean up any temporary store name or QA metadata used during testing.

## Known local caveats

- Dashboard load may log an existing `GET /api/pd/orders/store?limit=200&date_from=...` 400 while onboarding tests still pass; treat it as separate from onboarding unless it becomes visible to the user.
- Keep screenshots/recordings full-screen for user evidence.
