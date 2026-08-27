# 01 — Superadmin Governance Dashboard Deep Audit

## 1. Scope & Capabilities (`frontend/src/app/(admin)/*`)

The Superadmin Dashboard provides governance over the entire multi-tenant platform:

```
frontend/src/app/(admin)/
├── dashboard/                 # High-level KPIs, GMV, MRR, growth charts
├── products/                  # Marketplace product catalog inspection & AI tag studio
├── kyc/                       # Merchant identity verification queue (CIN / RC documents)
├── mandats/                   # Mandat Minute payment proof validation queue
├── reports/                   # Customer fraud reports & dispute case threads
├── users/ & vendors/ & buyers/# User accounts, multi-store ownership, role suspension
├── stores/                    # Store domains, plans, and maintenance toggles
├── withdrawals/               # Seller wallet payout requests & bank transfer processing
├── plans/                     # 7-tier subscription pricing, limits & feature flags
├── marketplace-categories/    # 3-tier multilingual category taxonomy editor
├── platform-media/            # Global media assets & category banners
├── ai-costs/                  # Gemini token consumption, cost breakdown & provider routing
├── audit-log/                 # Immutable administrative action trail
├── system-logs/               # Live server log viewer & error filters
├── smtp-config/               # Dynamic SMTP server configuration & email test runner
├── settings/                  # Marketplace branding, maintenance mode, SEO & analytics IDs
├── ads/                       # PandaMarket Ads campaign moderation, pricing & fraud radar
├── admin-notes/               # Collaborative notes with folder hierarchy & reminder scheduler
├── subscription-orders/       # Subscription payment intents, receipts & dispute evidence
├── fraud-radar/               # Risk scoring, disposable email radar & chargeback freezing
├── platform-analytics/        # Real-time velocity pulse, governorate heatmaps & predictive forecasting
└── cms/                       # Marketplace legal pages & content block revisions
```

---

## 2. Deep Audit of Critical Governance Queues

### 2.1 KYC Merchant Verification (`/kyc`)
- **Workflow:** 100% manual review. Admin inspects uploaded identity cards (CIN) and Registre de Commerce (RC) PDFs with presigned download URLs.
- **State Transition:** Approving changes `pd_store.is_verified = true` and `pd_store.status = 'verified'`, unlocking instant product publication.
- **Audit Findings:** Robust. Includes rejection reason textarea and automatic notification delivery to the seller.

### 2.2 Mandat Minute Verification Queue (`/mandats`)
- **Workflow:** Buyers who choose "Mandat Minute" at checkout upload a postal receipt photo. Admin inspects the receipt against expected order total and approves/rejects.
- **State Transition:** Approval triggers `payment.captured` event, transitioning order to `processing` and crediting seller escrow wallet.
- **Audit Findings:** Fully functional with image zoom preview and audit log recording.

### 2.3 Product Catalog & AI Tag Studio (`/products`)
- **Dual View Modes:** Toggle between high-density data table and visual grid cards.
- **Slide-Out Inspection Drawer:** 6 tabbed panels (Overview, Variants Breakdown, Attributes & Specs, SEO & Taxonomy, Store Info, AI Tag Studio).
- **AI Tagging:** Superadmins can trigger Gemini auto-tagging to enrich product interest tags and vendor tags with a single click.

---

## 3. Superadmin Dashboard Checklist

- [x] Superadmin authentication guard and automatic session timeout.
- [x] Full KYC and Mandat Minute verification review workflows.
- [x] Products catalog inspection drawer with live AI tag studio.
- [x] Dynamic SMTP configuration test email sender.
- [ ] Add CSV export for filtered tax receipts in subscription orders.
