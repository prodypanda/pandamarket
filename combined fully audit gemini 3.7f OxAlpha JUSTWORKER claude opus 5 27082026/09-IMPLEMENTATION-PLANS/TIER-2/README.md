# 09 · Tier 2 Implementation Plans (Full Engineering Specifications)

> **Standard:** Production-grade engineering specifications including architectural root cause, exact line-by-line diffs, concurrency & security considerations, automated tests, manual cURL/probe verifications, and rollback procedures.
> **Scope:** 18 Critical PRD Gaps & Core Commerce Infrastructure (Weeks 2–3).

---

## 📋 Implementation Plans Index (M-01 through M-18)

| Plan | Target PRD Feature | Primary Technologies | Effort |
|---|---|---|---|
| [**PLAN-M-01**](./PLAN-M-01-TRANSACTIONAL-EMAIL-PROVIDER.md) | Production Transactional Email Provider | Brevo API, Resend fallback, BullMQ | 🛠 3 h |
| [**PLAN-M-02**](./PLAN-M-02-CLOUDFLARE-R2-OBJECT-STORAGE.md) | S3-Compatible Cloudflare R2 Storage Adapter | AWS SDK v3, R2 Bucket, Presigned URLs | 🛠 4 h |
| [**PLAN-M-03**](./PLAN-M-03-MEILISEARCH-SEARCH-ENGINE.md) | Meilisearch Engine & PostgreSQL Sync Worker | Meilisearch SDK, BullMQ, ILIKE fallback | 🛠 4 h |
| [**PLAN-M-04**](./PLAN-M-04-COUPON-ENGINE-AND-DATABASE.md) | Real Dynamic Coupon Database & Creator | PostgreSQL (`pd_coupon`), Zod, Admin UI | 🛠 4 h |
| [**PLAN-M-05**](./PLAN-M-05-WITHDRAWAL-APPROVAL-WORKFLOW.md) | Admin Withdrawal Review & Payout Pipeline | State Machine, Bank Reference, Audit Log | 🛠 3 h |
| [**PLAN-M-06**](./PLAN-M-06-REFUND-EXECUTION-PIPELINE.md) | Automated Payment Gateway Refund Processor | Flouci/Konnect Refund API, Wallet Reversal | 🛠 4 h |
| [**PLAN-M-07**](./PLAN-M-07-ADMIN-ROLE-BASED-ACCESS-CONTROL.md) | Admin RBAC & Section Capabilities Matrix | `pd_admin_role`, Middleware, Admin UI | 🛠 3 h |
| [**PLAN-M-08**](./PLAN-M-08-SELLER-ORDER-MANAGEMENT-API.md) | Dedicated Seller Orders & Fulfillment Endpoint | `GET /api/pd/seller/orders`, Shipping Tags | 🛠 2 h |
| [**PLAN-M-09**](./PLAN-M-09-PHONE-OTP-VERIFICATION-ENGINE.md) | Customer Phone OTP Verification Engine | Evolution API WhatsApp, Redis Rate Limiter | 🛠 3 h |
| [**PLAN-M-10**](./PLAN-M-10-DIGITAL-LICENSE-KEYS-POOL.md) | Digital License Key Pool & Delivery Engine | `pd_serial_key`, AES-256 GCM, Event Bus | 🛠 3 h |
| [**PLAN-M-11**](./PLAN-M-11-DEDICATED-WORKER-DEPLOYMENT.md) | Decoupled Background Worker Process | BullMQ, Render Worker Service, Redis | 🛠 3 h |
| [**PLAN-M-12**](./PLAN-M-12-LEGAL-CMS-POLICY-PAGES.md) | Legal Policy CMS (ToS, Privacy, PDP 2004-63) | Versioned CMS, Markdown Renderer, SEO | 🛠 2 h |
| [**PLAN-M-13**](./PLAN-M-13-STUCK-JOB-REAPER-AND-DLQ.md) | Background Job Reaper & Dead-Letter Queue | Redis DLQ, Health Probes, Error Alerter | 🛠 2.5 h |
| [**PLAN-M-14**](./PLAN-M-14-STORE-THEME-CUSTOMIZER.md) | Storefront Visual CSS Theme Customizer | CSS Variables, Google Fonts, Presets | 🛠 4 h |
| [**PLAN-M-15**](./PLAN-M-15-MULTI-CURRENCY-DISPLAY-ENGINE.md) | Multi-Currency Display (TND, EUR, USD, SAR) | BCT Exchange Rates, Geolocation Preview | 🛠 3 h |
| [**PLAN-M-16**](./PLAN-M-16-REVIEW-MEDIA-ATTACHMENTS.md) | Verified Customer Review Media Attachments | Photo/Video Upload, Anti-Spam Quota | 🛠 3 h |
| [**PLAN-M-17**](./PLAN-M-17-PDF-INVOICE-AND-DELIVERY-SLIP.md) | Automated PDF Invoices & Delivery Slips | PDFKit, Tax Stamp (1.000 TND), TVA | 🛠 3.5 h |
| [**PLAN-M-18**](./PLAN-M-18-ABANDONED-CART-RECOVERY.md) | Automated Abandoned Cart Recovery Sequences | BullMQ Cron, Discount Trigger, WhatsApp | 🛠 3 h |
