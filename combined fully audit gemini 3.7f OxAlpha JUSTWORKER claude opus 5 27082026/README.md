# Tri-Agent Combined Deep Platform Audit Dossier
## PandaMarket: Marketplace Hub, Multi-Tenant Storefronts, Seller Dashboard & Superadmin Command Center

> **Audit Lineage & Synthesis:**
> - **Ox Alpha** (Auditor A, 2026-08-26): Dedicated deep passes on AI Functionality & Costs, Marketplace CMS, Storefront Theming (20 Themes), and Superadmin Settings.
> - **Gemini 3.7 Flash** (Auditor B, 2026-08-26): Live TypeScript compile breakage discovery, production dependency audit (\`nodemailer\`), financial event bus disconnect, stored XSS sinks, and master synthesis.
> - **JUSTWORKER Claude Opus 5** (Auditor C, 2026-08-27): Live production probes, Supabase SQL query benchmarks, 225 mutating routes inventory, 126 tables schema audit, Render environment inventory, tenant boundary crossing discoveries (B-01), domain TLS hijacking (B-03), ads balance minting (B-04), and shadow route bugs (B-06).
>
> **Audit Standard:** 100% Evidence-based, verified against live endpoints (Render backend \`srv-d9qjrth42hec73efhoa0\`, Vercel frontend \`prj_f0I1YhUlcTCSY8MZ8KV4M6b5Ob\`, Supabase AWS eu-central-1 pooler).
> **Safety Directive:** In strict adherence to user instructions, **zero project codebase files were modified**.

---

## 📁 Sliced Dossier Architecture & Navigation Map

```
combined fully audit gemini 3.7f OxAlpha JUSTWORKER claude opus 5 27082026/
│
├── README.md                                          <-- Master Navigation Hub (You are here)
│
├── 00-MASTER-CHECKLIST/                               <-- Sliced Actionable Execution Checklists
│   ├── README.md                                      <-- Execution standards & rules
│   ├── TIER-0-IMMEDIATE-BLOCKERS.md                   <-- Days 1-2: 11 Critical Blockers (Build, Money, Security)
│   ├── TIER-1-PLATFORM-STABILITY.md                   <-- Week 1: 28 High Priority Bugs (B-06 to B-33)
│   ├── TIER-2-FEATURE-COMPLETION.md                   <-- Weeks 2-3: Core Commerce & PRD Gaps
│   ├── TIER-3-ARCHITECTURE-DEBT.md                    <-- Month 1: Refactoring, Outbox, Cloudflare R2
│   └── TIER-4-GROWTH-ROADMAP.md                       <-- Month 2: WhatsApp updates, COD driver console, PWA
│
├── 01-EXECUTIVE-AND-HEALTH/                           <-- Executive Reports & Live Health
│   ├── 01-EXECUTIVE-SUMMARY.md                        <-- Verdict & 5 structural fault lines
│   ├── 02-PLATFORM-TOPOLOGY-AND-MAP.md                <-- Architecture map & components
│   ├── 03-LIVE-PROBE-BENCHMARKS.md                    <-- Live probe results & test evidence
│   └── 04-WHAT-IS-GENUINELY-SOLID.md                  <-- Systems to preserve & protect
│
├── 02-BUGS-AND-PROBLEMS/                              <-- Complete Catalog of Platform Bugs
│   ├── README.md                                      <-- Severity definitions & bug counts
│   ├── P0-CRITICAL/                                   <-- Sliced into individual dedicated files
│   │   ├── P0-01-BACKEND-BUILD-FAILURE.md             <-- retentionRouter compile breakage (TS2304)
│   │   ├── P0-02-FINANCIAL-EVENT-BUS.md               <-- Wallet credits dropped on card & COD
│   │   ├── P0-03-STOREFRONT-TOKEN-BOUNDARY.md         <-- Customer tokens cross to vendor store
│   │   ├── P0-04-DOMAIN-TLS-HIJACKING.md              <-- Custom domain verification bypass
│   │   ├── P0-05-ADS-BALANCE-MINTING.md               <-- Ads auto-refill free credit creation
│   │   ├── P0-06-SETTINGS-SUPERADMIN-BYPASS.md        <-- PUT /admin/settings bypasses guards
│   │   ├── P0-07-MANDAT-RECEIPT-REVIEW.md             <-- Raw SQL updates bypass markPaidInTransaction
│   │   ├── P0-08-NODEMAILER-DEPENDENCY.md             <-- Missing nodemailer in dependencies
│   │   ├── P0-09-WEBHOOK-HMAC-BYPASS.md               <-- Webhook HMAC bypass outside prod
│   │   ├── P0-10-STORED-XSS-SINKS.md                  <-- AI HTML descriptions stored XSS
│   │   └── P0-11-SECRETS-FILE-LEAK.md                 <-- env-vars.json git tracked
│   │
│   ├── P1-HIGH/                                       <-- 28 High Severity Bugs in logical clusters
│   │   ├── B-06-TO-B-10-CORE-FLOWS.md                 <-- Shadowed routes, bundle 500, JSON-LD, fake success
│   │   ├── B-11-TO-B-16-COMMERCE-GAPS.md              <-- Coupon duplication, onboarding, gating, commission
│   │   ├── B-17-TO-B-21-SECURITY-INFRA.md             <-- SMS OTP logging, withdrawals, refunds, metrics, Sentry
│   │   ├── B-22-TO-B-26-WORKERS-AND-ADS.md            <-- Outbox worker, click fraud, 60k ads churn, 15m logout
│   │   └── B-27-TO-B-33-FRONTEND-DATA.md              <-- SSR XSS, image quota swallow, fake analytics, migrations
│   │
│   └── P2-MEDIUM/                                     <-- 59 Medium Defects in logical clusters
│       ├── B-34-TO-B-50-DATABASE-AND-AUTH.md          <-- Unindexed FKs, RLS gaps, stuck AI, rate limits, 2FA
│       ├── B-51-TO-B-70-SERVICES-AND-SECURITY.md      <-- Crypto AAD, S3 presigned, attachment leak, CSRF substring
│       └── B-71-TO-B-92-UI-AND-HYGIENE.md             <-- Monolithic products page, RTL flash, fake forms, repo cleanup
│
├── 03-DEEP-PASS-DOMAINS/                              <-- Dedicated Domain Deep Dives
│   ├── 01-AI-FUNCTIONALITY-AND-COSTS.md               <-- 20 AI bugs, 11 security issues, provider cascade
│   ├── 02-MARKETPLACE-CMS-AND-PAGES.md                <-- Hidden /cms admin route, duplicate slugs, legal pages
│   ├── 03-STOREFRONT-THEMING-20-TEMPLATES.md          <-- 20 themes analysis, uniform skeletons, case split
│   └── 04-SUPERADMIN-SETTINGS-MONOLITH.md             <-- 6.2K monolith, 15 double-owned keys, 7-tab redesign
│
├── 04-MISSING-WORK-PRD/                               <-- PRD Gap Analysis (18 Items)
│   ├── README.md                                      <-- PRD gap overview & prioritization
│   ├── M-01-TO-M-06-CORE-COMMERCE.md                  <-- Email (Brevo), Cloudflare R2, Meili, coupons, payouts, refunds
│   └── M-07-TO-M-18-PLATFORM-FEATURES.md              <-- Capabilities, order route, OTP, digital keys, worker split, CMS
│
├── 05-SECURITY-AND-COMPLIANCE/                        <-- Security Hardening & Legal Framework
│   ├── 01-SECURITY-HARDENING.md                       <-- Secrets rotation, TLS pinning, CSRF, CSP
│   └── 02-TUNISIAN-PDP-2004-63-COMPLIANCE.md          <-- Data protection law, cookie consent, DSAR
│
├── 06-IMPLEMENTATION-GUIDES/                          <-- Verified Diff-Level Developer Blueprints
│   ├── README.md                                      <-- Guide index
│   ├── GUIDE-A-BUILD-AND-REWARDS.md                   <-- P0-1 Fix (main.ts & retention.route.ts)
│   ├── GUIDE-B-STOREFRONT-TOKEN-ISOLATION.md          <-- P0-3 Fix (JWT claim & middleware isolation)
│   ├── GUIDE-C-EVENT-BUS-WIRING.md                    <-- P0-2 Fix (PAYMENT_CAPTURED event emission)
│   ├── GUIDE-D-DOMAIN-TLS-VERIFICATION.md             <-- P0-4 Fix (Custom domain verification & TLS)
│   ├── GUIDE-E-ADS-BALANCE-PROTECTION.md              <-- P0-5 Fix (Ads balance minting protection)
│   ├── GUIDE-F-SETTINGS-SECURITY-GUARD.md             <-- P0-6 Fix (Superadmin settings route guard)
│   ├── GUIDE-G-MANDAT-RECEIPT-REVIEW.md               <-- P0-7 Fix (markPaidInTransaction for Mandat)
│   └── GUIDE-H-HYGIENE-AND-SECURITY-FIXES.md          <-- P0-8 to P0-11 Fixes (Nodemailer, HMAC, XSS, Secrets)
│
├── 07-ROADMAP-AND-NEW-IDEAS/                          <-- Growth & Innovation Proposals
│   ├── 01-ARCHITECTURAL-UPGRADES.md                   <-- Double-entry ledger, Outbox pattern, Worker split
│   ├── 02-TUNISIAN-MARKET-INNOVATIONS.md              <-- WhatsApp order updates, COD driver console, D17
│   └── 03-SEVENTY-TWO-DOMAIN-PROPOSALS.md             <-- 72 proposals across AI, CMS, Themes, Settings
│
├── 08-APPENDICES-AND-INVENTORIES/                     <-- Technical Reference Inventories
│   ├── APPENDIX-A-ROUTE-AND-GUARD-INVENTORY.md        <-- 225 mutating routes inventory
│   ├── APPENDIX-B-DATABASE-AUDIT-AND-STATS.md         <-- 126 tables, 7 unindexed FKs, 5 tables no RLS
│   ├── APPENDIX-C-ENVIRONMENT-INVENTORY.md            <-- 16 Render backend env vars vs expected
│   └── APPENDIX-D-PAGE-STATUS-MATRIX.md               <-- 288 routes status matrix across 4 surfaces
│
└── 09-IMPLEMENTATION-PLANS/                           <-- Full Engineering Specifications by Task
    ├── TIER-0/                                        <-- 11 Critical Blocker Engineering Specifications (P0-1 to P0-11)
    │   ├── README.md                                  <-- Tier 0 engineering plan index
    │   └── ... (11 files)
    ├── TIER-1/                                        <-- 28 High-Priority Stability Specifications (B-06 to B-33)
    │   ├── README.md                                  <-- Tier 1 engineering plan index
    │   └── ... (28 files)
    ├── TIER-2/                                        <-- 18 Feature Completion Specifications (M-01 to M-18)
    │   ├── README.md                                  <-- Tier 2 engineering plan index
    │   └── ... (18 files)
    ├── TIER-3/                                        <-- 6 Architecture Debt Specifications (T3-01 to T3-06)
    │   ├── README.md                                  <-- Tier 3 engineering plan index
    │   ├── PLAN-T3-01-DOUBLE-ENTRY-LEDGER.md          <-- Double-entry general ledger
    │   └── ... (6 files)
    └── TIER-4/                                        <-- 6 Growth & Tunisian Innovation Specs (T4-01 to T4-06)
        ├── README.md                                  <-- Tier 4 engineering plan index
        ├── PLAN-T4-01-WHATSAPP-AUTOMATED-ENGAGEMENT.md<-- WhatsApp order tracking & support
        ├── PLAN-T4-02-COD-COURIER-MOBILE-CONSOLE.md   <-- COD Courier mobile console
        └── ... (6 files)
```

---

## 📊 Combined Metrics Summary

| Severity Tier | Finding Count | Definition & Business Impact |
|---|---|---|
| **P0 Critical** | **11** | Build failures, direct financial loss, money creation, or tenant boundary crossing. |
| **P1 High** | **28** | Broken core user flows, silent feature failure, data corruption, or wrong numbers shown. |
| **P2 Medium** | **59** | Real defects with workarounds, performance bottlenecks, unindexed FKs, UI hygiene. |
| **Missing Work (PRD)** | **18** | Promised functional capabilities that do not yet exist in the codebase. |
| **Roadmap & Enhancements** | **72 + 35** | High-leverage architectural upgrades and localized Tunisian market innovations. |
| **Total Actionable Items** | **175** | Fully deduplicated, cross-referenced, and ready for engineering execution. |
