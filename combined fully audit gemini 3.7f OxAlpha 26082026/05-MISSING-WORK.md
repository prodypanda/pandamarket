# 05 — Missing Work (PRD & Functional Specifications Gap Analysis)

> **Context:** This chapter consolidates all unfinished features specified in the functional PRD (`ai instructions/spécifications fonctionnelles (PRD).md`), platform architecture docs, and admin-notes catalogs.

---

## 1. Buyer Experience Gaps

### [MW-1] Guest Checkout (Marketplace Hub & Storefronts)
- **PRD Reference:** §F4.1 — "Un acheteur doit pouvoir commander en mode invité sans créer de compte préalable."
- **Current State:** `cart.route.ts:155` requires `requireAuth` for hub quotes; `frontend/src/app/store/[storeHost]/checkout/page.tsx:298` verifies customer session and redirects to `/login`.
- **Scope to Implement:**
  1. Update `POST /api/pd/cart/quote` and `POST /api/pd/cart/storefront/quote` to allow optional authentication. If unauthenticated, accept guest contact info (`first_name`, `last_name`, `email`, `phone`, `shipping_address`).
  2. In `order.service.ts`, support `customer_id: null` while populating customer contact details on `pd_order`.
  3. On checkout success, present an optional "Créer un mot de passe pour suivre votre commande" prompt that converts the guest order into an authenticated customer account.

---

### [MW-2] Visual Order Tracking Timeline
- **PRD Reference:** §F4.4 — "Suivi visuel des étapes de commande avec horodatage et numéro de suivi transporteur."
- **Current State:** `/hub/orders` and storefront customer orders modals render only static status badges (`'pending'`, `'delivered'`).
- **Scope to Implement:**
  1. Build an interactive timeline component: `Commande reçue` ➔ `Paiement validé` ➔ `En préparation` ➔ `Expédiée (Transporteur & Lien de suivi)` ➔ `En cours de livraison` ➔ `Livrée`.
  2. Calculate and display estimated delivery dates based on governorate shipping rules.

---

### [MW-3] Buyer Returns & RMA Request Flow
- **PRD Reference:** §F4.5 — "Processus de retour et de remboursement avec motif et preuves photo."
- **Current State:** `pd_store_order_refund` table exists in PostgreSQL, but there is no buyer-facing UI in `/hub/orders` to submit refund requests.
- **Scope to Implement:**
  1. Add a "Demander un retour / remboursement" button on delivered orders in `/hub/orders`.
  2. Implement an RMA modal capturing reason code, detailed explanation, and photo uploads via `/api/pd/files/presign`.
  3. Wire seller dashboard refund review screen at `/hub/dashboard/orders`.

---

### [MW-4] Storefront Direct Live-Chat Widget
- **PRD Reference:** §F4.6 — "Messagerie instantanée directe entre le visiteur de la boutique et le marchand."
- **Current State:** Chat system supports buyer-seller messaging, but only for registered marketplace buyers.
- **Scope to Implement:** Add a lightweight storefront chat bubble supporting anonymous visitor inquiries with email capture for merchant replies.

---

## 2. Seller Experience Gaps

### [MW-5] Guided Onboarding Wizard Steps 2–7
- **PRD Reference:** §F2.1 — "Tunnel d'onboarding guidé en 7 étapes avec barre de progression persistante."
- **Current State:** Step 1 (Store name and subdomain) is implemented; remaining steps exist as isolated dashboard pages.
- **Scope to Implement:**
  1. Connect steps into a unified progress bar:
     - **Étape 1:** Nom & Sous-domaine *(Done)*
     - **Étape 2:** Sélection du Thème & Personnalisation visuelle
     - **Étape 3:** Informations Légales & Soumission KYC
     - **Étape 4:** Création du Premier Produit
     - **Étape 5:** Configuration des Modes de Paiement (Flouci, Konnect, Mandat, COD)
     - **Étape 6:** Paramétrage de la Livraison (Tarifs par gouvernorat)
     - **Étape 7:** Publication officielle de la boutique
  2. Persist progress in `pd_user.onboarding_state` and display celebratory checklist completion.

---

### [MW-6] Serial License Key Inventory Management Console
- **PRD Reference:** §F2.4 — "Gestion des clés de licence logicielles pour produits numériques."
- **Current State:** Vendors can upload serial keys via textarea during product creation, but cannot inspect remaining inventory or manage pool states.
- **Scope to Implement:**
  1. Expose endpoints: `GET /api/pd/stores/me/products/:id/license-keys` and `DELETE /license-keys/:keyId`.
  2. Add a dashboard management tab showing remaining stock, burned keys with linked order numbers, and a 1-click "Reissue Key" action for customer support.

---

### [MW-7] Enhanced API Keys Console
- **PRD Reference:** §F2.8 — "Intégration ERP & POS via API REST sécurisée."
- **Current State:** Basic API key creation exists, but lacks granularity.
- **Scope to Implement:** Add IP allowlisting, per-key request rate limits, usage metrics (last used IP, request volume graph), and copyable cURL/Python integration snippets.

---

### [MW-8] Automated Payout PDF Statements
- **PRD Reference:** §F2.7 — "Bordereaux de reversement et factures de commission téléchargeables."
- **Scope to Implement:** Auto-generate downloadable PDF statements summarizing captured sales, deducted platform commissions, and net disbursed amounts.

---

## 3. Superadmin & Platform Management Gaps

### [MW-9] Marketplace Order Fraud Queue
- **PRD Reference:** §F5.2 — "Détection de fraude et modération des commandes anormales."
- **Current State:** Fraud radar covers subscription chargebacks only.
- **Scope to Implement:** Build an algorithmic detection queue in Superadmin flagging order velocity spikes, repeated high-value COD orders to unverified addresses, and multi-account identity overlap.

---

### [MW-10] Superadmin Settings Data-Loss Guards (Admin Notes AS-01 to AS-20)
- **Reference:** `admin-notes/admin-settings/`
- **Scope to Implement:**
  1. **Unsaved Changes Guard (AS-02):** Warn admins via modal/beforeunload when switching tabs with unsaved edits.
  2. **Per-Tab Save & Reset (AS-14):** Allow saving and resetting individual settings tabs independently.
  3. **Live Banner & Layout Preview (AS-08 & AS-11):** Interactive visual preview when editing hero carousels or banner styling.
  4. **Aspect Ratio Validation (AS-15):** Validate banner image dimensions before upload.

---

### [MW-11] Tunisian Personal Data Protection Compliance (PDP 2004-63)
- **Reference:** Tunisian Law n° 2004-63 regarding personal data protection.
- **Scope to Implement:**
  1. Cookie consent banner with opt-in gating for Meta Pixel and Google Analytics scripts.
  2. User data download tool (Data Subject Access Request - DSAR).
  3. Automated 30-day anonymization worker for deleted accounts.

---

## 4. Ads & Marketing Gaps

### [MW-12] End-to-End Ads Test Suite & Monitoring
- **Current State:** Ad accounts, campaigns, and delivery logic exist, but lack automated regression testing.
- **Scope to Implement:** Write integration tests covering: Ad wallet top-up ➔ Campaign wizard ➔ Admin moderation ➔ Realtime delivery & impression tracking ➔ Order conversion attribution.

---

### [MW-13] Keyword Auctions & Dynamic Auto-Bidding
- **PRD Reference:** §F7.2 — "Enchères par mots-clés sur la recherche du Hub."
- **Scope to Implement:** Allow sellers to bid on specific search keywords (e.g. "caftan", "artisanat") with dynamic second-price auction ranking on `/hub/search`.

---

## 5. DevOps & Infrastructure Roadmap

### [MW-14] Background Worker Service Separation
- **Current State:** Workers run in-process within the Express web server (`PD_RUN_WORKERS_IN_PROCESS=true`).
- **Target Architecture:** Split the Render web service and worker service:
  - `pandamarket-backend` (Web API only, ports open).
  - `pandamarket-workers` (Dedicated background BullMQ worker runner).

---

### [MW-15] Meilisearch Provisioning
- **Current State:** Operating in PostgreSQL fallback search mode (`pd_product` ILIKE/trigram).
- **Target:** Provision dedicated Meilisearch instance, configure `PD_MEILI_HOST` and `PD_MEILI_MASTER_KEY`, and run initial catalog index synchronization.

---

### [MW-16] Migration from Local Storage to Cloudflare R2
- **Current State:** Operating on local MinIO with PostgreSQL bytea fallback.
- **Target:** Migrate to Cloudflare R2 bucket with zero egress fees, configure tenant prefix isolation (`stores/{store_id}/...`), and map public assets to a custom CDN domain (`assets.pandamarket.tn`).
