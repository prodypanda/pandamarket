# Appendix D · Page & Route Status Matrix

[← Index](./00-README.md) · Prev: [Appendix C](./C-ENVIRONMENT-AND-DEPLOYMENT.md)

Status matrix across all 288 routes and pages in the frontend workspace.

## 1. Marketplace Hub (`frontend/src/app/hub/`)
| Page Route | Status | Key Defect / Finding |
| --- | --- | --- |
| `/` (Homepage) | Partial | JSON-LD injection (B-08), uncached feed |
| `/search` | Partial | 'use client' root, state not in URL (B-65) |
| `/products/[id]` | Partial | Transient 500 becomes permanent 404 (B-09), no JSON-LD |
| `/cart` | Complete | Hardcoded coupons & shipping (B-11) |
| `/checkout` | Complete | Authoritative server quote |
| `/checkout/success` | Broken | Asserts payment success from query param (B-10) |
| `/orders` | Partial | Missing tracking timeline, inaccessible disclosure (B-69) |
| `/wishlist` | Partial | Login CTA points to 404 route `/auth/login` (B-68) |
| `/pages/[slug]` | Stub | 0 rows in DB, live 404, no hub navbar/footer (B-66) |

## 2. Storefront Engine (`frontend/src/app/store/[storeHost]/`)
| Page Route | Status | Key Defect / Finding |
| --- | --- | --- |
| `/` | Complete | Renders 20 themes with uniform skeleton (STF-M1) |
| `/products` | Broken | Missing public-store gate on unverified stores (B-25) |
| `/cart` | Complete | Hardcoded shipping constants (B-11) |
| `/checkout` | Complete | Mandates account login, blocks guest checkout (MW-1) |
| `/account` | Partial | Layout redirects to marketplace `/login` (B-87) |

## 3. Seller Dashboard (`frontend/src/app/hub/dashboard/`)
| Page Route | Status | Key Defect / Finding |
| --- | --- | --- |
| `/onboarding` | Broken | 3 of 7 steps cannot complete (B-12) |
| `/products` | Partial | 7,848-line monolith (B-79), client filters on page 1 (B-29) |
| `/orders` | Partial | Missing dedicated `/orders/[id]` route (M-08) |
| `/media` | Broken | Unpaginated, re-decodes every blob on read (B-30) |
| `/wallet` | Complete | Read-only payout ledger without approval queue (B-18) |
| `/online-store/customize` | Broken | Fullscreen preview shows stale settings (STF-1) |
| `/online-store/themes` | Broken | Activates premium themes without purchase check |

## 4. Superadmin Command Center (`frontend/src/app/(admin)/`)
| Page Route | Status | Key Defect / Finding |
| --- | --- | --- |
| `/settings` | Broken | 6,245-line monolith, 15 double-owned keys 409 conflict |
| `/cms` | Broken | Completely unreachable from admin sidebar (CMS-1) |
| `/withdrawals` | Partial | Read-only ledger presented as approval queue (B-18) |
| `/ai-costs` | Broken | Stored XSS sink in prompt inspect drawer (B-07 / AI-S1) |
| `/buyers` | Broken | Suspend route shadowed, doesn't revoke sessions (B-06) |
