# 01 · Architectural Upgrades (Double-Entry Ledger, Outbox, Worker Split)
# 12 — New Ideas, Enhancements & Innovation Roadmap

> **Context:** A comprehensive catalog of architectural upgrades, Tunisian e-commerce adaptations, and growth features designed to transition PandaMarket from an MVP into an enterprise-grade platform.

---

## 1. Core Architectural Upgrades

### [ENH-1] Double-Entry Ledger for Vendor Wallets (`pd_wallet_ledger`)
- **Current Limitation:** Wallet balance is updated via direct arithmetic `SET balance = balance + $1` on `pd_vendor_wallet`. A race condition, missing update, or failed query leaves balances permanently out of sync.
- **Proposed Architecture:**
  1. Create an immutable double-entry ledger table:
     ```sql
     CREATE TABLE pd_wallet_ledger (
       id VARCHAR(64) PRIMARY KEY,
       wallet_id VARCHAR(64) NOT NULL REFERENCES pd_vendor_wallet(id),
       entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('credit', 'debit')),
       amount DECIMAL(12,3) NOT NULL CHECK (amount > 0),
       balance_after DECIMAL(12,3) NOT NULL,
       reference_type VARCHAR(40) NOT NULL, -- 'order_sale', 'commission_fee', 'payout', 'ad_spend'
       reference_id VARCHAR(64) NOT NULL,
       idempotency_key VARCHAR(128) UNIQUE NOT NULL,
       created_at TIMESTAMP DEFAULT NOW()
     );
     ```
  2. The `balance` column on `pd_vendor_wallet` becomes a cached materialized value.
  3. A nightly reconciliation cron calculates `SUM(credit) - SUM(debit)` and alerts instantly on any ledger drift.

---

### [ENH-2] Decompose High-Risk Code Monoliths
- **Current Bottlenecks:**
  - `frontend/src/app/hub/dashboard/products/page.tsx`: **7,848 lines (417 KB)**
  - `frontend/src/app/(admin)/settings/page.tsx`: **6,246 lines (344 KB)**
  - `backend/src/services/analytics.service.ts`: **4,677 lines (202 KB)**
- **Decomposition Plan:**
  1. **Products Page Refactoring:**
     - `components/dashboard/products/ProductListTable.tsx` (Data grid, pagination, sorting)
     - `components/dashboard/products/ProductListCards.tsx` (Visual cards view)
     - `components/dashboard/products/ProductDrawerOverview.tsx` (Basic info & category selector)
     - `components/dashboard/products/ProductVariantsManager.tsx` (Option matrix & SKU builder)
     - `components/dashboard/products/ProductDigitalAssetsTab.tsx` (File upload & serial keys)
     - `components/dashboard/products/ProductAiAssistModal.tsx` (SEO generator & smart fill)
  2. **Admin Settings Page Refactoring:**
     - Extract tabs into isolated sub-components under `components/admin/settings/tabs/` (`GeneralTab`, `AppearanceTab`, `CommerceTab`, `PaymentsTab`, `EmailTab`, `ChatSecurityTab`, `AiProvidersTab`).
  3. **Analytics Service Refactoring:**
     - Split into `platform-overview.service.ts`, `vendor-analytics.service.ts`, `ads-analytics.service.ts`, and `anomaly-radar.service.ts`.

---

### [ENH-3] Outbox Pattern for Mission-Critical Domain Events
- **Problem:** Emitting events in memory via `eventBus.emit(...)` after a database transaction commit is vulnerable to process crashes or network blips.
- **Solution:** Write events into a PostgreSQL `pd_outbox_event` table within the same atomic transaction as the order or wallet update. A dedicated background outbox poller reads unhandled events, delivers them to BullMQ or socket gateways, and marks them `processed`.

---

## 2. High-Impact Tunisian Market Features

### [ENH-4] Automated WhatsApp Order Updates (Evolution API)
- **Market Context:** In Tunisia, WhatsApp has significantly higher open and engagement rates than SMS and email. The infrastructure is already provisioned (`PD_WHATSAPP_GATEWAY_*`).
- **Feature Specification:**
  1. Add an optional "Recevoir le suivi par WhatsApp" checkbox on checkout.
  2. Trigger automated WhatsApp notifications:
     - **Confirmation:** "Bonjour [Nom], votre commande #[ID] auprès de [Boutique] est confirmée (Total: [Montant] TND)."
     - **Expédition:** "Votre colis est pris en charge par [Transporteur]. Numéro de suivi: [Track#]."
     - **Jour de livraison (COD):** "Votre colis arrive aujourd'hui ! Merci de préparer [Montant] TND en espèces pour le livreur."

---

### [ENH-5] Seller "Money Flow" Visual Transparency Tracker
- **Merchant Pain Point:** Sellers frequently contact support asking where their money is and when it will be unlocked.
- **Solution:** Provide an interactive step-by-step lifecycle bar for every sale in the vendor dashboard:
  ```
  [1. Payé par Carte] ──▶ [2. Rétention 7 jours (Reste 3j)] ──▶ [3. Disponible dans Wallet] ──▶ [4. Virement Effectué]
       26 Août                      Déblocage: 2 Sept                        Solde: 85.500 DT              Réf: VIR-9042
  ```

---

### [ENH-6] Progressive Web App (PWA) & Web Push Notifications
- **Market Context:** Mobile shopping accounts for >75% of Tunisian traffic.
- **Solution:**
  1. Add `manifest.json` and service worker to enable "Installer l'application PandaMarket" on mobile home screens.
  2. Implement Web Push notifications for buyer delivery updates and seller instant sale sound alerts ("Ka-ching!").

---

### [ENH-7] Standardized `<SafeAiHtml>` Component
- **Solution:** Build a shared component in `frontend/src/components/ui/SafeAiHtml.tsx`:
  ```tsx
  import DOMPurify from 'dompurify';

  export function SafeAiHtml({ html, className }: { html: string; className?: string }) {
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'span', 'h3', 'h4'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
    return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
  }
  ```
  Enforce this wrapper across product descriptions, AI previews, and admin cost inspect drawers.

---

### [ENH-8] D17 & La Poste Tunisienne Integration
- **Market Context:** D17 is widely used among university students and unbanked Tunisian shoppers.
- **Phase 1 (Immediate):** Manual D17 receipt upload with payment verification (identical to the manual Mandat flow).
- **Phase 2 (Long Term):** Official API integration with Poste Tunisienne for QR-code instant payments.

---

### [ENH-9] COD Courier Mobile-Web Driver Console
- **Problem:** Cash-on-Delivery delivery verification relies on manual vendor status updates.
- **Solution:** A responsive, lightweight mobile web interface for delivery couriers (`/delivery/scan`):
  1. Driver scans QR code on delivery package.
  2. Customer signs or provides SMS OTP.
  3. Status instantly flips to `delivered` in PandaMarket, capturing payment and releasing vendor wallet credit in real time.

---

### [ENH-10] Storefront Health Score & Uptime Monitor
- **Feature:** A background job pings each active storefront daily, evaluating:
  - Custom domain DNS & SSL validity.
  - Page load speed & mobile weight budget.
  - 404 broken product link count.
- Displays a score in merchant dashboard: *"Santé de votre boutique : 94/100"*, offering actionable tips to boost conversion.

---

## 3. High-Leverage Domain Proposals

### A. AI Functionality Proposals
1. **Real Token Ledger:** Record `prompt_tokens`, `completion_tokens`, `provider_cost_usd` per job; calculate real margins (`charged_credits - provider_cost`).
2. **Monthly Store AI Budgets:** Configurable token caps with soft warning at 80% and hard stop at 100%.
3. **Bulk Catalog AI Onboarding:** Upload a supplier PDF or photo set; AI extracts title, category, attributes, and French/Arabic descriptions.
4. **Darija (Tunisian Arabic) Content:** Support Darija generation and search query normalization.
5. **AI RAG Storefront Assistant:** Vector search over store catalog and FAQs for automatic customer chat support.

### B. Platform CMS Proposals
1. **One-Click Legal Pack Generator:** Automatically seeds Terms, Privacy, Refund, and Cookie policies tailored for Tunisian law.
2. **Visual CMS Link Picker:** Select published CMS pages from dropdowns across navigation and settings instead of typing raw URLs.
3. **Multi-Locale CMS Pages:** Support Arabic and French versions of legal and content pages with `hreflang` tags.

### C. Storefront Theming Proposals
1. **Sections Architecture:** Render modular, reorderable sections (`FeaturedProducts`, `Testimonials`, `Newsletter`, `FAQ`, `TrustBadges`) across all 20 themes.
2. **Storefront RTL Support:** Native right-to-left layout support driven by the store's active language.
3. **Conversion Booster Kit:** Sticky Add-to-Cart bar, cart progress bar to free shipping threshold, and exit-intent coupons.
